# Admin Panel

## Overview

The Admin Panel is a React/Vite web app for supervisors and managers to monitor live training sessions, review session histories, and manage the platform.

**URL:** `https://training.pyuscraft.space/admin-1996/`

---

## Login

Default credentials are set on backend startup:
- **Username:** `admin`
- **Password:** Set via `DEFAULT_ADMIN_PASSWORD` env var (or check backend startup logs for generated password)

---

## Features

### Live Session Monitoring
- Real-time view of active training sessions via WebSocket
- Live score feed as salesperson speaks
- Color-coded intent scores (🟢 ≥7, 🟡 ≥4, 🔴 <4)

### Session History
- Browse all completed sessions
- View per-turn scores, intent categories, and keywords
- Read AI-generated qualitative rating (strengths, improvements)

### Persona Selection (for Test Sessions)
Admins can start test sessions with any persona:

| Persona | ID | Focus Areas |
|---|---|---|
| Elena | `elena` | Aesthetics, materials, interior |
| Robert | `robert` | Performance, brand heritage |
| Sarah | `sarah` | Tech features, connectivity |
| David | `david` | Safety, family practicality |

---

## Running Locally

```bash
cd admin
npm install
npm run dev          # http://localhost:5173
```

**Environment (optional local override):**
```bash
# admin/.env (optional, defaults to localhost)
VITE_BACKEND_URL=http://localhost:8000
VITE_BACKEND_WS_URL=ws://localhost:8000/ws
```

---

## Building for Production

```bash
cd admin
npm run build        # Output in admin/dist/
```

The Dockerfile serves the built `dist/` via Nginx on port 80.
