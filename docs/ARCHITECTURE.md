# System Architecture — Reflex Training Platform

## Overview

Reflex Training is a real-time AI-powered sales simulation platform. A Unity VR/AR client connects to a FastAPI backend via WebSocket. The backend orchestrates AI customer personas, scores salesperson replies turn-by-turn using an LLM, and broadcasts live events to connected admin dashboards.

---

## Component Map

```
┌──────────────────────────────────────────────────────────────┐
│                     REFLEX TRAINING PLATFORM                 │
├─────────────────┬────────────────────────────────────────────┤
│  Unity VR App   │  Admin Dashboard (React)                   │
│  (C# WebSocket) │  (React + REST + WebSocket)                │
└────────┬────────┴──────────────┬─────────────────────────────┘
         │ WebSocket /ws         │ REST /api/admin/* + WebSocket
         ▼                       ▼
┌──────────────────────────────────────────────────────────────┐
│               FastAPI Backend (Python 3.11)                  │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  WebSocket   │  │  Session      │  │  Scoring         │  │
│  │  Gateway     │  │  Service      │  │  Service         │  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬─────────┘  │
│         │                  │                   │             │
│  ┌──────▼──────────────────▼───────────────────▼──────────┐  │
│  │                     AI Service                         │  │
│  │   (Gemini / OpenAI / HuggingFace / Ollama adapter)    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│  │  RAG Service│  │  Auth Service │  │  Admin REST API  │   │
│  │  (FAISS +   │  │  (JWT/bcrypt) │  │  Questions API   │   │
│  │  fastembed) │  └───────────────┘  └──────────────────┘   │
│  └─────────────┘                                             │
└──────────────────────────────────┬───────────────────────────┘
                                   │
                           ┌───────▼───────┐
                           │  MongoDB Atlas │
                           │  (Beanie ODM) │
                           └───────────────┘
```

---

## Data Flow — Single Conversation Turn

```
1. Unity sends  {"type": "roleplay_event", "transcript": "...", "session_id": "..."}
        │
        ▼
2. WebSocket Gateway → _receiver → _handle_roleplay_event()
        │
        ▼
3. Session Service → scoring_service.score(transcript)
   └── Scoring Service → ai_provider.evaluate_reply(transcript)
       └── LLM returns: {empathy, detail, tone_alignment, feedback}
       └── Score = (empathy×0.4 + detail×0.4 + tone×0.2) × 10 → 0–100
        │
        ▼
4. Session Service → ai_provider.reply(transcript, suggested_questions)
   └── RAG Service → FAISS search on active questions → top-k suggestions
   └── LLM generates next AI customer reply (1–3 sentences, no repeat questions)
        │
        ▼
5. Backend sends to Unity:
   - score_event  (score, category, feedback, empathy/detail/tone sub-scores)
   - client_utterance  (AI customer's next line + time remaining)
        │
        ▼
6. Backend broadcasts to Admin (WebSocket, role=admin):
   - roleplay_event (salesperson turn)
   - score_event
   - roleplay_event (AI client turn)
        │
        ▼
7. If session end condition met (time limit or 6 AI questions asked):
   - session_summary → Unity + Admin
   - Background task → ai_provider.rate_session() → session_rating → Unity + Admin
```

---

## Session Lifecycle

```
session_start (CS)
      │
      ▼
ai_provider.start_conversation()  → AI opening line
      │
      ▼
[Turn Loop: up to 6 AI questions / 3 minutes]
  roleplay_event (CS) → score + AI reply (SC)
      │
      ▼
Session end trigger (time or question limit)
      │
      ├── session_summary (SC) → numeric results
      └── session_rating (SC)  → qualitative AI report (background)
```

---

## AI Provider Architecture

The AI layer is **provider-agnostic**. A single `AIProvider` abstract base class defines the contract:

| Method | Purpose |
|---|---|
| `start_conversation(session_id, persona_id)` | Generate the AI customer's opening line |
| `reply(session_id, salesperson_message, is_final, suggested_questions)` | Generate the next customer response |
| `evaluate_reply(session_id, salesperson_message)` | Score a single salesperson turn (Empathy / Detail / Tone) |
| `rate_session(session_id, transcript_str)` | Generate the end-of-session qualitative rating report |
| `cleanup_session(session_id)` | Remove in-memory conversation history |

Concrete implementations: `GeminiProvider`, `OpenAIProvider`, `HuggingFaceProvider`, `OllamaProvider`.

The active provider is selected from `AI_PROVIDER` in `.env` — switching providers requires zero code changes.

---

## RAG Pipeline

The RAG (Retrieval-Augmented Generation) layer steers the AI toward training topics from the admin-managed question bank.

```
Salesperson speaks
      │
      ▼
fastembed TextEmbedding model embeds the transcript
      │
      ▼
FAISS IndexFlatL2 similarity search → top-2 questions (distance threshold 0.5)
      │
      ▼
Matched question texts passed to ai_provider.reply() as "suggested_questions"
      │
      ▼
AI may (or may not) naturally incorporate those topics — never forced
```

The FAISS index is rebuilt automatically whenever a question is created, updated, or deleted via the admin API.

---

## Authentication Flow

```
Admin browser → POST /api/auth/login {email, password}
      │
      ▼
auth_service.authenticate_user() — bcrypt verify
      │
      ▼
create_access_token() — HS256 JWT, expires in ACCESS_TOKEN_EXPIRE_MINUTES
      │
      ▼
Token stored in browser → sent as Authorization: Bearer <token> on REST calls
                         → sent as ?token=<token> on WebSocket upgrades
      │
      ▼
_require_admin() middleware decodes JWT, verifies role == "admin"
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI 0.110+ |
| Language | Python 3.11 |
| Database ODM | Beanie (Pydantic v2 + Motor async) |
| Database | MongoDB (Atlas or local) |
| Authentication | python-jose (JWT) + passlib (bcrypt) |
| AI Providers | google-generativeai, openai, huggingface-hub, httpx (Ollama) |
| RAG Embeddings | fastembed (BAAI/bge-small-en) |
| Vector Search | FAISS (faiss-cpu) |
| Real-time | WebSockets (built into FastAPI/Starlette) |
| Logging | Loguru |
| Admin Frontend | React + Vite + TypeScript |
| Deployment | Nginx reverse proxy + Uvicorn |
