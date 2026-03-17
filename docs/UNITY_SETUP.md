# Unity Client Setup Guide

This guide details how to configure and run the Unity client for the Reflex Training system.

## 📦 Prerequisites

1.  **Unity 2022.3 LTS** or higher.
2.  **Newtonsoft.Json (Json.NET)**: Available via the Unity Package Manager or as a standalone DLL in `Assets/Plugins`.
3.  **TextMesh Pro**: Essential for the UI components.

## 🛠️ Essential Components

Attach the following scripts to a persistent GameObject (e.g., `[Managers]`) in your initial scene:

1.  `ReflexWebSocketManager.cs`: Handles real-time communication.
2.  `VoiceManager.cs`: Abstraction layer for STT/TTS providers.
3.  `DeepgramManager.cs`: (Optional) For Deepgram-based voice services.
4.  `ElevenLabsManager.cs`: (Optional) For ElevenLabs-based voice services.
5.  `AudioRecorder.cs`: Captures user microphone input.

---

## ⚙️ Configuration

### 1. ReflexWebSocketManager (Inspector Settings)
- **Base URL**: `wss://training-ps.onrender.com/ws`
- **Role**: `trainee` (for students) | `admin` (for monitoring) | `observer`.
- **Persona ID**: `elena`, `robert`, `sarah`, or `david`.
- **User ID**: A unique string for the user.

### 2. VoiceManager (Inspector Settings)
- **Selected Provider**: Choose your active voice provider (Deepgram or ElevenLabs).
- **Manager References**: Drag your `DeepgramManager` and `ElevenLabsManager` GameObjects into their respective slots.

### 3. VoiceSessionUI (Inspector Settings)
- **Buttons**: Assign your UI Button references (Start Session, End Session, Start/Send Voice).
- **Status Text**: Assign a `TMP_Text` field for real-time status updates (e.g., "Connecting...", "AI Talking").
- **Summary Text**: Assign a `TMP_Text` field to display the final AI evaluation report.
- **Persona Input**: (Optional) Assign a `TMP_InputField` to allow changing personas in-game.

---

## 🔄 WebSocket Handshake & Events

The Unity client now handles a two-stage connection:

1.  **Connected**: The server acknowledges the role and user ID immediately on open.
2.  **Session Started**: Confirms the specific `persona_id` and `session_id` when the roleplay begins.

### Messaging Types Handled:
- `connected`: Handshake confirmation.
- `session_started`: Session initialization.
- `client_utterance`: AI spoken text.
- `score_event`: Individual response scoring.
- `session_rating`: Final post-session evaluation.
- `broadcast_event`: Real-time updates for admin roles.

---

## 📉 Troubleshooting

- **No Voice Audio**: Ensure your `AudioSource` is correctly assigned to the provider managers and its `Output` isn't muted.
- **WebSocket Timeout**: The client includes a 3-second auto-reconnect loop. Check your internet connection or the server logs if it continues to poll.
- **Empty Transcripts**: If no speech is detected, the UI resets automatically after 1 second of "Processing...".
- **JSON Errors**: Ensure the `Newtonsoft.Json` library is correctly imported; it is required for parsing complex STT payloads.
