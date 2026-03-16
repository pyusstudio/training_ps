using System;
using UnityEngine;

public class VoiceManager : MonoBehaviour
{
    public static VoiceManager Instance { get; private set; }

    public enum ProviderType
    {
        ElevenLabs,
        Deepgram
    }

    [Header("Provider Selection")]
    public ProviderType selectedProvider = ProviderType.Deepgram;

    [Header("References")]
    public ElevenLabsManager elevenLabsManager;
    public DeepgramManager deepgramManager;

    public IVoiceProvider CurrentProvider
    {
        get
        {
            switch (selectedProvider)
            {
                case ProviderType.ElevenLabs:
                    return elevenLabsManager;
                case ProviderType.Deepgram:
                    return deepgramManager;
                default:
                    return null;
            }
        }
    }

    public bool IsPlaying => CurrentProvider != null && CurrentProvider.IsPlaying;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void TextToSpeech(string text, Action onComplete = null)
    {
        if (CurrentProvider != null)
        {
            CurrentProvider.TextToSpeech(text, onComplete);
        }
        else
        {
            Debug.LogError("No Voice Provider selected or assigned!");
        }
    }

    public void SpeechToText(byte[] wavData, Action<string> onTranscriptReceived)
    {
        if (CurrentProvider != null)
        {
            CurrentProvider.SpeechToText(wavData, onTranscriptReceived);
        }
        else
        {
            Debug.LogError("No Voice Provider selected or assigned!");
        }
    }
}
