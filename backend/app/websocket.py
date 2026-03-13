import asyncio
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

from .schemas import (
    BaseMessage,
    BroadcastEventMessage,
    ClientUtteranceMessage,
    ErrorMessage,
    RoleplayEventMessage,
    ScoreEventMessage,
    SessionEndMessage,
    SessionStartMessage,
    SessionSummaryMessage,
    EvaluationQueryMessage,
)
from .services import session_service
from .services.scoring import scoring_service
from .services.auth_service import get_user_from_token


router = APIRouter()


class Connection:
    def __init__(self, websocket: WebSocket, role: str, user_id: str | None):
        self.websocket = websocket
        self.role = role
        self.user_id = user_id
        self.session_id: str | None = None
        self.outbound_queue: asyncio.Queue[BaseMessage] = asyncio.Queue()


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: Set[Connection] = set()
        self._lock = asyncio.Lock()

    async def connect(self, conn: Connection) -> None:
        async with self._lock:
            self._connections.add(conn)
        logger.info("WebSocket connected | role={} | user_id={} | connections={}", conn.role, conn.user_id, len(self._connections))

    async def disconnect(self, conn: Connection) -> None:
        async with self._lock:
            self._connections.discard(conn)
        logger.info("WebSocket disconnected | role={} | user_id={} | connections={}", conn.role, conn.user_id, len(self._connections))

    async def broadcast(
        self,
        message: BaseMessage,
        role_filter: str | None = None,
    ) -> None:
        async with self._lock:
            targets = [
                c for c in self._connections if role_filter is None or c.role == role_filter
            ]
        for conn in targets:
            try:
                await conn.outbound_queue.put(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to connection: {e}")

manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    role = websocket.query_params.get("role", "unity")
    user_id = websocket.query_params.get("user_id")
    token = websocket.query_params.get("token")

    if token:
        from .db import get_db  # local import to avoid circular dependency

        user_role: str | None = None
        with get_db() as db:
            user = get_user_from_token(db, token)
            if user is None:
                await websocket.close(code=1008)
                return
            # Extract primitive values while the SQLAlchemy session is still open
            user_id = str(user.id)
            user_role = user.role

        if user_role == "admin":
            role = "admin"

    await websocket.accept()
    conn = Connection(websocket, role=role, user_id=user_id)
    await manager.connect(conn)

    shutdown = asyncio.Event()
    sender_task = asyncio.create_task(_sender(conn, shutdown))
    receiver_task = asyncio.create_task(_receiver(conn, shutdown))

    try:
        done, pending = await asyncio.wait(
            [sender_task, receiver_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        
        # Log any exceptions that aren't expected disconnects
        for task in done:
            exc = task.exception()
            if exc and not isinstance(exc, WebSocketDisconnect):
                logger.debug(f"Task exception in {task.get_name()}: {exc}")
                
    except asyncio.CancelledError:
        logger.info("WebSocket tasks cancelled.")
    finally:
        shutdown.set()
        await manager.disconnect(conn)
        
        if conn.session_id:
            logger.info("Cleaning up resources for disconnected session {}", conn.session_id)
            asyncio.create_task(session_service.cleanup_session_lock(conn.session_id))
            
        import contextlib
        for task in [sender_task, receiver_task]:
            task.cancel()
            with contextlib.suppress(Exception):
                await task


async def _sender(conn: Connection, shutdown: asyncio.Event) -> None:
    while not shutdown.is_set():
        try:
            # Add a small timeout to allow checking the shutdown event
            msg = await asyncio.wait_for(conn.outbound_queue.get(), timeout=1.0)
            await conn.websocket.send_json(msg.model_dump(mode="json"))
        except asyncio.TimeoutError:
            continue
        except Exception:
            break


async def _receiver(conn: Connection, shutdown: asyncio.Event) -> None:
    while not shutdown.is_set():
        try:
            data = await conn.websocket.receive_json()
            msg_type = data.get("type", "unknown")
            session_id = data.get("session_id", "N/A")
            logger.debug("Received WebSocket message | type={} | session_id={} | user_id={}", msg_type, session_id, conn.user_id)
        except WebSocketDisconnect:
            break  # End loop on disconnect
        except RuntimeError as e:
            if "client has disconnected" in str(e).lower() or "connection closed" in str(e).lower():
                break
            logger.warning("Runtime error in receiver: {}", e)
            break
        except Exception as exc:  # noqa: BLE001
            logger.debug("Parse error or disconnect: {}", exc)
            if "connection is closed" in str(exc).lower():
                break
            error = ErrorMessage(
                type="error",
                direction="sc",
                detail="Invalid message format.",
                code="invalid_json",
            )
            await conn.outbound_queue.put(error)
            continue

        msg_type = data.get("type")
        if msg_type == "session_start":
            await _handle_session_start(conn, data)
        elif msg_type == "roleplay_event":
            await _handle_roleplay_event(conn, data)
        elif msg_type == "session_end":
            await _handle_session_end(conn, data)
        elif msg_type == "evaluation_query":
            await _handle_evaluation_query(conn, data)
        else:
            error = ErrorMessage(
                type="error",
                direction="sc",
                detail=f"Unknown message type: {msg_type}",
                code="unknown_type",
            )
            await conn.outbound_queue.put(error)


async def _handle_session_start(conn: Connection, data: dict) -> None:
    try:
        msg = SessionStartMessage.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Invalid session_start message: {}", exc)
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Invalid session_start payload.",
            code="invalid_session_start",
        )
        await conn.outbound_queue.put(error)
        return

    started, first_utterance = await session_service.start_session(
        source=msg.source,
        user_id=msg.user_id or conn.user_id,
        scenario=msg.scenario,
        persona_id=msg.persona_id,
    )
    conn.session_id = started.session_id
    logger.info("Session started with persona: {}", msg.persona_id)
    await conn.outbound_queue.put(started)
    await conn.outbound_queue.put(first_utterance)

    broadcast = BroadcastEventMessage(
        type="broadcast_event",
        direction="sc",
        payload={
            "event": "session_started",
            "session_id": started.session_id,
            "user_id": started.user_id,
        },
    )
    await manager.broadcast(broadcast, role_filter="admin")


async def _handle_roleplay_event(conn: Connection, data: dict) -> None:
    try:
        msg = RoleplayEventMessage.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Invalid roleplay_event message: {}", exc)
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Invalid roleplay_event payload.",
            code="invalid_roleplay_event",
        )
        await conn.outbound_queue.put(error)
        return

    if not msg.session_id:
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Missing session_id for roleplay_event.",
            code="missing_session_id",
        )
        await conn.outbound_queue.put(error)
        return

    if not conn.session_id:
        conn.session_id = msg.session_id

    try:
        score_msg, next_client_msg, summary_msg, rating_msg = await session_service.handle_salesperson_response(
            session_id=msg.session_id,
            transcript=msg.transcript or "",
            reaction_time_ms=msg.reaction_time_ms,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Error handling salesperson response: {}", exc)
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Failed to process salesperson response.",
            code="roleplay_error",
        )
        await conn.outbound_queue.put(error)
        return

    await conn.outbound_queue.put(score_msg)

    broadcast_payload = {
        "event": "score_event",
        "session_id": score_msg.session_id,
        "intent_category": score_msg.intent_category,
        "score": score_msg.score,
    }
    broadcast = BroadcastEventMessage(
        type="broadcast_event",
        direction="sc",
        payload=broadcast_payload,
    )
    await manager.broadcast(broadcast, role_filter="admin")

    if next_client_msg is not None:
        await conn.outbound_queue.put(next_client_msg)

    if summary_msg is not None:
        await conn.outbound_queue.put(summary_msg)
        summary_broadcast = BroadcastEventMessage(
            type="broadcast_event",
            direction="sc",
            payload={
                "event": "session_summary",
                "session_id": summary_msg.session_id,
                "total_score": summary_msg.total_score,
                "avg_score": summary_msg.avg_score,
                "accuracy_percentage": summary_msg.accuracy_percentage,
            },
        )
        await manager.broadcast(summary_broadcast, role_filter="admin")

    if rating_msg is not None:
        # This branch is likely never hit now if handle_salesperson_response returns it as None
        # but kept for compatibility.
        await conn.outbound_queue.put(rating_msg)
        rating_broadcast = BroadcastEventMessage(
            type="broadcast_event",
            direction="sc",
            payload={
                "event": "session_rating",
                "session_id": rating_msg.session_id,
                "overall_score": rating_msg.overall_score,
                "strengths": rating_msg.strengths,
                "improvements": rating_msg.improvements,
                "detailed_feedback": rating_msg.detailed_feedback,
            },
        )
        await manager.broadcast(rating_broadcast, role_filter="admin")
    elif summary_msg is not None:
        # If it was a natural timeout, start the background rating task
        asyncio.create_task(_background_generate_and_send_rating(conn, summary_msg.session_id))


