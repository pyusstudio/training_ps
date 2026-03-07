# Reflex Training AI (PoC)

Welcome to the Reflex Training AI system, an AI-powered platform for automotive sales training. This project captures spoken responses, scores them against best practices using semantic AI, and provides real-time feedback via an admin dashboard.

---

## 📖 Documentation Suite

We have organized detailed documentation for every component of the system. Please refer to the links below:

### 🌐 Global Documentation
- **[System Architecture](docs/ARCHITECTURE.md)**: High-level overview, component breakdown, and data flow diagrams.
- **[API Reference](docs/API_REFERENCE.md)**: Detailed specifications for WebSocket protocols and REST endpoints.

### 🛠️ Project Documentation
- **[Backend](docs/BACKEND.md)**: FastAPI implementation, AI scoring logic, and database schema.
- **[Admin Dashboard](docs/ADMIN.md)**: Features and setup for the instructor monitoring panel.
- **[Test Console](docs/TEST_CONSOLE.md)**: Developer tool for simulating sessions and ad-hoc scoring.
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
- **Test Console**: `http://localhost:5174`

**Default Admin Credentials**:
- **Email**: `admin@example.com`
- **Password**: `admin123`

---

## 💻 Local Development

If you prefer to run services individually for active development:

1.  **Backend**: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
2.  **Admin**: `cd admin && npm install && npm run dev`
3.  **Test**: `cd test && npm install && npm run dev`

---

## 📝 Project Context
This project is a Proof of Concept (PoC) optimized for speed and demo value. It utilizes **FastAPI**, **React**, and **SBERT** to provide a robust starting point for AI-driven training applications.

