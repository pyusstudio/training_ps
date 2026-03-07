## Reflex AI Backend – PoC Implementation Plan

### Objective

**Goal**: Build a lightweight Python backend that receives speech transcripts and session data from the VR app, scores the salesperson’s response using intent-based AI logic, and exposes results for a simple web dashboard. This is a **PoC for a client pitch**, optimized for **speed, low cost, and clear demo value**, not for full production.

---

### High-Level Architecture

- **Unity/VR Client (Quest 2/3)**:
  - Captures voice, runs STT (e.g. Meta Voice SDK or sends audio to backend/Whisper).
  - Sends **STT transcript + session metadata** to backend via REST (and optionally WebSocket).
- **Python Backend (Reflex Training Backend)**:
  - **Intent Scoring Service**:
    - Input: transcript, context (question id, scenario type).
    - Output: intent bucket (`Isolate`, `Empathy`, `Defensive`), score (0–100), feedback string, keyword hits.
  - **Session Management**:
    - Tracks per-session data: questions, responses, intent scores, reaction times.
  - **API Layer**:
    - Endpoints for Unity and the web dashboard to **send** and **retrieve** session data.
- **Web Dashboard**:
  - Reads data from backend to display **transcript, intent scores, sentiment, gap analysis**, etc.

---

### Core Backend Components

- **API Layer**
  - `POST /api/session/start` – create a new training session, return `session_id`.
  - `POST /api/session/{id}/event` – accept question id, transcript, reaction time; return scoring result.
  - `GET /api/session/{id}` – return full session JSON for dashboard (transcripts, scores, timing).
- **Intent Scoring Engine**
  - Uses the “Handling Price Objections” rules from the Reflex document:
    - Maps responses into buckets: **Isolate (Green)**, **Empathy (Silver)**, **Defensive (Red)**.
    - Checks for required **keywords / phrases** (e.g. “right car”, “family”, “value”, “I understand how you feel…”).
    - Produces: numeric score (0–100), label, and short feedback text.
- **Session Store**
  - Maintains a JSON structure similar to the spec:
    - `session_id`, `user_id`, `duration_seconds`, `roleplay_data[]`, `performance_summary`.
- **Optional Realtime Layer**
  - Optional WebSocket channel to push **live scoring updates** to a monitoring dashboard.

---

### Technology Options (with Pros & Cons)

#### Backend Language & Framework

- **Python + FastAPI (Recommended)**
  - **Pros**:
    - Async-first, good for REST + WebSocket.
    - Auto-generated OpenAPI docs (`/docs`), strong typing.
    - Fits perfectly with Python AI/NLP ecosystem.
  - **Cons**:
    - Slightly more setup than very minimal frameworks, but more scalable.

- **Python + Flask**
  - **Pros**:
    - Very simple to start for a tiny PoC.
  - **Cons**:
    - Less ergonomic async/WebSocket support.
    - Can become messy as the project grows.

> **Choice for PoC**: **FastAPI** for clean APIs and future-proofing.

#### Speech-to-Text (STT)

- **STT in Unity (Meta Voice SDK, etc.) – Recommended**
  - **Pros**:
    - Backend receives only **text**, not audio → simpler and faster.
    - Lower latency and bandwidth; leverages VR-side SDKs tuned for that hardware.
  - **Cons**:
    - STT quality bound to chosen SDK; changing provider means updating Unity.

- **STT in Backend (OpenAI Whisper API)**
  - **Pros**:
    - Centralized, state-of-the-art STT with strong accent support.
  - **Cons**:
    - More backend complexity (audio uploads, streaming).
    - Higher latency and API costs.

> **Choice for PoC**: **Unity-side STT**, with **Whisper** documented as an upgrade path if needed.

#### Intent Scoring & AI Layer