async def _handle_session_end(conn: Connection, data: dict) -> None:
    try:
        msg = SessionEndMessage.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Invalid session_end message: {}", exc)
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Invalid session_end payload.",
            code="invalid_session_end",
        )
        await conn.outbound_queue.put(error)
        return

    if not msg.session_id:
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Missing session_id for session_end.",
            code="missing_session_id",
        )
        await conn.outbound_queue.put(error)
        return

    logger.info("Manually ending session {}", msg.session_id)
    try:
        # 1. Finalize session and send summary immediately
        summary_msg = session_service.finalize_session(msg.session_id)
        await conn.outbound_queue.put(summary_msg)
        
        # Broadcast summary to admin
        summary_broadcast = BroadcastEventMessage(
            type="broadcast_event",
            direction="sc",
            payload={
                "event": "session_summary",
                "session_id": summary_msg.session_id,
                "total_score": summary_msg.total_score,
                "avg_score": summary_msg.avg_score,
                "accuracy_percentage": summary_msg.accuracy_percentage,
            },
        )
        await manager.broadcast(summary_broadcast, role_filter="admin")

        # 2. Acknowledge the end
        ack = SessionEndMessage(
            type="session_end",
            direction="sc",
            session_id=msg.session_id,
        )
        await conn.outbound_queue.put(ack)

        # 3. Trigger background rating (which will also clean up the lock when done)
        asyncio.create_task(_background_generate_and_send_rating(conn, msg.session_id))

    except Exception as exc:
        logger.exception("Error during manual session end: {}", exc)
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Failed to end session.",
            code="session_end_error",
        )
        await conn.outbound_queue.put(error)


