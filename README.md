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

**Default Admin Credentials**:
- **Email**: `admin@example.com`
- **Password**: `admin123`

---

## ☁️ Deployment (Render)

This project is configured for easy deployment on [Render](https://render.com). The repository includes a `render.yaml` Blueprint which defines all three services (Backend, Admin Dashboard, and User App).

1. Connect your GitHub repository to Render.
2. Go to the Render dashboard and create a new **Blueprint Instance**.
3. Select your repository, and Render will automatically detect the `render.yaml` file.
4. Render will deploy all services and assign them `.onrender.com` subdomains.

**Note**: The Dockerfiles are configured to bind dynamically to the `$PORT` environment variable provided by Render. Check the `render.yaml` file to ensure the backend domain matches what Render assigns you, and update the environment variable overrides in the Render Dashboard if needed.

---

## 💻 Local Development

If you prefer to run services individually for active development:

1.  **Backend**: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
2.  **Admin**: `cd admin && npm install && npm run dev`
3.  **Test**: `cd test && npm install && npm run dev`

---

## 📝 Project Context
This project is a Proof of Concept (PoC) optimized for speed and demo value. It utilizes **FastAPI**, **React**, and **SBERT** to provide a robust starting point for AI-driven training applications.