- **Rule/Keyword-Based Scoring – Recommended for First Version**
  - **Pros**:
    - Very fast and deterministic; no external AI cost.
    - Easy to explain to client (transparent rules).
    - Perfect for narrow scope (price objections with “good/bad” scripts).
  - **Cons**:
    - Limited generalization to unusual phrasing.

- **LLM-Based Scoring (e.g. OpenAI GPT‑4o‑mini)**
  - **Pros**:
    - Handles nuance and semantic similarity beyond exact keywords.
    - Easy to iterate by updating prompts.
  - **Cons**:
    - Ongoing API cost and latency.
    - Less predictable; needs careful prompt engineering.

- **Hybrid (SBERT + Rules)**
  - **Pros**:
    - More robust to paraphrases (embedding similarity to “good example” library).
  - **Cons**:
    - Requires shipping a small model and slightly more infra.

> **Choice for PoC**:  
> - Implement **rule/keyword-based engine** first.  
> - Optionally enable **LLM scoring mode** later to enhance demo quality.

#### Data Storage & Session Management

- **In-Memory Store (for very quick demos)**
  - **Pros**:
    - Zero setup; ideal for local PoC sessions.
  - **Cons**:
    - Data lost on restart, single-process only.

- **SQLite (Recommended)**
  - **Pros**:
    - File-based, no DB server required.
    - Keeps demo session data across runs.
  - **Cons**:
    - Limited concurrency; not for high-scale production.

- **PostgreSQL / Redis (Future)**
  - **Pros**:
    - Production-ready storage and caching.
  - **Cons**:
    - Overkill for a first PoC.

> **Choice for PoC**: **SQLite** (or in-memory if pure throwaway demo).

#### API Protocol

- **REST (JSON over HTTPS) – Recommended**
  - **Pros**:
    - Simple to call from Unity and web dashboard.
    - Easy to test and debug.
  - **Cons**:
    - Polling is needed for live updates.

- **WebSocket**
  - **Pros**:
    - Real-time feedback stream for dashboards.
  - **Cons**:
    - More complex infra; not strictly required for first demo.

> **Choice for PoC**: **REST** only, with WebSocket as a future enhancement.

---

### Example JSON Structures

#### Incoming Roleplay Event (Unity → Backend)

```json
{
  "session_id": "REF-9921",
  "user_id": "Manager_Demo_01",
  "question_id": "q1_price_objection",
  "transcript": "I hear you. If we set the price aside for a moment, is this the right car for your family?",
  "reaction_time_ms": 1200
}
```

#### Scoring Response (Backend → Unity)

```json
{
  "intent_category": "Isolate",
  "score": 92,
  "sentiment": "Positive",
  "feedback": "Strong isolation of price and focus on family value. Good use of briefing rule.",
  "keywords_detected": ["price", "family", "value"],
  "color_hex": "#22c55e"
}
```

#### Session Summary for Dashboard

```json
{
  "session_id": "REF-9921",
  "user_id": "Manager_Demo_01",
  "duration_seconds": 155,
  "briefing_completed": true,
  "roleplay_data": [
    {
      "question_id": "q1_price_objection",
      "transcript": "I hear you. If we set the price aside for a moment, is this the right car for your family?",
      "intent_category": "Isolate",
      "score": 92,
      "reaction_time_ms": 1200
    }
  ],
  "performance_summary": {
    "total_score": 92,
    "accuracy_percentage": 92
  }
}
```

---

### Recommended PoC Stack (At a Glance)

- **Backend**: Python + FastAPI.
- **AI/Scoring**: Rule-based intent scoring, optional GPT‑4o‑mini API for enhanced feedback.
- **STT**: Unity-side STT (Meta Voice SDK or similar).
- **Storage**: In-memory or SQLite.
- **APIs**: REST endpoints for scoring and session summaries.
- **Deployment**: Single Dockerized FastAPI service on a small VM (AWS/DigitalOcean).

This setup is intentionally **simple, explainable, and fast to build**, while clearly showing a path towards a more advanced AI-powered Reflex Training system if the client approves a full build.

