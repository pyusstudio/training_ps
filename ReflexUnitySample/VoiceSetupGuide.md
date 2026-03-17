# Voice System Setup Guide

This document describes how to set up and configure the Speech-to-Text (STT) and Text-to-Speech (TTS) systems in Unity, featuring both ElevenLabs and Deepgram.

## Overview

The system uses a unified `VoiceManager` that acts as a central hub. You can choose between different providers without changing your business logic code.

### Components
1.  **IVoiceProvider**: The interface that all voice services implement.
2.  **ElevenLabsManager**: Implementation for ElevenLabs STT/TTS.
3.  **DeepgramManager**: Implementation for Deepgram STT/TTS.
4.  **VoiceManager**: Central manager to select the active provider.

---

## 🛠 Setup Instructions

### 1. Unity Scene Configuration

Ensure the following scripts are attached to a persistent GameObject (e.g., `[Managers]`) in your scene:

*   `ElevenLabsManager.cs`
*   `DeepgramManager.cs`
*   `VoiceManager.cs`
*   `ReflexWebSocketManager.cs`

### 2. WebSocket & Role Configuration

In the `ReflexWebSocketManager` component:
*   **Base URL**: `wss://training-ps.onrender.com/ws` (Do not include query params here).
*   **Role**: Enter `trainee`, `observer`, or `admin`. 
*   **User ID**: Any unique string for the user.
*   **Persona ID**: Default persona to start with (e.g., `elena`).

### 3. UI Setup

In the `VoiceSessionUI` component:
*   **Persona Input Field**: (Optional) Assign a `TMP_InputField` to allow changing personas in-game (`elena`, `robert`, `sarah`, `david`).
*   **Summary Text**: Assign a `TMP_Text` field to display the formatted post-session AI evaluation.

### 4. Provider Configuration

#### ElevenLabs Setup
In the `ElevenLabsManager` component:
*   **API Key**: Enter your ElevenLabs API Key.
*   **Voice ID**: (Optional) Enter the specific voice ID you wish to use.
*   **Audio Source**: (Optional) Assign an `AudioSource` or let it create one automatically.

#### Deepgram Setup
In the `DeepgramManager` component:
*   **API Key**: Enter your Deepgram API Key.
*   **Audio Source**: (Optional) Assign an `AudioSource` or let it create one automatically.

---

## 💻 Tech Summary

### Available Personas
| ID | Name | Focus |
|---|---|---|
| `elena` | Elena | Aesthetics, interior quality |
| `robert` | Robert | Performance ROI, resale value |
| `sarah` | Sarah | Digital tech, UI/UX |
| `david` | David | Safety, family features |

### WebSocket Messages
*   `connected`: Handshake confirmation from server.
*   `session_started`: Triggered when a roleplay starts.
*   `session_rating`: Final evaluation data.

---

## 🗒 Notes
*   **Reliability**: `ReflexWebSocketManager` includes a 3-second auto-reconnect loop.
*   **Errors**: Check the Unity Console for "Deepgram STT" or "Server Error" logs.
*   **Dependencies**: Requires `Newtonsoft.Json` (Json.NET) for Unity and `TextMesh Pro`.
