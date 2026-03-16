using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class VoiceSessionUI : MonoBehaviour
{
    [Header("UI Buttons")]
    public Button startSessionButton;
    public Button endSessionButton;
    public Button startVoiceButton;
    public Button sendVoiceButton;

    [Header("Status Text (Optional)")]
    public TMP_Text statusText;

    [Header("References")]
    public ReflexWebSocketManager webSocketManager;
    public AudioRecorder audioRecorder;

    private void Start()
    {
        // Setup button listeners
        startSessionButton.onClick.AddListener(OnStartSession);
        endSessionButton.onClick.AddListener(OnEndSession);
        startVoiceButton.onClick.AddListener(OnStartVoice);
        sendVoiceButton.onClick.AddListener(OnSendVoice);

        // Initial UI state
        UpdateUIState(false);

        // Listen for AI utterances to trigger TTS
        if (webSocketManager != null)
        {
            webSocketManager.OnAiClientUtterance += HandleAiUtterance;
        }
    }

    private void Update()
    {
        // Disable recording button if AI is talking
        if (VoiceManager.Instance != null && VoiceManager.Instance.IsPlaying)
        {
            startVoiceButton.interactable = false;
        }
        else if (startVoiceButton.interactable == false && webSocketManager != null)
        {
            // Only re-enable if session is active
            if (webSocketManager.IsSessionActive)
            {
                startVoiceButton.interactable = true;
            }
        }
    }

    private void HandleAiUtterance(string text)
    {
        if (VoiceManager.Instance != null)
        {
            if (statusText != null) statusText.text = "AI is talking...";
            VoiceManager.Instance.TextToSpeech(text, () => {
                if (statusText != null) statusText.text = "AI finished talking. Starting recording...";
                OnStartVoice();
            });
        }
    }

    private void OnStartSession()
    {
        webSocketManager.StartSession();
        UpdateUIState(true);
        if (statusText != null) statusText.text = "Session Started";
    }

    private void OnEndSession()
    {
        webSocketManager.EndSession();
        UpdateUIState(false);
        if (statusText != null) statusText.text = "Session Ended";
    }

    private void OnStartVoice()
    {
        audioRecorder.StartRecording();
        startVoiceButton.gameObject.SetActive(false);
        sendVoiceButton.gameObject.SetActive(true);
        if (statusText != null) statusText.text = "Recording User Voice...";
    }

    private void OnSendVoice()
    {
        if (statusText != null) statusText.text = "Processing STT...";
        byte[] wavData = audioRecorder.StopRecording();
        if (wavData != null)
        {
            VoiceManager.Instance.SpeechToText(wavData, (transcript) =>
            {
                Debug.Log("Transcribed: " + transcript);
                if (statusText != null) statusText.text = "Transcript: " + transcript;
                // Send transcript to backend (reaction time set to 0 for now)
                webSocketManager.SendRoleplayEvent(transcript, 0);
            });
        }

        startVoiceButton.gameObject.SetActive(true);
        sendVoiceButton.gameObject.SetActive(false);
    }

    private void UpdateUIState(bool sessionActive)
    {
        startSessionButton.gameObject.SetActive(!sessionActive);
        endSessionButton.gameObject.SetActive(sessionActive);
        startVoiceButton.gameObject.SetActive(sessionActive);
        sendVoiceButton.gameObject.SetActive(false);
    }
}
