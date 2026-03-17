# API Reference — Reflex Training Platform

## Base URLs

| Environment | Base |
|---|---|
| Local | `http://localhost:8000` |
| Production | `https://training.pyuscraft.space` |

---

## REST Endpoints

### System

#### `GET /health`
Returns backend health status.

**Response:**
```json
{ "status": "ok" }
```

---

### Authentication

#### `POST /api/auth/login`
Authenticate an admin user and receive a JWT token.

**Request body:**
```json
{
  "username": "admin@example.com",
  "password": "admin123"
}
```

**Response `200`:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

**Error `401`:** Invalid credentials.

> All subsequent REST requests must include `Authorization: Bearer <token>`.

---

### Admin — Sessions

All endpoints require `Authorization: Bearer <token>` with `role=admin`.

#### `GET /api/admin/sessions`
List all training sessions (paginated, newest first).

**Query params:**
| Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `page_size` | `20` | Results per page |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "source": "unity",
      "scenario": "default_scenario",
      "started_at": "2026-03-17T15:00:00",
      "ended_at": "2026-03-17T15:03:12",
      "duration_seconds": 192,
      "avg_score": 74,
      "accuracy_percentage": 67
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "pages": 3
}
```

---

#### `GET /api/admin/sessions/{session_id}`
Get full detail for a single session including all turn-by-turn events and the AI rating report.

**Response:**
```json
{
  "id": "uuid",
  "source": "unity",
  "scenario": "default_scenario",
  "persona_id": "elena",
  "started_at": "2026-03-17T15:00:00",
  "ended_at": "2026-03-17T15:03:12",
  "duration_seconds": 192,
  "total_score": 518,
  "avg_score": 74,
  "accuracy_percentage": 67,
  "ai_rating_json": {
    "overall_score": 7,
    "strengths": ["Strong rapport building", "Clear feature presentation"],
    "improvements": ["Weak on price objection handling"],
    "detailed_feedback": {
      "customer_engagement": "...",
      "needs_assessment_and_pitch": "...",
      "objection_handling_and_closing": "...",
      "areas_for_improvement": ["..."]
    }
  },
  "events": [
    {
      "id": "uuid",
      "step_id": 1,
      "speaker": "client",
      "transcript": "Hi, I'm looking for something bold — can you help me?",
      "intent_category": null,
      "score": null,
      "reaction_time_ms": null,
      "features_json": null
    },
    {
      "id": "uuid",
      "step_id": 2,
      "speaker": "salesperson",
      "transcript": "Welcome! I'd love to help. What's most important to you?",
      "intent_category": "The Professional",
      "score": 78,
      "reaction_time_ms": 2100,
      "features_json": {
        "sentiment": "Neutral",
        "color_hex": "#3b82f6",
        "empathy_score": 8,
        "detail_score": 7,
        "tone_alignment_score": 8
      }
    }
  ]
}
```

---

#### `POST /api/admin/sessions/{session_id}/rate`
Trigger AI qualitative rating generation for a session. Re-reads stored transcript from DB; overwrites any existing rating.

**Response:** Same as `GET /api/admin/sessions/{session_id}`

---

### Admin — Questions

#### `GET /api/admin/questions/`
List questions in the RAG bank (paginated).

**Query params:** `page`, `page_size` (default 10)

**Response:**
```json
{
  "items": [
    { "id": "uuid", "text": "...", "tags": "safety,features", "is_active": 1, "created_at": "..." }
  ],
  "total": 15, "page": 1, "pageSize": 10, "pages": 2
}
```

---

#### `POST /api/admin/questions/`
Create a new question. Automatically rebuilds the FAISS RAG index.

**Request body:**
```json
{ "text": "What safety features does this vehicle have?", "tags": "safety", "is_active": 1 }
```

**Response:** `QuestionRead` object.

---

#### `PUT /api/admin/questions/{question_id}`
Full replace of a question. Rebuilds RAG index.

#### `PATCH /api/admin/questions/{question_id}`
Partial update (any field). Rebuilds RAG index.

**Example — toggle active:**
```json
{ "is_active": 0 }
```

---

#### `DELETE /api/admin/questions/{question_id}`
Delete a question. Rebuilds RAG index.

**Response:** `{ "status": "deleted" }`

---

## WebSocket Protocol

### Endpoint

```
ws://localhost:8000/ws?role=<role>&user_id=<id>&token=<jwt>
```

| Param | Required | Description |
|---|---|---|
| `role` | No | `unity` (default) or `app` |
| `user_id` | No | Used for session attribution |
| `token` | No | JWT from `/api/auth/login`. If provided and valid admin token, forces `role=admin`. Invalid token closes connection with code `1008`. |

### Message Direction Notation

- **CS** = Client → Server (sent by Unity/App)
- **SC** = Server → Client (sent by backend)

---

### Message Types

#### `connected` (SC)
Sent immediately on WebSocket upgrade to confirm connection.

```json
{
  "type": "connected",
  "direction": "sc",
  "role": "unity",
  "user_id": "user-123",
  "timestamp": "2026-03-17T15:00:00"
}
```

---

#### `session_start` (CS)
Start a new training session. Select a persona and source.

```json
{
  "type": "session_start",
  "direction": "cs",
  "user_id": "user-123",
  "source": "unity",
  "scenario": "default_scenario",
  "persona_id": "elena"
}
```

| Field | Values | Description |
|---|---|---|
| `source` | `unity` \| `app` | Client type |
| `persona_id` | `elena` \| `robert` \| `sarah` \| `david` | AI customer persona |
| `scenario` | string | Optional scenario label |

---

#### `session_started` (SC)
Confirmation that session was created. Followed immediately by `client_utterance`.

```json
{
  "type": "session_started",
  "direction": "sc",
  "session_id": "uuid",
  "user_id": "user-123",
  "persona_id": "elena"
}
```

---

#### `client_utterance` (SC)
The AI customer speaks. Sent after `session_started` and after every scored salesperson turn.

```json
{
  "type": "client_utterance",
  "direction": "sc",
  "session_id": "uuid",
  "text": "Hi! I'm looking for something bold — what do you have?",
  "time_remaining_seconds": 180,
  "timestamp": "2026-03-17T15:00:01"
}
```

---

#### `roleplay_event` (CS)
Send the salesperson's transcribed reply.

```json
{
  "type": "roleplay_event",
  "direction": "cs",
  "session_id": "uuid",
  "transcript": "Welcome! I'd love to show you our lineup — what matters most to you?",
  "reaction_time_ms": 2100
}
```

---

#### `score_event` (SC)
Per-reply evaluation result. Sent after every `roleplay_event`.

```json
{
  "type": "score_event",
  "direction": "sc",
  "session_id": "uuid",
  "question_id": "step_2",
  "intent_category": "The Professional",
  "score": 78,
  "sentiment": "Neutral",
  "feedback": "Good opener and clear intent to understand needs. Push for a more specific value statement next.",
  "keywords_detected": [],
  "color_hex": "#3b82f6",
  "empathy_score": 8,
  "detail_score": 7,
  "tone_alignment_score": 8
}
```

**`intent_category` values:**

| Category | Score Range | Color |
|---|---|---|
| The Trusted Advisor | 90–100 | `#10b981` |
| The Professional | 75–89 | `#3b82f6` |
| The Script-Follower | 50–74 | `#f59e0b` |
| The Order-Taker | 30–49 | `#6b7280` |
| The Liability | 0–29 | `#ef4444` |

