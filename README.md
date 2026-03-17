# Reflex Training Platform

A real-time, AI-powered **sales training platform** for BMW dealership staff. Trainees practice voice conversations with a fully simulated AI customer inside a Unity VR/AR environment, while supervisors monitor and review sessions live through a web admin panel.

---

## Architecture Overview

| Component | Stack | Path |
|---|---|---|
| **Backend API** | Python 3.11 + FastAPI + Beanie (MongoDB) | `backend/` |
| **Admin Panel** | React + Vite + TypeScript | `admin/` |
| **Unity Client** | Unity (C#) | `ReflexUnitySample/` |
| **Reverse Proxy** | Nginx | `nginx/` |

```
Unity VR App  ──WebSocket──►  FastAPI Backend  ◄──REST──  Admin Panel
                                     │
                               MongoDB (Atlas)
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/client_overview.md](docs/client_overview.md) | Client-facing feature overview — AI personas, scoring, admin features |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system architecture, data flow, component breakdown |
| [docs/BACKEND.md](docs/BACKEND.md) | Backend services, AI pipeline, config reference |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | REST endpoints & WebSocket protocol specification |
| [docs/SERVER_SETUP.md](docs/SERVER_SETUP.md) | Production deployment on Ubuntu / DigitalOcean |
| [docs/UNITY_SETUP.md](docs/UNITY_SETUP.md) | Unity client integration and WebSocket setup |
| [docs/evaluation_criteria.md](docs/evaluation_criteria.md) | AI scoring dimensions and performance categories |

---

## Quick Start — Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (local) or a MongoDB Atlas connection string

### 1. Backend

```bash
cd backend
cp .env.example .env       # Fill in your API keys and MongoDB URL
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

### 2. Admin Panel

```bash
cd admin
npm install
npm run dev                # http://localhost:5173
```

### 3. Docker (All Services)

```bash
docker-compose up --build
```

- **Backend API**: `http://localhost:8000`
- **Admin Dashboard**: `http://localhost:5173`

---

## Environment Variables

Create `backend/.env` from the following template:

```env
# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=reflex_training

# Security
JWT_SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60

# AI Provider (gemini | openai | huggingface | ollama)
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key

# Optional providers
OPENAI_API_KEY=
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Session settings
SESSION_TIME_LIMIT_SECONDS=180

# CORS (comma-separated origins for production)
CORS_ORIGINS=
```

---

## Live Deployment

- **Admin Panel:** `https://training.pyuscraft.space/admin-1996/`
- **API Base:** `https://training.pyuscraft.space/api/`
- **WebSocket:** `wss://training.pyuscraft.space/api/ws`
- **Health Check:** `https://training.pyuscraft.space/health`
