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

    [Header("Persona Selection")]
    public TMP_Dropdown personaDropdown;

    private readonly string[] personaIds = { "elena", "ahmad", "sarah", "david" };

    private void Start()
    {
        // Setup persona dropdown if assigned
        if (personaDropdown != null)
        {
            personaDropdown.ClearOptions();
            var options = new List<TMP_Dropdown.OptionData>
            {
                new TMP_Dropdown.OptionData("Elena (Design)"),
                new TMP_Dropdown.OptionData("Ahmad (Executive)"),
                new TMP_Dropdown.OptionData("Sarah (Eco)"),
                new TMP_Dropdown.OptionData("David (Safety)")
            };
            personaDropdown.AddOptions(options);
            personaDropdown.value = 0; // Elena as default
        }

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
        if (ElevenLabsManager.Instance != null && ElevenLabsManager.Instance.IsPlaying)
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
        if (ElevenLabsManager.Instance != null)
        {
            if (statusText != null) statusText.text = "AI is talking...";
            ElevenLabsManager.Instance.TextToSpeech(text, () => {
                if (statusText != null) statusText.text = "AI finished talking. Starting recording...";
                OnStartVoice();
            });
        }
    }

    private void OnStartSession()
    {
        string personaId = "elena";
        if (personaDropdown != null && personaDropdown.value < personaIds.Length)
        {
            personaId = personaIds[personaDropdown.value];
        }

        webSocketManager.StartSession(personaId);
        UpdateUIState(true);
        if (statusText != null) statusText.text = "Session Started with " + personaId;
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
            ElevenLabsManager.Instance.SpeechToText(wavData, (transcript) =>
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
        if (personaDropdown != null) personaDropdown.gameObject.SetActive(!sessionActive);
        endSessionButton.gameObject.SetActive(sessionActive);
        startVoiceButton.gameObject.SetActive(sessionActive);
        sendVoiceButton.gameObject.SetActive(false);
    }
}
