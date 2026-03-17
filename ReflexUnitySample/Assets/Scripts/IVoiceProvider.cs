using System;

public interface IVoiceProvider
{
    bool IsPlaying { get; }
    void TextToSpeech(string text, Action onComplete = null);
    void SpeechToText(byte[] wavData, Action<string> onTranscriptReceived);
}
