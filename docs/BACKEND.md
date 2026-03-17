# Backend Reference — Reflex Training Platform

## Overview

The backend is a fully asynchronous **Python 3.11 FastAPI** application. It orchestrates the AI customer simulation, scores salesperson responses turn-by-turn, and pushes real-time events to Unity and admin clients via WebSocket. All data is persisted in MongoDB using the Beanie ODM.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # App factory, middleware, startup
│   ├── config.py            # Settings (pydantic-settings, .env)
│   ├── db.py                # MongoDB / Beanie init
│   ├── models.py            # MongoDB document models
│   ├── schemas.py           # WebSocket message schemas (Pydantic)
│   ├── websocket.py         # WebSocket endpoint + message handlers
│   ├── api/
│   │   ├── auth.py          # POST /api/auth/login
│   │   ├── admin.py         # GET/POST /api/admin/sessions/*
│   │   └── questions.py     # CRUD /api/admin/questions/*
│   └── services/
│       ├── ai_service.py    # AI provider abstraction + persona prompts
│       ├── session_service.py # Session lifecycle orchestration
│       ├── scoring.py       # Per-reply intent scoring
│       ├── rag_service.py   # FAISS semantic search of question bank
│       └── auth_service.py  # JWT + bcrypt auth helpers
├── requirements.txt
└── .env
```

---

## Configuration (`config.py`)

All settings are loaded from `.env` via `pydantic-settings`. The `get_settings()` function is LRU-cached for performance.

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | `reflex_training` | Database name |
| `JWT_SECRET_KEY` | `CHANGE_ME_IN_PROD` | HMAC secret for JWT signing |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime |
| `CORS_ORIGINS` | `[]` | Allowed CORS origins (list of URLs) |
| `AI_PROVIDER` | `gemini` | Active LLM: `gemini` \| `openai` \| `huggingface` \| `ollama` |
| `GEMINI_API_KEY` | — | Google AI Studio key |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `HUGGINGFACE_API_KEY` | — | HuggingFace Inference API key |
| `HUGGINGFACE_MODEL` | `meta-llama/Llama-3.1-8B-Instruct` | HF model ID |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `llama3` | Ollama model name |
| `SESSION_TIME_LIMIT_SECONDS` | `180` | Max session duration (3 minutes) |
| `WHISPER_API_KEY` | — | Reserved for future Whisper STT integration |

In `debug=True` mode, CORS allows all origins (`*`).

---

## Data Models (`models.py`)

All models are Beanie `Document` subclasses, stored in MongoDB.

### `User`
```
Collection: users
Fields: id (str UUID), email (unique, indexed), password_hash, role ("admin"), created_at
```

### `Session`
```
Collection: sessions
Fields: id (str UUID), user_id, source ("unity"|"app"), scenario, started_at, ended_at,
        duration_seconds, briefing_completed, persona_id ("elena"|"robert"|"sarah"|"david")
```

### `RoleplayEvent`
```
Collection: roleplay_events
Fields: id, session_id (indexed), step_id, question_id, speaker ("client"|"salesperson"),
        transcript, intent_category, score (0–100), reaction_time_ms,
        features_json {sentiment, color_hex, empathy_score, detail_score, tone_alignment_score}
```

### `SessionSummary`
```
Collection: session_summaries
Fields: id (= session_id), total_score, avg_score (0–100), accuracy_percentage,
        ai_rating_json {overall_score, strengths[], improvements[], detailed_feedback{}}, created_at
```

### `SystemQuestion`
```
Collection: system_questions
Fields: id, text, tags (comma-separated), is_active (1|0), created_at
```

### `LogEntry`
```
Collection: logs
Fields: id, session_id, level, message, payload_json, created_at
```

---

## AI Service (`services/ai_service.py`)

### Persona Prompts

Four built-in customer personas — all set at a **BMW dealership in Los Angeles** with **no specific car model**:

| Persona ID | Character | Primary Focus |
|---|---|---|
| `elena` | Design Connoisseur | Aesthetics — colors, interior packages, premium feel |
| `robert` | Decisive Executive | Performance specs, pricing, fast decision |
| `sarah` | Eco-Conscious Buyer | Fuel efficiency, hybrid/EV options, total cost of ownership |
| `david` | Protective Father | Safety tech, warranty, financing, maintenance costs |

Every persona inherits `_SHARED_RULES` which enforces:
- 1–3 sentence replies
- Never break character / never admit to being AI
- BMW-only focus; redirect off-topic conversations
- Maximum 6 questions per session
- **No repeat questions** — AI reviews full history before each reply
- Rudeness handling (request manager or exit)
- Holistic decision-making (may commit before question limit if pitch is strong)

### Provider Abstraction

```python
class AIProvider(abc.ABC):
    async def start_conversation(session_id, persona_id) -> str
    async def reply(session_id, salesperson_message, is_final, suggested_questions) -> str
    async def evaluate_reply(session_id, salesperson_message) -> ReplyEvaluation
    async def rate_session(session_id, transcript_str) -> SessionRating
    def cleanup_session(session_id)
```

Active provider selected via `AI_PROVIDER` env var. A single global `ai_provider_instance` is used across the application.

### `evaluate_reply()` — Per-Reply Scoring Prompt

Evaluates the salesperson's most recent reply against the full conversation history. Returns:

```python
class ReplyEvaluation(BaseModel):
    empathy: int          # 0–10
    detail: int           # 0–10
    tone_alignment: int   # 0–10
    feedback: str         # 1–2 sentences of actionable coaching
