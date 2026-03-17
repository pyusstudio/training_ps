# Admin Dashboard Guide — Reflex Training Platform

## Overview

The Admin Dashboard is a secure, browser-based web application for sales managers and supervisors. It provides **live session monitoring** and **historical session review** for all training sessions conducted through the Unity VR client.

**URL:** `https://training.pyuscraft.space/admin-1996/`  
**Local:** `http://localhost:5173`

---

## Login

Navigate to the admin URL and enter your credentials. The dashboard uses **JWT token authentication** — your session is valid for 60 minutes.

> ⚠️ Default credentials are `admin@example.com` / `admin123`. Change these before deploying to production.

---

## Pages

### Dashboard (Session List)

The home page shows a **paginated table** of all completed and in-progress training sessions, sorted newest first, 20 per page.

**Columns:**

| Column | Description |
|---|---|
| Session ID | Unique session identifier |
| Source | `unity` or `app` |
| Started At | Session start timestamp |
| Duration | Session length in seconds |
| Avg Score | Mean per-reply score (0–100) |
| Accuracy % | Percentage of turns scoring ≥ 70 |

Click any row to open the **Session Detail** view.

---

### Session Detail

Displays the full breakdown of a training session.

**Top section — Session Metadata:**
- Session ID, persona used, source, scenario
- Start time, end time, duration
- Aggregate scores: total score, average score, accuracy percentage

**AI Rating Report:**  
If a rating has been generated, displays:
- Overall Score (1–10)
- Strengths (up to 3 bullet points)
- Improvements (up to 3 bullet points)
- Detailed feedback sections: Customer Engagement, Needs Assessment & Pitch, Objection Handling & Closing
- Areas for Improvement (action items)

A **"Regenerate Rating"** button triggers the AI to re-analyze the stored transcript and produce a fresh report. Useful if the automatic post-session rating failed, or to get a second opinion.

**Turn-by-Turn Transcript:**  
Full conversation displayed step by step. Each salesperson turn shows:
- Step number and timestamp
- Speaker label (Salesperson / AI Customer)
- Full transcript text
- Intent category (e.g., "The Professional") with color indicator
- Numeric score (0–100)
- Sub-scores: Empathy, Detail, Tone Alignment
- Reaction time (milliseconds)

---

### Live Feed Panel

The Live Feed lets you watch an **active session in real time** without being in the same room as the trainee.

**What appears in the feed:**

| Event | What you see |
|---|---|
| Session starts | Session ID and persona displayed |
| Salesperson speaks | Transcribed text appears immediately |
| Score computed | Score chip and category badge appear next to the turn |
| AI customer replies | AI reply text appears |
| Session ends | Summary card appears: total score, avg score, accuracy |
| Rating ready | Rating report appears (may be a few seconds after summary) |

The feed operates over a **persistent WebSocket** — no page refresh needed. All events are pushed by the backend automatically.

---

### Question Bank Management

Manage the library of training questions that the **RAG system** uses to steer AI conversations toward specific sales skills.

**How it works:**  
When a salesperson speaks, the backend uses semantic similarity (FAISS + fastembed) to find questions from this bank that match the conversation topic. Matched questions are passed to the AI as optional suggestions — it may incorporate them naturally if they fit the conversation flow.

**Actions:**

| Action | Description |
|---|---|
| View questions | Paginated list with text, tags, and active status |
| Add question | Enter question text and optional topic tags |
| Edit question | Update text, tags, or active/inactive status |
| Toggle active | Activate or deactivate without deleting |
| Delete question | Permanently removes the question; FAISS index rebuilt automatically |

**Tagging tips:**  
Use comma-separated tags to organize questions by topic, e.g., `safety,features` or `pricing,financing`. Tags are for your reference only — the RAG system uses semantic embedding, not tag matching.

**FAISS index rebuild:**  
The index is rebuilt automatically every time a question is created, updated, or deleted. There is no manual rebuild step required.

---

## WebSocket Authentication

The Admin Dashboard authenticates its WebSocket connection using the JWT token obtained at login:

```
wss://training.pyuscraft.space/api/ws?role=admin&token=<jwt>
```

- If the token is valid and the user has `role=admin`, the connection is accepted with admin privileges.
- If the token is invalid or expired, the connection is closed with code `1008`.
- Admin connections receive all `broadcast_event` messages from the backend.

---

## REST API Authentication

All REST calls from the dashboard include:

```
Authorization: Bearer <jwt>
```

Endpoints protected: `GET /api/admin/sessions`, `GET /api/admin/sessions/{id}`, `POST /api/admin/sessions/{id}/rate`, and all `/api/admin/questions/*` endpoints.

---

## Personas Reference

| ID | Name | Character | Primary Concern |
|---|---|---|---|
| `elena` | Elena | Design Connoisseur | Colors, interior packages, aesthetics |
| `robert` | Robert | Decisive Executive | Performance specs, pricing, speed of transaction |
| `sarah` | Sarah | Eco-Conscious Buyer | Fuel efficiency, hybrid/EV options, sustainability |
| `david` | David | Protective Father | Safety tech, warranty, financing, maintenance |

All personas are set at a **BMW dealership in Los Angeles**. No specific car model is pre-selected — the salesperson must identify the right vehicle through proper needs assessment.

---

## Scoring Quick Reference

| Score | Category | Color |
|---|---|---|
| 90–100 | The Trusted Advisor | 🟢 Green |
| 75–89 | The Professional | 🔵 Blue |
| 50–74 | The Script-Follower | 🟡 Amber |
| 30–49 | The Order-Taker | ⚫ Grey |
| 0–29 | The Liability | 🔴 Red |

See [evaluation_criteria.md](evaluation_criteria.md) for full scoring methodology.
