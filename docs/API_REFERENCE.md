# API Reference

## Base URLs

| Environment | REST | WebSocket |
|---|---|---|
| Local | `http://localhost:8000` | `ws://localhost:8000/ws` |
| Production | `https://training.pyuscraft.space/api` | `wss://training.pyuscraft.space/api/ws` |

---

## REST Endpoints

### `GET /health`
Server health check.

**Response:**
```json
{ "status": "ok" }
```

---

### `POST /token`
Authenticate admin user. Returns a JWT.

**Request (form-data):**
```
username=admin
password=your_password
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJI...",
  "token_type": "bearer"
}
```

---

### `GET /admin/sessions`
List all training sessions. **Requires auth.**

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "session_id": "abc123",
    "user_id": "user1",
    "persona_id": "elena",
    "started_at": "2026-03-17T10:00:00Z",
    "total_score": 72,
    "avg_score": 7.2
  }
]
```

---

### `GET /admin/sessions/{session_id}`
Get full details for a single session. **Requires auth.**

---

### `GET /questions`
Get suggested questions list.

### `POST /questions`
Add a suggested question. **Requires auth.**

### `DELETE /questions/{id}`
Remove a suggested question. **Requires auth.**

---

## WebSocket Protocol

**Endpoint:** `ws://<host>/ws`

**Query Parameters:**

| Param | Required | Description |
|---|---|---|
| `role` | No | `unity` (default) or `admin` |
| `token` | No | JWT — required for admin role |
| `user_id` | No | Trainee identifier |

---

### Client → Server Messages

#### `session_start`
Begin a new training session.
```json
{
  "type": "session_start",
  "direction": "cs",
  "source": "unity",
  "user_id": "trainee_01",
  "persona_id": "elena",
  "scenario": "bmw_dealership"
}
```
`persona_id` options: `elena`, `robert`, `sarah`, `david`

---

#### `roleplay_event`
Send salesperson's speech transcript for scoring and AI reply.
```json
{
  "type": "roleplay_event",
  "direction": "cs",
  "session_id": "abc123",
  "transcript": "Good morning! Welcome to BMW Dubai.",
  "reaction_time_ms": 1200
}
```

---

#### `session_end`
Manually end the session.
```json
{
  "type": "session_end",
  "direction": "cs",
  "session_id": "abc123"
}
```

---

#### `evaluation_query`
Score an arbitrary message without affecting session state.
```json
{
  "type": "evaluation_query",
  "direction": "cs",
  "session_id": "abc123",
  "transcript": "Would you like to test drive it today?"
}
```

---

### Server → Client Messages

#### `connected`
Sent immediately on connection.
```json
{
  "type": "connected",
  "direction": "sc",
  "role": "unity",
  "user_id": "trainee_01"
}
```

---

#### `session_started`
Confirms session creation.
```json
{
  "type": "session_started",
  "direction": "sc",
  "session_id": "abc123",
  "user_id": "trainee_01"
}
```

---

#### `roleplay_event`
AI customer's next utterance.
```json
{
  "type": "roleplay_event",
  "direction": "sc",
  "session_id": "abc123",
  "utterance": "Hi, good to be here! I'm looking to buy a car.",
  "is_final": false
}
```
`is_final: true` means the AI has concluded the conversation.

---

#### `score_event`
Scoring result for the salesperson's last reply.
```json
{
  "type": "score_event",
  "direction": "sc",
  "session_id": "abc123",
  "question_id": null,
  "intent_category": "greeting",
  "score": 8,
  "sentiment": "positive",
  "feedback": "Great opener — warm and professional.",
  "keywords_detected": ["welcome", "morning"],
  "color_hex": "#22c55e"
}
```
`color_hex` is green/yellow/red based on score (≥7 = green, ≥4 = yellow, <4 = red).

---

#### `session_summary`
Sent at end of session (time limit or manual end).
```json
{
  "type": "session_summary",
  "direction": "sc",
  "session_id": "abc123",
  "total_score": 72,
  "avg_score": 7.2,
  "accuracy_percentage": 72.0,
  "turn_count": 10
}
```

---

#### `session_rating`
AI qualitative feedback (generated after session ends).
```json
{
  "type": "session_rating",
  "direction": "sc",
  "session_id": "abc123",
  "overall_score": 7,
  "strengths": ["Strong rapport building", "Clear feature presentation"],
  "improvements": ["Address pricing earlier", "Ask more discovery questions"],
  "detailed_feedback": {
    "customer_engagement": "Trainee created a welcoming atmosphere.",
    "needs_assessment_and_pitch": "Good product knowledge shown.",
    "objection_handling_and_closing": "Closing was rushed.",
    "areas_for_improvement": ["Ask about budget earlier", "Slow down on pricing"]
  }
}
```

---

#### `error`
Returned when a message is invalid or an operation fails.
```json
{
  "type": "error",
  "direction": "sc",
  "detail": "Invalid session_start payload.",
  "code": "invalid_session_start"
}
```

**Error codes:**

| Code | Cause |
|---|---|
| `invalid_json` | Malformed JSON received |
| `unknown_type` | Unrecognised message type |
| `invalid_session_start` | Bad session_start payload |
| `invalid_roleplay_event` | Bad roleplay_event payload |
| `missing_session_id` | session_id not provided |
| `roleplay_error` | AI processing failure |
| `session_end_error` | Error during session finalization |

---

#### `broadcast_event` (Admin only)
Live events forwarded to admin connections.
```json
{
  "type": "broadcast_event",
  "direction": "sc",
  "payload": {
    "event": "score_event",
    "session_id": "abc123",
    "intent_category": "closing",
    "score": 9
  }
}
```
`event` values: `session_started`, `score_event`, `session_summary`, `session_rating`
