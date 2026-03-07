# Training App Documentation

The Reflex Training App is a production-grade interface built with React. Its primary purpose is to provide a high-fidelity simulation environment for salespeople to practice their pitch, receive AI-driven evaluations, and refine their closing techniques.

## Key Functionalities

### 1. Connection Management
- Connects to the backend via WebSockets using the `role=trainee` query parameter.
- Provides a real-time status indicator (Connected/Disconnected).

### 2. Training Simulation
- Allows users to run through a complete training session.
- **Session Start**: Resets the state and receives the first client utterance from the backend.
- **Interactive Roleplay**: Trainees type salesperson responses, which are sent via `roleplay_event`.
- **Live Feedback**: Displays the returned `score_event` (intent, score, evaluation feedback) and the next `client_utterance` automatically.

### 3. Professional Evaluation (`evaluation_query`)
- A dedicated section for testing single transcripts without starting a formal session.
- Useful for validating how specific phrases are classified and scored by the AI engine.

### 4. Real-time Analysis
- Monitors session metrics including total score, average quality, and accuracy percentages.

## Tech Stack
- **Framework**: Vite + React + TypeScript.
- **Styling**: Tailwind CSS + Vanilla CSS, utilizing a premium dark-mode aesthetic with glassmorphism.
- **Animations**: Framer Motion for smooth state transitions and message entry.

## Deployment
- **Port**: Defaults to `http://localhost:5174` in development.
- **Building**: `npm run build` generates static assets optimized for production serving.

## Usage Guide
1. Ensure the Backend is running (`localhost:8000`).
2. Open the Training App interface.
3. Establish a connection to the high-performance training environment.
4. Use the "Evaluation" interface for ad-hoc scoring.
5. Launch a "Training Session" to experience a full simulation.
