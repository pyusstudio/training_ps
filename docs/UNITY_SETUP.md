# Unity Client Setup Guide

This guide details how to configure and run the Unity client for the Reflex Training system.

## Prerequisites

1. **Unity 2022.3 LTS** or higher
2. **Newtonsoft.Json (Json.NET)** — via Unity Package Manager or `Assets/Plugins`
3. **TextMesh Pro** — required for UI components

---

## Essential Scripts

Attach to a persistent `[Managers]` GameObject in your main scene:

| Script | Purpose |
|---|---|
| `ReflexWebSocketManager.cs` | WebSocket connection + message handling |
| `VoiceManager.cs` | STT/TTS provider abstraction |
| `DeepgramManager.cs` | Deepgram voice services (optional) |
| `ElevenLabsManager.cs` | ElevenLabs TTS (optional) |
| `AudioRecorder.cs` | Microphone capture |

---

## Configuration (Unity Inspector)

### ReflexWebSocketManager
| Field | Value |
|---|---|
| **WS URL** | `wss://training.pyuscraft.space/api/ws` |
| **Role** | `unity` (trainee) |
| **Persona ID** | `elena` · `robert` · `sarah` · `david` |
| **User ID** | Unique trainee identifier string |

### VoiceManager
- **Selected Provider:** `Deepgram` or `ElevenLabs`
- **Manager References:** Drag respective manager GameObjects into slots

### VoiceSessionUI
| Field | Description |
|---|---|
| **Start/End Session Buttons** | UI Button references |
| **Status Text** | `TMP_Text` for status ("Connecting...", "AI Talking") |
| **Summary Text** | `TMP_Text` for end-of-session AI feedback |
| **Persona Input** | `TMP_InputField` (optional, for in-game persona change) |

---

## WebSocket Flow

```
1. Connect → receive [connected] (role + user_id confirmed)
2. Send    → [session_start] {persona_id, user_id}
3. Receive → [session_started] + [roleplay_event] (AI opening line)
4. Loop:
     Record mic → send [roleplay_event] {transcript, reaction_time_ms}
     Receive    → [score_event] + [roleplay_event] (AI reply)
5. Receive → [session_summary] + [session_rating] (on session end)
```

**Message types received by Unity:**

| Type | Description |
|---|---|
| `connected` | Handshake confirmation |
| `session_started` | Session ready, session_id assigned |
| `roleplay_event` | AI customer utterance |
| `score_event` | Per-reply score + color + feedback |
| `session_summary` | Final score stats |
| `session_rating` | AI qualitative feedback report |

---

## Voice Interaction

**Auto-flow (recommended):**
1. After receiving `roleplay_event` (AI speaking) → play TTS audio
2. On TTS complete → auto-start microphone recording
3. On silence detection → stop recording → send transcript
4. On `session_summary` → stop microphone permanently

**Barge-in (iOS):**
Use native iOS audio bridge with hardware echo cancellation via Objective-C++ plugin. See `ReflexUnitySample/` for implementation.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| No audio playback | Check `AudioSource` assignment on TTS manager; verify not muted |
| WebSocket keeps reconnecting | Check server URL and confirm backend is running |
| Empty transcripts | Silence threshold too high — lower VAD sensitivity |
| JSON parse errors | Ensure `Newtonsoft.Json` is properly imported in `Assets/Plugins` |
| iOS mic not starting | Check microphone permission in `Info.plist` and Unity Player Settings |
