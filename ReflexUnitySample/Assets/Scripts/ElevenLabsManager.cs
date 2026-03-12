using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;

public class ElevenLabsManager : MonoBehaviour
{
    public static ElevenLabsManager Instance { get; private set; }

    [Header("ElevenLabs API Settings")]
    public string apiKey;
    public string voiceId = "21m00Tcm4TlvDq8ikWAM"; // default voice ID
    public string modelId = "eleven_multilingual_v2";

    [Header("STT Settings")]
    public string sttModelId = "scribe_v1";

    [Header("Audio Output")]
    [Tooltip("If left empty, a new AudioSource will be created automatically.")]
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
        string url = $"https://api.elevenlabs.io/v1/text-to-speech/{voiceId}";

        var body = new
        {
            text = text,
            model_id = modelId,
            voice_settings = new
            {
                stability = 0.5f,
                similarity_boost = 0.75f
            }
        };

        string json = JsonConvert.SerializeObject(body);
        byte[] bytes = Encoding.UTF8.GetBytes(json);

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bytes);
            request.downloadHandler = new DownloadHandlerAudioClip(url, AudioType.MPEG);
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("xi-api-key", apiKey);

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
                Debug.LogError($"TTS Error: {request.error}\n{request.downloadHandler.text}");
            }
        }
    }

    public void SpeechToText(byte[] wavData, Action<string> onTranscriptReceived)
    {
        StartCoroutine(STTCoroutine(wavData, onTranscriptReceived));
    }

    private IEnumerator STTCoroutine(byte[] wavData, Action<string> onTranscriptReceived)
    {
        string url = "https://api.elevenlabs.io/v1/speech-to-text";

        IMultipartFormSection formData = new MultipartFormFileSection("file", wavData, "audio.wav", "audio/wav");
        List<IMultipartFormSection> formList = new List<IMultipartFormSection> { formData };
        
        // Note: model_id is usually passed as a field in multipart form if needed
        formList.Add(new MultipartFormDataSection("model_id", sttModelId));

        using (UnityWebRequest request = UnityWebRequest.Post(url, formList))
        {
            request.SetRequestHeader("xi-api-key", apiKey);

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                string jsonResponse = request.downloadHandler.text;
                Debug.Log("STT Response: " + jsonResponse);
                
                var response = JsonConvert.DeserializeObject<Dictionary<string, object>>(jsonResponse);
                if (response.ContainsKey("text"))
                {
                    onTranscriptReceived?.Invoke(response["text"].ToString());
                }
            }
            else
            {
                Debug.LogError($"STT Error: {request.error}\n{request.downloadHandler.text}");
            }
        }
    }
}
