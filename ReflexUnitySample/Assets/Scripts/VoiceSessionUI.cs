using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using System.Text;

public class VoiceSessionUI : MonoBehaviour
{
    [Header("UI Buttons")]
    public Button startSessionButton;
    public Button endSessionButton;
    public Button startVoiceButton;
    public Button sendVoiceButton;

    [Header("Status & Summary")]
    public TMP_Text statusText;
    public TMP_Text summaryText;

    public string selected_presona;

    [Header("References")]
    public ReflexWebSocketManager webSocketManager;
    public AudioRecorder audioRecorder;

    private bool isSTTPending = false;

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
            webSocketManager.OnConnectionStatusChanged += (status) => {
                if (statusText != null) statusText.text = status;
            };
            webSocketManager.OnRawRatingReceived += HandleSessionRating;
        }

        if (summaryText != null) summaryText.text = "";
    }

    private void Update()
    {
        // Disable recording button if AI is talking or STT is pending
        bool isBusy = (VoiceManager.Instance != null && VoiceManager.Instance.IsPlaying) || isSTTPending;
        
        if (isBusy)
        {
            startVoiceButton.interactable = false;
        }
        else if (webSocketManager != null && webSocketManager.IsSessionActive)
        {
            startVoiceButton.interactable = true;
        }
    }

    private void HandleAiUtterance(string text)
    {
        if (VoiceManager.Instance != null)
        {
            if (statusText != null) statusText.text = "AI is talking...";
            VoiceManager.Instance.TextToSpeech(text, () => {
                // Only auto-start if session is still active (not ended or summary received)
                if (webSocketManager != null && webSocketManager.IsSessionActive)
                {
                    if (statusText != null) statusText.text = "AI finished. Recording started!";
                    OnStartVoice();
                }
                else
                {
                    if (statusText != null) statusText.text = "AI finished.";
                }
            });
        }
    }

    private void HandleSessionRating(Dictionary<string, object> ratingData)
    {
        if (summaryText == null) return;

        // Ensure recording is stopped when summary arrives
        if (audioRecorder != null) audioRecorder.StopRecording();
        UpdateUIState(false);

        StringBuilder sb = new StringBuilder();
        sb.AppendLine("<b style=\"color:#FFFFFF\">SESSION SUMMARY</b>");
        sb.AppendLine("-----------------------------");

        if (ratingData.ContainsKey("overall_score"))
            sb.AppendLine($"<b>Overall Score:</b> {ratingData["overall_score"]}/10");
        
        if (ratingData.ContainsKey("avg_score"))
            sb.AppendLine($"<b>Avg Score:</b> {ratingData["avg_score"]}%");

        sb.AppendLine();

        if (ratingData.ContainsKey("strengths"))
        {
            sb.AppendLine("<color=#00FF00><b>STRENGTHS:</b></color>");
            var strengths = ratingData["strengths"] as IEnumerable<object>;
            if (strengths != null)
            {
                foreach (var s in strengths) sb.AppendLine($"- {s}");
            }
        }

        sb.AppendLine();

        if (ratingData.ContainsKey("improvements"))
        {
            sb.AppendLine("<color=#FFCC00><b>IMPROVEMENTS:</b></color>");
            var improvements = ratingData["improvements"] as IEnumerable<object>;
            if (improvements != null)
            {
                foreach (var i in improvements) sb.AppendLine($"- {i}");
            }
        }

        summaryText.text = sb.ToString();
        if (statusText != null) statusText.text = "Summary Received";
    }

    private void OnStartSession()
    {
        if (summaryText != null) summaryText.text = "";
        
        // Update persona from input field if provided
        if (!string.IsNullOrEmpty(selected_presona))
        {
            webSocketManager.personaId = selected_presona.ToLower();
        }

        webSocketManager.StartSession();
        UpdateUIState(true);
    }

    private void OnEndSession()
    {
        webSocketManager.EndSession();
        // Ensure recording is stopped if session is ended manually
        if (audioRecorder != null) audioRecorder.StopRecording();
        UpdateUIState(false);
    }

    private void OnStartVoice()
    {
        if (audioRecorder == null)
        {
            Debug.LogError("AudioRecorder reference missing!");
            return;
        }

        audioRecorder.StartRecording();
        // Hide start button (redundant now) and show send button
        if (startVoiceButton != null) startVoiceButton.gameObject.SetActive(false);
        if (sendVoiceButton != null) sendVoiceButton.gameObject.SetActive(true);
        if (statusText != null) statusText.text = "Recording...";
    }

    private void OnSendVoice()
    {
        if (statusText != null) statusText.text = "Sending to STT...";
        
        isSTTPending = true;
        byte[] wavData = audioRecorder != null ? audioRecorder.StopRecording() : null;
        
        if (wavData != null && wavData.Length > 0)
        {
            VoiceManager.Instance.SpeechToText(wavData, (transcript) =>
            {
                isSTTPending = false;
                if (string.IsNullOrEmpty(transcript))
                {
                    if (statusText != null) statusText.text = "No speech detected.";
                }
                else
                {
                    if (statusText != null) statusText.text = "Sent: " + transcript;
                    webSocketManager.SendRoleplayEvent(transcript, 0);
                }
                
                // Hide send button, keep start button hidden (auto-starts next time)
                if (sendVoiceButton != null) sendVoiceButton.gameObject.SetActive(false);
            });
        }
        else
        {
            isSTTPending = false;
            if (statusText != null) statusText.text = "Capture failed.";
            if (sendVoiceButton != null) sendVoiceButton.gameObject.SetActive(false);
        }
    }

    private void UpdateUIState(bool sessionActive)
    {
        startSessionButton.gameObject.SetActive(!sessionActive);
        endSessionButton.gameObject.SetActive(sessionActive);
        // Start Voice button is now hidden by default during active session
        startVoiceButton.gameObject.SetActive(false);
        sendVoiceButton.gameObject.SetActive(false);
    }
}
