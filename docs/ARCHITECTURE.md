# System Architecture

## Overview

Reflex Training is a real-time sales training platform where an AI simulates a BMW car buyer, and the trainee (salesperson) practices their pitch. Sessions are scored live, with admins monitoring via a web dashboard.

---

## Component Map

```
                      ┌───────────────────────────────────┐
                      │           Nginx (Port 80)          │
                      │  /          → reflex-app:80        │
                      │  /admin-1996/ → admin:80          │
                      │  /api/      → backend:8000        │
                      └──────────────┬────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                       ▼
     ┌────────────────┐    ┌──────────────────┐   ┌─────────────────┐
     │  Training App  │    │  FastAPI Backend  │   │   Admin Panel   │
     │  React/Vite    │    │  Python 3.11      │   │   React/Vite    │
     │  Port 80       │    │  Port 8000        │   │   Port 80       │
     └────────┬───────┘    └────────┬──────────┘   └────────┬────────┘
              │                     │                        │
              │ WebSocket           │ WebSocket               │ WebSocket
              └─────────────────────┘────────────────────────┘
                                     │
                      ┌──────────────┼──────────────┐
                      ▼              ▼               ▼
               ┌────────────┐  ┌──────────┐  ┌──────────────┐
               │  SQLite DB │  │ AI Layer │  │  Scoring Svc  │
               │  (beanie)  │  │ (multi-  │  │  (Intent +    │
               │            │  │ provider)│  │  Sentiment)   │
               └────────────┘  └──────────┘  └──────────────┘
```

---

## Data Flow — Training Session

```
1. Unity / Training App
      │  [session_start] {persona_id, user_id, scenario}
      ▼
2. FastAPI WebSocket (/ws)
      │  Creates session, calls AI provider to get opening line
      │  Returns: [session_started] + [roleplay_event] (AI first utterance)
      ▼
3. Salesperson speaks → transcribed → sent as:
      │  [roleplay_event] {session_id, transcript, reaction_time_ms}
      ▼
4. Backend:
   a. ScoringService.score(transcript)  →  intent + sentiment + color score
   b. AIProvider.reply(transcript)      →  AI customer next response
   c. If time limit reached:
       AIProvider.rate_session()        →  qualitative session rating
      │
      Returns:
      │  [score_event] → scoring data to client + admin broadcast
      │  [roleplay_event] → AI next utterance to client
      │  [session_summary] → final scores (if session ended)
      │  [session_rating] → qualitative AI feedback
      ▼
5. Admin Panel receives broadcast_events for live monitoring
```

---

## AI Provider Abstraction

The `AIProvider` abstract class in `ai_service.py` supports four interchangeable backends:

| Provider | Model | Use Case |
|---|---|---|
| **Gemini** | `gemini-1.5-flash` | Default. Fast, cost-effective |
| **OpenAI** | `gpt-4o-mini` | High-quality responses |
| **HuggingFace** | `meta-llama/Llama-3.1-8B-Instruct` | Open-source / self-hosted |
| **Ollama** | `llama3` (configurable) | Fully local / offline |

Switched via `AI_PROVIDER` environment variable. No code changes required.

---

## Persona System

Four AI buyer personas are defined in `PERSONA_CONFIGS` in `ai_service.py`:

| ID | Name | Trait | Focus |
|---|---|---|---|
| `elena` | Elena | Design Connoisseur | Aesthetics, interior, materials |
| `robert` | Robert | Prestige Executive | Performance, brand, resale value |
| `sarah` | Sarah | Tech Enthusiast | Digital features, connectivity |
| `david` | David | Safety-Minded Father | Safety, family versatility |

Each persona shapes the AI's opening style, priorities, and the questions it asks.

---

## Session Lifecycle

```
session_start
      │
      └─→ AI sends opening greeting
              │
              └─→ [loop until time limit or session_end]
                      salesperson speaks
                      → score reply
                      → AI responds
                      │
                      └─→ [time limit hit OR manual session_end]
                              generate summary
                              generate qualitative rating
                              broadcast to admin
```

**Session Time Limit:** 180 seconds (3 minutes), configurable via `SESSION_TIME_LIMIT_SECONDS`.

---

## Database

- **Engine:** SQLite (via `aiosqlite`/`beanie`)
- **File:** `backend/data/reflex.db`
- **Models:** `User`, `Session`, `SuggestedQuestion`
- **Migrations:** Managed in `backend/app/migrations/`

---

## Security

- JWT authentication (HS256, 60-min expiry)
- Admin role protected via token-based WebSocket auth
- CORS locked to defined origins in production (`CORS_ORIGINS` env var)
- Secret key via `JWT_SECRET_KEY` env var (must be changed in production)
