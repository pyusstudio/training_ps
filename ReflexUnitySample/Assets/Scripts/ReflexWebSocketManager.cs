using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using WebSocketSharp;
using Newtonsoft.Json;

public class ReflexWebSocketManager : MonoBehaviour
{
    public static ReflexWebSocketManager Instance { get; private set; }

    [Header("Backend WebSocket Settings")]
    [SerializeField] private string baseUrl = "ws://localhost:8000/ws";
    [SerializeField] public string role = "trainee";
    [SerializeField] public string personaId = "elena";
    [SerializeField] public string userId = "unity_user_1";
    
    [Header("Session Settings")]
    public bool autoStartSessionOnConnect = false;

    private WebSocket websocket;
    private string currentSessionId = "";
    private bool isConnected;
    private bool sessionActive;
    private bool isReconnecting;

    public bool IsConnected => isConnected;
    public bool IsSessionActive => sessionActive;

    // Dispatch queue for main thread actions
    private readonly Queue<Action> mainThreadActions = new Queue<Action>();
    private readonly object queueLock = new object();

    // Events for UI and other managers
    public event Action<string> OnConnectionStatusChanged;
    public event Action<string> OnAiClientUtterance;
    public event Action<string> OnSessionSummary;
    public event Action<string, string, int> OnScoreUpdate; // intent, feedback, score
    public event Action<Dictionary<string, object>> OnRawRatingReceived;

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

    private void Start()
    {
        Connect();
    }

    public void Connect()
    {
        if (websocket != null)
        {
            try { websocket.Close(); } catch { }
            websocket = null;
        }

        string connectionUrl = $"{baseUrl}?role={role}&user_id={userId}";
        Debug.Log($"Connecting to: {connectionUrl}");
        
        websocket = new WebSocket(connectionUrl);

        if (connectionUrl.StartsWith("wss"))
        {
            websocket.SslConfiguration.EnabledSslProtocols = System.Security.Authentication.SslProtocols.Tls12;
        }

        websocket.Origin = "https://training-ps.onrender.com";

        websocket.OnOpen += (sender, e) =>
        {
            EnqueueOnMainThread(() =>
            {
                isConnected = true;
                isReconnecting = false;
                Debug.Log($"Connected to Reflex Backend as {role}!");
                OnConnectionStatusChanged?.Invoke($"Connected as {role}");
                
                if (autoStartSessionOnConnect)
                {
                    StartSession();
                }
            });
        };

        websocket.OnError += (sender, e) =>
        {
            EnqueueOnMainThread(() =>
            {
                isConnected = false;
                sessionActive = false;
                Debug.LogError("WebSocket Error: " + e.Message);
                OnConnectionStatusChanged?.Invoke("Connection Error");
                AttemptReconnect();
            });
        };

        websocket.OnClose += (sender, e) =>
        {
            EnqueueOnMainThread(() =>
            {
                isConnected = false;
                sessionActive = false;
                Debug.Log($"WebSocket Closed! Code: {e.Code}, Reason: {e.Reason}");
                OnConnectionStatusChanged?.Invoke("Disconnected");
                AttemptReconnect();
            });
        };

        websocket.OnMessage += (sender, e) =>
        {
            EnqueueOnMainThread(() =>
            {
                string message = e.IsText ? e.Data : Encoding.UTF8.GetString(e.RawData ?? Array.Empty<byte>());
                HandleIncomingMessage(message);
            });
        };

        try
        {
            websocket.Connect();
        }
        catch (Exception ex)
        {
            Debug.LogError("Failed to initiate connection: " + ex.Message);
            AttemptReconnect();
        }
    }

    private void AttemptReconnect()
    {
        if (isReconnecting || !gameObject.activeInHierarchy) return;
        
        isReconnecting = true;
        Debug.Log("Waiting 3 seconds to reconnect...");
        StartCoroutine(ReconnectCoroutine());
    }

    private IEnumerator ReconnectCoroutine()
    {
        yield return new WaitForSeconds(3.0f);
        if (!isConnected)
        {
            Debug.Log("Attempting Reconnect...");
            Connect();
        }
        else
        {
            isReconnecting = false;
        }
    }

