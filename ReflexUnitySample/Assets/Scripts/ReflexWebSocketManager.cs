using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using WebSocketSharp;
using Newtonsoft.Json;

public class ReflexWebSocketManager : MonoBehaviour
{
    private WebSocket websocket;

    // Point this to your backend WebSocket endpoint 
    // [Header("Backend WebSocket Settings")]
    private string backendUrl = "wss://training-ps.onrender.com/ws?role=trainee";
    public string userId = "unity_user_1";
    public bool autoStartSessionOnConnect = false;

    private string currentSessionId = "";
    private bool isConnected;
    private bool sessionActive;
    public bool IsSessionActive => sessionActive;


    // Simple main-thread dispatch queue for WebSocketSharp callbacks
    private readonly Queue<Action> mainThreadActions = new Queue<Action>();
    private readonly object queueLock = new object();

    public event Action<string> OnAiClientUtterance;
    public event Action<string> OnSessionSummary;

    private void Start()
    {
        Connect();
    }

    private void Connect()
    {
        // Clean up previous connection if any
        if (websocket != null)
        {
            try { websocket.Close(); }
            catch { }
            websocket = null;
        }

        string connectionUrl = $"{backendUrl}&user_id={userId}";
        websocket = new WebSocket(connectionUrl);

        if (connectionUrl.StartsWith("wss"))
        {
            websocket.SslConfiguration.EnabledSslProtocols = System.Security.Authentication.SslProtocols.Tls12;
        }

        // Set Origin header often required by backends
        websocket.Origin = "https://training-ps.onrender.com";

        websocket.OnOpen += (sender, e) =>
        {
            EnqueueOnMainThread(() =>
            {
                isConnected = true;
                Debug.Log("Connected to ReflexTraining Backend!");
                // Start a session automatically on connection (optional)
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
                currentSessionId = "";
                Debug.LogError("WebSocket Error: " + e.Message);
            });
        };

        websocket.OnClose += (sender, e) =>
        {
            EnqueueOnMainThread(() =>
            {
                isConnected = false;
                sessionActive = false;
                currentSessionId = "";
                Debug.Log($"WebSocket Connection closed! Code: {e.Code}, Reason: {e.Reason}");
            });
        };

        websocket.OnMessage += (sender, e) =>
        {
            EnqueueOnMainThread(() =>
            {
                string message = e.IsText
                    ? e.Data
                    : Encoding.UTF8.GetString(e.RawData ?? Array.Empty<byte>());
                Debug.Log("Received OnMessage! " + message);
                HandleIncomingMessage(message);
            });
        };

        try
        {
            websocket.Connect();
        }
        catch (Exception ex)
        {
            Debug.LogError("Failed to connect WebSocket: " + ex.Message);
        }
    }

    private void Update()
    {
        // Process all queued WebSocket callbacks on the Unity main thread
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

    // Generic JSON Sender
    private void SendWebSocketMessage(object messageObj)
    {
        if (websocket == null)
        {
            Debug.LogWarning("WebSocket is null, cannot send.");
            return;
        }

        if (!websocket.IsAlive)
        {
            Debug.LogWarning("WebSocket is not open (IsAlive == false). Message not sent.");
            return;
        }

        string json = JsonConvert.SerializeObject(messageObj);
        websocket.Send(json);
    }

    #region Outbound Messages

    public void StartSession(string personaId = "elena")
    {
        if (!isConnected)
        {
            Debug.LogWarning("StartSession called but WebSocket is not connected.");
            return;
        }

        if (sessionActive)
        {
            Debug.LogWarning("StartSession called but a session is already active.");
            return;
        }

        var msg = new
        {
            type = "session_start",
            direction = "cs", // client-to-server
            source = "unity",
            scenario = "sales_training", // Replace with your scenario
            user_id = userId,
            persona_id = personaId
        };
        SendWebSocketMessage(msg);
    }
    
    public void SendRoleplayEvent(string transcript, int reactionTimeMs)
    {
        if (!isConnected || !sessionActive || string.IsNullOrEmpty(currentSessionId))
        {
            Debug.LogError("Cannot send roleplay event because there is no active connected session.");
            return;
        }

        var msg = new
        {
            type = "roleplay_event",
            direction = "cs",
            session_id = currentSessionId,
            transcript = transcript,
            reaction_time_ms = reactionTimeMs
        };
        Debug.Log("Sending Roleplay Event: " + transcript);
        SendWebSocketMessage(msg);
    }

    public void EndSession()
    {
        if (!sessionActive || string.IsNullOrEmpty(currentSessionId))
            return;

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
            if (baseMsg != null && baseMsg.ContainsKey("type"))
            {
                string type = baseMsg["type"].ToString();

                // Keep track of the session ID if it's included
                if (baseMsg.ContainsKey("session_id") && baseMsg["session_id"] != null)
                {
                    currentSessionId = baseMsg["session_id"].ToString();
                }

                switch (type)
                {
                    case "session_started":
                        sessionActive = true;
                        Debug.Log($"Session Started! ID: {currentSessionId}");
                        break;
                    case "client_utterance":
                        // The AI's response text
                        if (!sessionActive || string.IsNullOrEmpty(currentSessionId))
                        {
                            Debug.LogWarning("Received client_utterance without an active session; ignoring.");
                            break;
                        }

                        if (!baseMsg.ContainsKey("text") || baseMsg["text"] == null)
                        {
                            Debug.LogError("client_utterance message missing 'text' field.");
                            break;
                        }

                        var aiText = baseMsg["text"].ToString();
                        Debug.LogWarning("AI Client Says: " + aiText);
                        OnAiClientUtterance?.Invoke(aiText);
                        break;
                    case "score_event":
                        // Feedback on the user's roleplay transcript
                        Debug.Log($"Score Event - Intent: {baseMsg["intent_category"]}, Score: {baseMsg["score"]}");
                        break;
                    case "session_summary":
                    {
                        var avgScore = baseMsg.ContainsKey("avg_score") ? baseMsg["avg_score"] : null;
                        string summaryText = avgScore != null
                            ? $"[SessionSummary] Avg Score: {avgScore}"
                            : "[SessionSummary] Summary received.";
                        Debug.Log(summaryText);
                        OnSessionSummary?.Invoke(summaryText);
                        break;
                    }
                    case "session_rating":
                    {
                        var overall = baseMsg.ContainsKey("overall_score") ? baseMsg["overall_score"] : null;
                        string ratingText = overall != null
                            ? $"[SessionRating] Overall Score: {overall}"
                            : "[SessionRating] Rating received.";
                        Debug.Log(ratingText);
                        OnSessionSummary?.Invoke(ratingText);
                        break;
                    }
                    case "error":
                        Debug.LogError("Server Error: " + baseMsg["detail"]);
                        break;
                    default:
                        Debug.Log("Unhandled message type: " + type);
                        break;
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError("Error parsing incoming message: " + ex.Message + "\n" + jsonMessage);
        }
    }

    #endregion

    private void OnApplicationQuit()
    {
        try
        {
            if (sessionActive)
            {
                EndSession();
            }
        }
        catch
        {
        }

        if (websocket != null)
        {
            try
            {
                websocket.Close();
            }
            catch (Exception e)
            {
                Debug.LogWarning("Error while closing WebSocket during quit: " + e.Message);
            }

            websocket = null;
        }
    }
}