```

### `rate_session()` — Post-Session Qualitative Rating

Evaluates **only the salesperson's turns** (AI customer replies are context only). Returns:

```python
class SessionRating(BaseModel):
    overall_score: int                    # 1–10
    strengths: List[str]                  # up to 3
    improvements: List[str]               # up to 3
    detailed_feedback: Dict[str, Any]     # keys: customer_engagement,
                                          # needs_assessment_and_pitch,
                                          # objection_handling_and_closing,
                                          # areas_for_improvement (list)
```

---

## Scoring Service (`services/scoring.py`)

Wraps `ai_provider.evaluate_reply()` and maps the raw scores to a category and color.

**Formula:** `final_score = (empathy×0.4 + detail×0.4 + tone_alignment×0.2) × 10`

| Score | Category | Color |
|---|---|---|
| 90–100 | The Trusted Advisor | `#10b981` (green) |
| 75–89 | The Professional | `#3b82f6` (blue) |
| 50–74 | The Script-Follower | `#f59e0b` (amber) |
| 30–49 | The Order-Taker | `#6b7280` (grey) |
| 0–29 | The Liability | `#ef4444` (red) |

Returns `IntentScore` with: `intent_category`, `score` (0–100), `sentiment`, `feedback`, `keywords_detected`, `color_hex`, `empathy_score`, `detail_score`, `tone_alignment_score`.

---

## RAG Service (`services/rag_service.py`)

Provides semantic search over the admin-managed `SystemQuestion` collection to optionally steer AI conversation topics.

**Stack:** `fastembed` (BAAI/bge-small-en embeddings) + `faiss-cpu` (L2 similarity index)

**Key methods:**
- `rebuild_index()` — fetches all active questions from MongoDB, generates embeddings, builds FAISS `IndexFlatL2`. Called automatically on every question creation, update, or delete.
- `search_questions(query, top_k=2, threshold=0.5)` — embeds the salesperson's transcript and returns up to 2 question IDs whose L2 distance is below 0.5.

Returned question texts are passed to `ai_provider.reply()` as `suggested_questions`. The AI is instructed to incorporate them only if they fit naturally — never forced.

---

## Session Service (`services/session_service.py`)

Orchestrates the full training session lifecycle.

### `start_session(source, user_id, scenario, persona_id)`
1. Calls `ai_provider.start_conversation()` to generate the opening line
2. Creates `Session` and first `RoleplayEvent` (speaker=client) in MongoDB
3. Returns `SessionStartedMessage` + `ClientUtteranceMessage`

### `handle_salesperson_response(session_id, transcript, reaction_time_ms)`
1. Acquires per-session asyncio lock (prevents concurrent processing)
2. Calls `scoring_service.score()` → saves `RoleplayEvent` (speaker=salesperson) with all score fields
3. Checks elapsed time vs `SESSION_TIME_LIMIT_SECONDS`
4. If time remains: calls `rag_service.search_questions()`, then `ai_provider.reply()` → saves `RoleplayEvent` (speaker=client)
5. If `client_message_count >= 5` (4 questions + opening), sets `is_final=True` on the reply
6. If session ending (time up or `is_final`): calls `_finalize_and_summarize()`
7. Returns tuple: `(score_msg, next_client_msg, summary_msg, rating_msg)`

### `build_summary(session_id)`
- Aggregates scores from all salesperson `RoleplayEvent` records
- `avg_score` = mean of all scores
- `accuracy_percentage` = percentage of turns with score ≥ 70
- Saves and returns `SessionSummary`

### `generate_qualitative_rating(session_id)`
- Calls `ai_provider.rate_session()` and saves `ai_rating_json` to `SessionSummary`

---

## WebSocket Gateway (`websocket.py`)

Single endpoint: `GET /ws?role=<role>&user_id=<id>&token=<jwt>`

- If `token` present: validates JWT, sets `role="admin"` for admin users, closes with `1008` if invalid
- Spawns two asyncio tasks per connection: `_sender` (outbound queue → WebSocket) and `_receiver` (WebSocket → handlers)
- On connect, sends a `ConnectedMessage` handshake

**Message routing (`_receiver`):**

| `type` | Handler |
|---|---|
| `session_start` | `_handle_session_start()` |
| `roleplay_event` | `_handle_roleplay_event()` |
| `session_end` | `_handle_session_end()` |
| `evaluation_query` | `_handle_evaluation_query()` |

**Admin broadcasting:** every significant server-side event is broadcast to all `role=admin` connections via `BroadcastEventMessage`.

---

## Auth Service (`services/auth_service.py`)

| Function | Description |
|---|---|
| `get_password_hash(password)` | bcrypt hash (passlib) |
| `verify_password(plain, hashed)` | bcrypt verify |
| `create_access_token(subject)` | HS256 JWT with `sub`, `iat`, `exp` |
| `decode_access_token(token)` | Returns `user_id` string or `None` |
| `authenticate_user(email, password)` | DB lookup + password verify |
| `get_user_from_token(token)` | Decode JWT → DB lookup |
| `ensure_default_admin()` | Creates `admin@example.com` / `admin123` on first boot if no admin exists |

> ⚠️ Change the default credentials before deploying to production.

---

## Startup Sequence (`main.py`)

1. CORS middleware applied (all origins in debug mode; `CORS_ORIGINS` list in production)
2. `on_startup`:
   - `init_db()` — connects Beanie to MongoDB, registers all document models
   - `ensure_default_admin()` — creates default admin if none exists
3. Routers mounted: WebSocket, Auth, Admin, Questions
4. `GET /health` → `{"status": "ok"}`