    private void Update()
    {
        lock (queueLock)
        {
            while (mainThreadActions.Count > 0)
            {
                var action = mainThreadActions.Dequeue();
                action?.Invoke();
            }
        }
    }

    private void EnqueueOnMainThread(Action action)
    {
        if (action == null) return;
        lock (queueLock)
        {
            mainThreadActions.Enqueue(action);
        }
    }

    private void SendWebSocketMessage(object messageObj)
    {
        if (websocket == null || !websocket.IsAlive)
        {
            Debug.LogWarning("WebSocket not open. Msg dropped.");
            return;
        }

        string json = JsonConvert.SerializeObject(messageObj);
        websocket.Send(json);
    }

    #region Outbound Messages

    public void StartSession()
    {
        if (!isConnected) return;
        
        var msg = new
        {
            type = "session_start",
            direction = "cs",
            source = "unity",
            scenario = "sales_training",
            user_id = userId,
            persona_id = personaId
        };
        SendWebSocketMessage(msg);
    }
    
    public void SendRoleplayEvent(string transcript, int reactionTimeMs)
    {
        if (!isConnected || !sessionActive || string.IsNullOrEmpty(currentSessionId)) return;

        var msg = new
        {
            type = "roleplay_event",
            direction = "cs",
            session_id = currentSessionId,
            transcript = transcript,
            reaction_time_ms = reactionTimeMs
        };
        SendWebSocketMessage(msg);
    }

    public void EndSession()
    {
        if (!sessionActive || string.IsNullOrEmpty(currentSessionId)) return;

        var msg = new
        {
            type = "session_end",
            direction = "cs",
            session_id = currentSessionId
        };
        SendWebSocketMessage(msg);
        sessionActive = false;
    }

    #endregion

    #region Inbound Message Handling

    private void HandleIncomingMessage(string jsonMessage)
    {
        try 
        {
            var baseMsg = JsonConvert.DeserializeObject<Dictionary<string, object>>(jsonMessage);
            if (baseMsg == null || !baseMsg.ContainsKey("type")) return;

            string type = baseMsg["type"].ToString();
            
            if (baseMsg.ContainsKey("session_id") && baseMsg["session_id"] != null)
            {
                currentSessionId = baseMsg["session_id"].ToString();
            }

            switch (type)
            {
                case "connected":
                    Debug.Log($"Handshake confirmed: {baseMsg["role"]}");
                    OnConnectionStatusChanged?.Invoke($"Connected as {baseMsg["role"]}");
                    break;

                case "session_started":
                    sessionActive = true;
                    string pid = baseMsg.ContainsKey("persona_id") ? baseMsg["persona_id"].ToString() : personaId;
                    Debug.Log($"Session Started! ID: {currentSessionId} | Persona: {pid}");
                    break;

                case "client_utterance":
                    if (baseMsg.ContainsKey("text") && baseMsg["text"] != null)
                    {
                        OnAiClientUtterance?.Invoke(baseMsg["text"].ToString());
                    }
                    break;

                case "score_event":
                    string intent = baseMsg.ContainsKey("intent_category") ? baseMsg["intent_category"].ToString() : "Unknown";
                    string fbk = baseMsg.ContainsKey("feedback") ? baseMsg["feedback"].ToString() : "";
                    int score = baseMsg.ContainsKey("score") ? Convert.ToInt32(baseMsg["score"]) : 0;
                    OnScoreUpdate?.Invoke(intent, fbk, score);
                    break;

                case "session_summary":
                case "session_rating":
                    OnRawRatingReceived?.Invoke(baseMsg);
                    break;

                case "broadcast_event":
                    Debug.Log("Admin Broadcast: " + baseMsg["payload"]);
                    break;

                case "error":
                    Debug.LogError("Server Error: " + baseMsg["detail"]);
                    break;
            }
        }
        catch (Exception ex)
        {
            Debug.LogError("Msg Parse Error: " + ex.Message + " | " + jsonMessage);
        }
    }

    #endregion

    private void OnApplicationQuit()
    {
        if (sessionActive) EndSession();
        if (websocket != null)
        {
            try { websocket.Close(); } catch { }
            websocket = null;
        }
    }
}
