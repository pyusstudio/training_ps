# Backend Documentation

## Stack

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | 0.115.0 | REST API + WebSocket |
| Uvicorn | 0.30.6 | ASGI server |
| SQLite + aiosqlite | — | Database |
| Beanie / Motor | 1.25.0 / 3.6.0 | ODM (async) |
| Pydantic v2 | 2.9.2 | Data validation |
| python-jose | 3.3.0 | JWT auth |

---

## Directory Structure

```
backend/
├── app/
│   ├── main.py            # App factory, startup, CORS, routers
│   ├── config.py          # Settings (pydantic-settings, reads .env)
│   ├── db.py              # Database init
│   ├── models.py          # DB models (User, Session, SuggestedQuestion)
│   ├── schemas.py         # WebSocket message schemas
│   ├── websocket.py       # WebSocket endpoint + session orchestration
│   ├── api/
│   │   ├── auth.py        # POST /token (JWT login)
│   │   ├── admin.py       # Admin CRUD endpoints
│   │   └── questions.py   # Suggested questions API
│   ├── services/
│   │   ├── ai_service.py     # AI providers + system prompt
│   │   ├── session_service.py # Session lifecycle management
│   │   ├── scoring.py        # Intent + sentiment scoring
│   │   └── auth_service.py   # User auth helpers
│   └── migrations/        # DB migration scripts
├── .env                   # Environment variables (not committed)
├── .env.example           # Template
├── requirements.txt       # Python dependencies
└── Dockerfile             # Container build
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `true` | Enable debug mode |
| `AI_PROVIDER` | `gemini` | AI backend: `gemini`, `openai`, `huggingface`, `ollama` |
| `GEMINI_API_KEY` | — | Google Gemini API key |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `HUGGINGFACE_API_KEY` | — | HuggingFace token |
| `HUGGINGFACE_MODEL` | `meta-llama/Llama-3.1-8B-Instruct` | HF model ID |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3` | Ollama model name |
| `SESSION_TIME_LIMIT_SECONDS` | `180` | Session duration (3 min) |
| `JWT_SECRET_KEY` | `CHANGE_ME_IN_PROD` | JWT signing secret |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token expiry |
| `CORS_ORIGINS` | `[]` | Allowed frontend origins (JSON array) |
| `SQLITE_PATH` | `data/reflex.db` | SQLite file path |

---

## Key Services

### `ai_service.py` — AI Customer Simulation
- Defines `PERSONA_CONFIGS` for 4 buyer personas (Elena, Robert, Sarah, David)
- `get_system_prompt(persona_id)` — generates the AI customer's behavior prompt
- `AIProvider` abstract class with 4 concrete implementations
- `evaluate_reply()` — per-reply coaching scores (empathy, detail, tone)
- `rate_session()` — end-of-session qualitative AI rating

### `session_service.py` — Session Lifecycle
- `start_session()` — creates session, gets AI's opening greeting
- `handle_salesperson_response()` — scores reply, gets AI next utterance, checks time limit
- `finalize_session()` — computes summary stats
- `generate_qualitative_rating()` — triggers AI session rating

### `scoring.py` — Intent & Sentiment Scoring
- Classifies each salesperson utterance by intent category
- Returns score (0–10), sentiment, detected keywords, and color hex for UI

### `auth_service.py` — Authentication
- JWT token generation and validation
- Default admin account creation on startup

---

## Running Locally

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API Docs (Swagger): `http://localhost:8000/docs`

---

## Docker

```bash
# Build image
docker build -t reflex-backend ./backend

# Run container
docker run -p 8000:8000 --env-file ./backend/.env reflex-backend
```
