# Admin Dashboard Documentation

The Admin Dashboard is a React-based web application designed for instructors and administrators to monitor training performance and review historical session data.

## Features

### 1. Authentication
- **Secure Login**: Access is restricted via JWT authentication.
- **Role Enforcement**: Only users with the `admin` role can access the dashboard.
- **Session Management**: JWT is stored in an `authStore` (Zustand/Context) to persist the session while the tab is open.

### 2. Session Listing
- Displays a tabular view of all recorded sessions stored in **MongoDB**.
- **Key Metrics**: View Session ID, Source (`unity`/`test`), Scenario, Selected Persona, Started Time, and the calculated Average Score.
- **Selection**: Clicking a session loads its detailed transcript and per-step scoring.

### 3. Live Feed Panel
- Uses a WebSocket connection with `role=admin`.
- **Real-time Monitoring**: Automatically receives `broadcast_event` messages from the backend.
- Displays live updates for new sessions started (including persona ID) and scorings as they happen.

### 4. Session Detail Review
- **Transcript View**: Detailed dialogue between the client and the salesperson.
- **Scoring Breakdown**: Each salesperson response is tagged with its classified intent (e.g., `Isolate`) and numeric score.
- **AI Qualitative Feedback**: Displays the high-level summary, persona context, and detailed strengths/improvements provided by the AI provider at the end of a session.

## Tech Stack
- **Framework**: Vite + React 18 + TypeScript.
- **Styling**: Tailwind CSS with a dark-themed, premium "automotive" aesthetic.
- **State Management**: Custom React hooks and state stores for auth and API data.
- **Icons**: Lucide React.

## Deployment
- **Production**: Built into static files (`npm run build`) and served via Nginx (as seen in the `Dockerfile`).
- **Development**: Run using `npm run dev -- --port 5173`.

## Environment Variables
- `VITE_API_URL`: Base URL for the Backend API.
- `VITE_WS_URL`: URL for the Backend WebSocket gateway.
