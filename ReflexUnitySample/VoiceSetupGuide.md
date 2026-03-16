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

### 2. Provider Configuration

#### ElevenLabs Setup
In the `ElevenLabsManager` component:
*   **API Key**: Enter your ElevenLabs API Key.
*   **Voice ID**: (Optional) Enter the specific voice ID you wish to use.
*   **Audio Source**: (Optional) Assign an `AudioSource` or let it create one automatically.

#### Deepgram Setup
In the `DeepgramManager` component:
*   **API Key**: Enter your Deepgram API Key.
*   **TTS Model**: (Optional) Default is `aura-asteria-en`.
*   **STT Model**: (Optional) Default is `nova-2`.
*   **Audio Source**: (Optional) Assign an `AudioSource` or let it create one automatically.

### 3. Activating a Provider

In the `VoiceManager` component:
1.  **Selected Provider**: Choose either `ElevenLabs` or `Deepgram` from the dropdown.
2.  **Eleven Labs Manager**: Drag and drop the GameObject containing `ElevenLabsManager`.
3.  **Deepgram Manager**: Drag and drop the GameObject containing `DeepgramManager`.

---

## 💻 Technical Usage

To use the voice system in other scripts, always reference `VoiceManager.Instance`.

### Text-to-Speech (TTS)
```csharp
VoiceManager.Instance.TextToSpeech("Hello world", () => {
    Debug.Log("Speech finished!");
});
```

### Speech-to-Text (STT)
```csharp
byte[] audioData = ...; // Your WAV data
VoiceManager.Instance.SpeechToText(audioData, (transcript) => {
    Debug.Log("Transcribed text: " + transcript);
});
```

### Checking Status
```csharp
if (VoiceManager.Instance.IsPlaying) {
    // Stop user from recording or show visualizer
}
```

---

## 🗒 Notes
*   **Network Requirements**: Ensure you have an active internet connection as these services use REST APIs.
*   **Dependencies**: Requires `Newtonsoft.Json` (Json.NET) for Unity.
