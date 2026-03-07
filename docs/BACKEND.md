# Backend Documentation

The backend is a FastAPI application that serves as the core intelligence and data coordinator for the Reflex Training System.

## Core Services

### 1. Intent Scoring Service (`services/scoring.py`)
The scoring service uses a hybrid approach to classify salesperson responses:
- **Semantic Similarity**: Uses **SBERT** (`all-MiniLM-L6-v2` by default) to compare transcripts against canonical examples of "Good" (Isolate/Empathy) and "Bad" (Defensive) responses.
- **Rule-Based Keywords**: Scans for specific phrase buckets to ensure robustness.
  - **Isolate**: "right car", "family", "value", etc.
  - **Empathy**: "understand how you feel", "felt the same", "they found", etc.
  - **Defensive**: "fixed price", "policy", "manager", etc.
- **Scoring Algorithm**: Combines cosine similarity (40%) with keyword hits (10%) on top of a 50% base, capped by intent (e.g., Defensive responses are capped at 40%).

### 2. Session Management (`services/session_service.py`)
- **State Flow**: Manages the linear transition between salesperson input and AI-generated client responses.
- **Concurrency Control**: Uses `asyncio.Lock` per `session_id` to prevent race conditions during rapid WebSocket events.
- **AI Feedback**: Integrates with an AI provider (Ollama or OpenAI) to generate dynamic client replies and qualitative session ratings.

### 3. Authentication (`services/auth_service.py`)
- Provides JWT-based security.
- Standard roles: `admin` (access to dashboard endpoints) and `user` (default for unity/test).
- Default credentials for PoC: `admin@example.com` / `admin123`.

## Database Schema (SQLite)

### `sessions`
Tracks overall training attempts.
- `id`: UUID
- `user_id`: Link to `users`
- `source`: `unity` | `test`
- `scenario`: Training scenario name
- `started_at`, `ended_at`, `duration_seconds`

### `roleplay_events`
Stores every message in a session.
- `step_id`: Incremental counter
- `speaker`: `client` | `salesperson`
- `transcript`: The spoken/text content
- `intent_category`: Classified intent (for salesperson)
- `score`: Numeric score (0-100)
- `features_json`: Metadata like sentiment and detected keywords

### `session_summaries`
Aggregated performance data.
- `total_score`, `avg_score`, `accuracy_percentage`
- `ai_rating_json`: Detailed qualitative feedback from the AI provider.

## Configuration (.env)
Key environment variables:
- `DATABASE_URL`: Path to SQLite file.
- `SECRET_KEY`: For JWT signing.
- `SBERT_MODEL_NAME`: HuggingFace model for embeddings.
- `AI_PROVIDER`: `ollama` | `openai` | `huggingface` | `gemini`.
- `HUGGINGFACE_API_KEY`: Token for Hugging Face Inference API.
- `HUGGINGFACE_MODEL`: Model ID (e.g., `meta-llama/Llama-3.1-8B-Instruct`).
- `SESSION_TIME_LIMIT_SECONDS`: Max duration for a roleplay session.

## Development Setup

1.  **Virtual Env**: `python -m venv .venv`
2.  **Install Deps**: `pip install -r requirements.txt`
3.  **Run**: `uvicorn app.main:app --reload`
