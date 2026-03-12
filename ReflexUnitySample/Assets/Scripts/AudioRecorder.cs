using System.IO;
using UnityEngine;

public class AudioRecorder : MonoBehaviour
{
    private AudioSource audioSource;
    private string microphoneDevice;
    private bool isRecording;
    private const int MaxRecordingTime = 30;
    private const int SampleRate = 44100;

    private void Awake()
    {
        audioSource = gameObject.AddComponent<AudioSource>();
        if (Microphone.devices.Length > 0)
        {
            microphoneDevice = Microphone.devices[0];
        }
        else
        {
            Debug.LogError("No microphone detected!");
        }
    }

    public void StartRecording()
    {
        if (isRecording || string.IsNullOrEmpty(microphoneDevice)) return;

        isRecording = true;
        audioSource.clip = Microphone.Start(microphoneDevice, false, MaxRecordingTime, SampleRate);
        Debug.Log("Recording started...");
        
        // Auto-stop after MaxRecordingTime if not stopped manually
        Invoke(nameof(StopRecordingManually), MaxRecordingTime);
    }

    private void StopRecordingManually()
    {
        if (isRecording)
        {
            StopRecording();
        }
    }

    public byte[] StopRecording()
    {
        if (!isRecording) return null;

        CancelInvoke(nameof(StopRecordingManually));
        isRecording = false;
        
        int lastPos = Microphone.GetPosition(microphoneDevice);
        Microphone.End(microphoneDevice);

        if (lastPos <= 0) return null;

        // Trim the clip to actual recorded length
        float[] samples = new float[lastPos * audioSource.clip.channels];
        audioSource.clip.GetData(samples, 0);

        AudioClip trimmedClip = AudioClip.Create("RecordedAudio", lastPos, audioSource.clip.channels, SampleRate, false);
        trimmedClip.SetData(samples, 0);

        Debug.Log("Recording stopped. Length: " + trimmedClip.length + "s");
        
        return ConvertToWav(trimmedClip);
    }

    private byte[] ConvertToWav(AudioClip clip)
    {
        using (var stream = new MemoryStream())
        {
            using (var writer = new BinaryWriter(stream))
            {
                var samples = new float[clip.samples * clip.channels];
                clip.GetData(samples, 0);

                // WAV Header
                writer.Write(System.Text.Encoding.UTF8.GetBytes("RIFF"));
                writer.Write(36 + samples.Length * 2);
                writer.Write(System.Text.Encoding.UTF8.GetBytes("WAVE"));
                writer.Write(System.Text.Encoding.UTF8.GetBytes("fmt "));
                writer.Write(16);
                writer.Write((short)1); // PCM
                writer.Write((short)clip.channels);
                writer.Write(SampleRate);
                writer.Write(SampleRate * clip.channels * 2);
                writer.Write((short)(clip.channels * 2));
                writer.Write((short)16);
                writer.Write(System.Text.Encoding.UTF8.GetBytes("data"));
                writer.Write(samples.Length * 2);

                // PCM Data
                foreach (var sample in samples)
                {
                    writer.Write((short)(sample * short.MaxValue));
                }
            }
            return stream.ToArray();
        }
    }
}
