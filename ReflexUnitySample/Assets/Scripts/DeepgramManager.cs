using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;

public class DeepgramManager : MonoBehaviour, IVoiceProvider
{
    public static DeepgramManager Instance { get; private set; }

    [Header("Deepgram API Settings")]
    public string apiKey;
    public string ttsModel = "aura-asteria-en";
    public string sttModel = "nova-2";

    [Header("Audio Output")]
    public AudioSource audioSource;

    public bool IsPlaying { get; private set; }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            if (audioSource == null)
            {
                audioSource = gameObject.AddComponent<AudioSource>();
            }
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void TextToSpeech(string text, Action onComplete = null)
    {
        StartCoroutine(TTSCoroutine(text, onComplete));
    }

    private IEnumerator TTSCoroutine(string text, Action onComplete)
    {
        string url = $"https://api.deepgram.com/v1/speak?model={ttsModel}";

        var body = new { text = text };
        string json = JsonConvert.SerializeObject(body);
        byte[] bytes = Encoding.UTF8.GetBytes(json);

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bytes);
            request.downloadHandler = new DownloadHandlerAudioClip(url, AudioType.MPEG);
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("Authorization", $"Token {apiKey}");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                AudioClip clip = DownloadHandlerAudioClip.GetContent(request);
                IsPlaying = true;
                audioSource.clip = clip;
                audioSource.Play();
                
                yield return new WaitWhile(() => audioSource.isPlaying);
                IsPlaying = false;
                onComplete?.Invoke();
            }
            else
            {
                Debug.LogError($"Deepgram TTS Error: {request.error}\n{request.downloadHandler.text}");
            }
        }
    }

    public void SpeechToText(byte[] wavData, Action<string> onTranscriptReceived)
    {
        StartCoroutine(STTCoroutine(wavData, onTranscriptReceived));
    }

    private IEnumerator STTCoroutine(byte[] wavData, Action<string> onTranscriptReceived)
    {
        string url = $"https://api.deepgram.com/v1/listen?model={sttModel}&smart_format=true";

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(wavData);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "audio/wav");
            request.SetRequestHeader("Authorization", $"Token {apiKey}");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                string jsonResponse = request.downloadHandler.text;
                Debug.Log("Deepgram STT Response: " + jsonResponse);
                
                var response = JsonConvert.DeserializeObject<DeepgramSTTResponse>(jsonResponse);
                if (response?.results?.channels?.Count > 0 && 
                    response.results.channels[0].alternatives?.Count > 0)
                {
                    string transcript = response.results.channels[0].alternatives[0].transcript;
                    onTranscriptReceived?.Invoke(transcript);
                }
                else
                {
                    Debug.LogWarning("Deepgram STT: No transcript found in results.");
                    onTranscriptReceived?.Invoke("");
                }
            }
            else
            {
                Debug.LogError($"Deepgram STT Error: {request.error}\n{request.downloadHandler.text}");
                onTranscriptReceived?.Invoke("");
            }
        }
    }

    [Serializable]
    public class DeepgramSTTResponse
    {
        public Results results;
    }

    [Serializable]
    public class Results
    {
        public List<Channel> channels;
    }

    [Serializable]
    public class Channel
    {
        public List<Alternative> alternatives;
    }

    [Serializable]
    public class Alternative
    {
        public string transcript;
        public float confidence;
    }
}