---

#### `session_end` (CS / SC)
**CS direction:** Manually terminate a session before the time limit.
```json
{ "type": "session_end", "direction": "cs", "session_id": "uuid" }
```

**SC direction:** Acknowledgement after manual end.
```json
{ "type": "session_end", "direction": "sc", "session_id": "uuid" }
```

---

#### `session_summary` (SC)
Sent when the session ends (either by time, question limit, or manual end).

```json
{
  "type": "session_summary",
  "direction": "sc",
  "session_id": "uuid",
  "total_score": 518,
  "avg_score": 74,
  "accuracy_percentage": 67
}
```

`accuracy_percentage` = percentage of salesperson turns with `score >= 70`.

---

#### `session_rating` (SC)
AI qualitative rating report. Sent after `session_summary` (may arrive a few seconds later as it runs in a background task).

```json
{
  "type": "session_rating",
  "direction": "sc",
  "session_id": "uuid",
  "overall_score": 7,
  "strengths": ["Strong rapport", "Clear feature walk-through"],
  "improvements": ["Weak price objection handling"],
  "detailed_feedback": {
    "customer_engagement": "...",
    "needs_assessment_and_pitch": "...",
    "objection_handling_and_closing": "...",
    "areas_for_improvement": ["Try to isolate the price concern before addressing value."]
  }
}
```

---

#### `evaluation_query` (CS)
Ad-hoc evaluation of a single transcript without a session context.

```json
{
  "type": "evaluation_query",
  "direction": "cs",
  "session_id": "optional",
  "transcript": "We have a great financing plan for you."
}
```

**Response:** `score_event` (SC)

---

#### `broadcast_event` (SC → admin only)
All real-time events re-broadcast to admin connections. The `payload.event` field identifies the type.

**Events broadcast:**

| `payload.event` | Triggered by |
|---|---|
| `session_started` | New session started |
| `roleplay_event` | Each salesperson or AI turn |
| `score_event` | Each per-reply score |
| `session_summary` | Session end |
| `session_rating` | AI qualitative rating ready |

**Example:**
```json
{
  "type": "broadcast_event",
  "direction": "sc",
  "payload": {
    "event": "roleplay_event",
    "session_id": "uuid",
    "speaker": "salesperson",
    "transcript": "We have a great lineup — let me walk you through it."
  }
}
```

---

#### `error` (SC)

```json
{
  "type": "error",
  "direction": "sc",
  "detail": "Invalid session_start payload.",
  "code": "invalid_session_start"
}
```

**Error codes:** `invalid_json`, `unknown_type`, `invalid_session_start`, `invalid_roleplay_event`, `invalid_session_end`, `invalid_evaluation_query`, `missing_session_id`, `roleplay_error`, `session_end_error`
