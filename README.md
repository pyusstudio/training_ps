# Reflex Training Platform

A real-time AI-powered **sales training platform** for BMW dealership staff. Trainees (salespersons) practice conversations with a realistic AI customer via a Unity VR/mobile client, while supervisors monitor and review sessions through a web admin panel.

---

## Architecture Overview

We have organized detailed documentation for every component of the system. Please refer to the links below:

### 🌐 Global Documentation
- **[System Architecture](docs/ARCHITECTURE.md)**: High-level overview, component breakdown, and data flow diagrams.
- **[API Reference](docs/API_REFERENCE.md)**: Detailed specifications for WebSocket protocols and REST endpoints.

### 🛠️ Project Documentation
- **[Backend](docs/BACKEND.md)**: FastAPI implementation, AI scoring logic, and database schema.
- **[Admin Dashboard](docs/ADMIN.md)**: Features and setup for the instructor monitoring panel.
- **[Training App](docs/TRAINING_APP.md)**: Production-grade interface for simulating sessions and ad-hoc scoring.
- [ ] **[Unity Client](docs/UNITY_SETUP.md)**: setup guide for the mobile/VR training interface.
- **[ML Pipeline](docs/ML_PIPELINE.md)**: Scripts and workflow for training custom intent classifiers.

---

## 🚀 Quick Start (Docker)

The fastest way to run the entire system is using Docker Compose:

```bash
docker-compose build
docker-compose up
```

- **Backend API**: `http://localhost:8000`
- **Admin Dashboard**: `http://localhost:5173`
- **Training App (Web)**: `http://localhost:5174`
- **Voice Integration**: Supports Deepgram and ElevenLabs.

| Component | Stack | Path |
|---|---|---|
| **Backend API** | FastAPI + Python 3.11 | `backend/` |
| **Admin Panel** | React + Vite + Tailwind | `admin/` |
| **Training App** | React + Vite + Tailwind | `app/` |
| **Unity Client** | Unity (C#) | `ReflexUnitySample/` |
| **Reverse Proxy** | Nginx | `nginx/` |

## Quick Start (Local Development)

### 1. Backend
```bash
cd backend
cp .env.example .env         # Fill in API keys
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Admin Panel
```bash
cd admin
npm install
npm run dev                  # Runs on http://localhost:5173
```

### 3. Training App
```bash
cd app
npm install
npm run dev                  # Runs on http://localhost:5174
```

### 4. Docker (All Services)
```bash
docker-compose up --build
```

---

## Documentation

| Doc | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, component interactions |
| [BACKEND.md](docs/BACKEND.md) | Backend API, services, WebSocket protocol |
| [SERVER_SETUP.md](docs/SERVER_SETUP.md) | DigitalOcean Ubuntu production deployment |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | REST & WebSocket API reference |
| [ADMIN.md](docs/ADMIN.md) | Admin panel usage guide |
| [TRAINING_APP.md](docs/TRAINING_APP.md) | Training app & persona guide |
| [UNITY_SETUP.md](docs/UNITY_SETUP.md) | Unity client setup & integration |
| [evaluation_criteria.md](docs/evaluation_criteria.md) | AI scoring & evaluation criteria |

---

## Live Deployment

- **Training App:** `https://training.pyuscraft.space/`
- **Admin Panel:** `https://training.pyuscraft.space/admin-1996/`
- **API Base:** `https://training.pyuscraft.space/api/`
- **WebSocket:** `wss://training.pyuscraft.space/api/ws`
