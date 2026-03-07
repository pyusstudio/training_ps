# API Reference

The Reflex Training AI system primarily communicates via **WebSockets** for real-time roleplay sessions and **REST** for administrative tasks.

---

## 1. WebSocket Gateway (`/ws`)

All real-time communication happens over a single WebSocket endpoint.

**Endpoint**: `ws://<backend-host>:8000/ws`

### Connection Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `role` | `string` | No | `unity` (default), `trainee`, or `admin`. |
| `user_id` | `string` | No | Identifier for the user. |
| `token` | `string` | No | JWT for `admin` role authorization. |

---

### Inbound Messages (Client -> Server)

#### `session_start`
Initializes a new training session.
```json
{
  "type": "session_start",
  "direction": "cs",
  "user_id": "string (optional)",
  "source": "unity | app",
  "scenario": "string (optional)"
}
```

#### `roleplay_event`
Sends a salesperson's spoken response for scoring.
```json
{
  "type": "roleplay_event",
  "direction": "cs",
  "session_id": "string",
  "transcript": "string",
  "reaction_time_ms": "int (optional)"
}
```

#### `session_end`
Explicitly ends a session.
```json
{
  "type": "session_end",
  "direction": "cs",
  "session_id": "string"
}
```

#### `evaluation_query`
Ad-hoc scoring request (does not require a session).
```json
{
  "type": "evaluation_query",
  "direction": "cs",
  "transcript": "string"
}
```

---

### Outbound Messages (Server -> Client)

#### `session_started`
Confirms session initialization.
```json
{
  "type": "session_started",
  "direction": "sc",
  "session_id": "string",
  "user_id": "string"
}
```

#### `client_utterance`
Provides the next prompt for the salesperson.
```json
{
  "type": "client_utterance",
  "direction": "sc",
  "text": "string"
}
```

#### `score_event`
Returns the scoring result for a salesperson response.
```json
{
  "type": "score_event",
  "direction": "sc",
  "intent_category": "Isolate | Empathy | Defensive",
  "score": 0-100,
  "sentiment": "string",
  "feedback": "string",
  "color_hex": "string"
}
```

#### `session_summary`
Final session metrics sent when the storyline concludes.
```json
{
  "type": "session_summary",
  "direction": "sc",
  "total_score": "int",
  "avg_score": "int",
  "accuracy_percentage": "int"
}
```

#### `broadcast_event`
Real-time update sent to `admin` role connections.
```json
{
  "type": "broadcast_event",
  "direction": "sc",
  "payload": {
    "event": "session_started | score_event | session_summary",
    "session_id": "string",
    "..." : "event-specific data"
  }
}
```

---

## 2. REST API (Administrative)

### Authentication
- **Endpoint**: `POST /api/auth/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: `{ "access_token": "...", "token_type": "bearer" }`

### Sessions
- **List Sessions**: `GET /api/admin/sessions`
  - *Auth*: Required (JWT)
  - *Returns*: List of session summaries.
- **Session Detail**: `GET /api/admin/sessions/{session_id}`
  - *Auth*: Required (JWT)
  - *Returns*: Full transcript and per-event scoring data.

---

## 3. Error Codes
| Code | Description |
| :--- | :--- |
| `invalid_json` | Payload is not valid JSON. |
| `unknown_type` | Message `type` field is unrecognized. |
| `missing_session_id` | Required `session_id` is missing. |
| `roleplay_error` | Generic error during scoring or state transition. |