async def _background_generate_and_send_rating(conn: Connection, session_id: str) -> None:
    """Helper to generate AI rating in background and broadcast to user and admin."""
    try:
        logger.info("Starting background rating for {}", session_id)
        rating_msg = await session_service.generate_qualitative_rating(session_id)
        
        # Send to the current user
        await conn.outbound_queue.put(rating_msg)
        
        # Broadcast to admins
        rating_broadcast = BroadcastEventMessage(
            type="broadcast_event",
            direction="sc",
            payload={
                "event": "session_rating",
                "session_id": rating_msg.session_id,
                "overall_score": rating_msg.overall_score,
                "strengths": rating_msg.strengths,
                "improvements": rating_msg.improvements,
                "detailed_feedback": rating_msg.detailed_feedback,
            },
        )
        await manager.broadcast(rating_broadcast, role_filter="admin")
        logger.info("Background rating for {} completed and sent", session_id)
        
    except Exception as exc:
        logger.exception("Error in background rating generation for {}: {}", session_id, exc)
        # We don't bother the user with a specific background error here
        # but the frontend spinner will eventually time out or show nothing.
    finally:
        # Crucial: Clean up the session context and history ONLY AFTER rating is finished
        asyncio.create_task(session_service.cleanup_session_lock(session_id))


async def _handle_evaluation_query(conn: Connection, data: dict) -> None:
    try:
        msg = EvaluationQueryMessage.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Invalid evaluation_query message: {}", exc)
        error = ErrorMessage(
            type="error",
            direction="sc",
            detail="Invalid evaluation_query payload.",
            code="invalid_evaluation_query",
        )
        await conn.outbound_queue.put(error)
        return

    result = scoring_service.score(msg.transcript)
    score_msg = ScoreEventMessage(
        type="score_event",
        direction="sc",
        session_id=msg.session_id,
        question_id=None,
        intent_category=result.intent_category,
        score=result.score,
        sentiment=result.sentiment,
        feedback=result.feedback,
        keywords_detected=result.keywords_detected,
        color_hex=result.color_hex,
    )
    await conn.outbound_queue.put(score_msg)


