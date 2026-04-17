using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
// Ensure you have websocket-sharp.dll in your Unity project
using WebSocketSharp;

namespace FloboDiagnostics
{
    [Serializable]
    public class BaseMessage
    {
        public string @event;
        public string client_id;
        public string request_id;
    }

    [Serializable]
    public class IdentifyMessage : BaseMessage
    {
        public string role;
        // Keeping payload for potential future use or backward compatibility 
        // with other components that might rely on the structure
        public IdentifyPayload payload; 
    }

    [Serializable]
    public class IdentifyPayload { } // Empty payload for now

    [Serializable]
    public class PingMessage : BaseMessage
    {
        public PingPayload payload;
    }
    
    [Serializable]
    public class PingPayload { public long timestamp; }

    // --- TELEMETRY MODELS ---
    [Serializable]
    public class TelemetryMessage : BaseMessage
    {
        public TelemetryPayload payload;
    }

    [Serializable]
    public class TelemetryPayload
    {
        public string action_type;
        public string result;
        // Metadata is a stringified JSON or simple string dictionary representation
        // To easily serialize dynamic dictionaries in Unity's default JsonUtility,
        // it may require a workaround, but for simple use cases we map it as an empty object string.
        public TelemetryMetadata metadata;
    }

    // Generic metadata wrapper
    [Serializable]
    public class TelemetryMetadata
    {
        public string status;
        public string target;
    }

    // --- FAULT REPORT MODELS ---
    [Serializable]
    public class FaultReportMessage : BaseMessage
    {
        public FaultReportPayload payload;
    }

    [Serializable]
    public class FaultReportPayload
    {
        public string mainProduct;
        public List<FaultDetail> faultDetails;
    }

    [Serializable]
    public class FaultDetail
    {
        public string section;
        public string failedComponent;
        public string subComponent;
        public string faultMode;
    }

    [Serializable]
    public class ServerResponse
    {
        public string @event;
        public string receivedAt;
    }

    public class DiagnosticsWebSocketClient : MonoBehaviour
    {
        [Header("Connection Settings")]
        public string serverUrl = "ws://localhost:8080";
        public float reconnectDelay = 5f;
        public float heartbeatInterval = 10f;
        [Tooltip("Leave empty to auto-generate a persistent ID for this machine")]
        public string customClientId;

        public string clientId { get; private set; }

        private WebSocket ws;
        private bool isConnecting = false;

        private void Start()
        {
            // Use custom ID if provided, otherwise generate one
            if (string.IsNullOrEmpty(customClientId))
            {
                clientId = "machine_" + System.Guid.NewGuid().ToString().Substring(0, 8);
            }
            else
            {
                clientId = customClientId;
            }
            
            ConnectToServer();
            StartCoroutine(HeartbeatCoroutine());
        }

        private void ConnectToServer()
        {
            if (isConnecting || (ws != null && ws.IsAlive)) return;

            isConnecting = true;
            Debug.Log($"[WS] Attempting to connect to {serverUrl}...");

            ws = new WebSocket(serverUrl);

            ws.OnOpen += OnOpenHandler;
            ws.OnMessage += OnMessageHandler;
            ws.OnError += OnErrorHandler;
            ws.OnClose += OnCloseHandler;

            ws.ConnectAsync();
        }

        private void OnOpenHandler(object sender, EventArgs e)
        {
            isConnecting = false;
            Debug.Log("[WS] Connected to Server successfully.");

            IdentifyMessage idMsg = new IdentifyMessage
            {
                @event = "identify",
                client_id = this.clientId,
                role = "client",
                payload = new IdentifyPayload()
            };
            
            SendJson(JsonUtility.ToJson(idMsg));
        }

        private void OnMessageHandler(object sender, MessageEventArgs e)
        {
            if (e.IsText)
            {
                Debug.Log($"[WS] Message Received: {e.Data}");
                // Attempt to parse server-side metadata if available
                try
                {
                    var response = JsonUtility.FromJson<ServerResponse>(e.Data);
                    if (response != null && !string.IsNullOrEmpty(response.receivedAt))
                    {
                        Debug.Log($"[WS] Server received our report at: {response.receivedAt}");
                    }
                }
                catch { /* Ignore if it's a raw pong or unknown event */ }
            }
        }

        private void OnErrorHandler(object sender, ErrorEventArgs e)
        {
            Debug.LogError($"[WS] Error: {e.Message}");
        }

        private void OnCloseHandler(object sender, CloseEventArgs e)
        {
            isConnecting = false;
            Debug.LogWarning($"[WS] Disconnected (Code: {e.Code}, Reason: {e.Reason})");

            if (Application.isPlaying)
            {
                StartCoroutine(ReconnectCoroutine());
            }
        }

        private IEnumerator ReconnectCoroutine()
        {
            yield return new WaitForSeconds(reconnectDelay);
            ConnectToServer();
        }

        private IEnumerator HeartbeatCoroutine()
        {
            while (Application.isPlaying)
            {
                yield return new WaitForSeconds(heartbeatInterval);
                if (ws != null && ws.IsAlive)
                {
                    SendPing();
                }
            }
        }

        private void OnDestroy()
        {
            if (ws != null)
            {
                ws.OnOpen -= OnOpenHandler;
                ws.OnMessage -= OnMessageHandler;
                ws.OnError -= OnErrorHandler;
                ws.OnClose -= OnCloseHandler;
                if (ws.IsAlive) ws.Close();
            }
        }

        private void SendJson(string json)
        {
            Debug.Log($"[WS] Sending Data: {json}");
            if (ws != null && ws.IsAlive) ws.SendAsync(json, null);
        }

        // --- PUBLIC BROADCASTING APIS ---

        public void SendPing()
        {
            PingMessage msg = new PingMessage
            {
                @event = "ping",
                client_id = this.clientId,
                request_id = System.Guid.NewGuid().ToString(),
                payload = new PingPayload { timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            };
            SendJson(JsonUtility.ToJson(msg));
        }

        public void SendTelemetry(string actionType, string result, string metadataStatus, string metadataTarget)
        {
            TelemetryMessage teleMsg = new TelemetryMessage
            {
                @event = "telemetry",
                client_id = this.clientId,
                request_id = System.Guid.NewGuid().ToString(),
                payload = new TelemetryPayload
                {
                    action_type = actionType,
                    result = result,
                    metadata = new TelemetryMetadata { status = metadataStatus, target = metadataTarget }
                }
            };
            SendJson(JsonUtility.ToJson(teleMsg));
        }

        public void SendFaultReport(string mainProduct, List<FaultDetail> details)
        {
            FaultReportMessage reportMsg = new FaultReportMessage
            {
                @event = "fault_report",
                client_id = this.clientId,
                request_id = System.Guid.NewGuid().ToString(),
                payload = new FaultReportPayload
                {
                    mainProduct = mainProduct,
                    faultDetails = details
                }
            };
            SendJson(JsonUtility.ToJson(reportMsg));
        }

        // --- TEST FUNCTIONS ---

        [ContextMenu("Test Send Telemetry")]
        public void SendTelemetryTest()
        {
            TelemetryMessage teleMsg = new TelemetryMessage
            {
                @event = "telemetry",
                client_id = this.clientId,
                request_id = "test_req_" + System.Guid.NewGuid().ToString().Substring(0, 8),
                payload = new TelemetryPayload
                {
                    action_type = "Check with barometer",
                    result = "Check with barometer inside turbine to determine crack",
                    metadata = new TelemetryMetadata { status = "pending", target = "turbine_core" }
                }
            };

            SendJson(JsonUtility.ToJson(teleMsg));
        }

        [ContextMenu("Test Send Fault Report")]
        public void SendFaultReportTest()
        {
            List<FaultDetail> details = new List<FaultDetail>();
            details.Add(new FaultDetail
            {
                section = "Combustion Chamber (Hot Section)",
                failedComponent = "Combustor Liner",
                subComponent = "Sector 3-4 Dilution Hole Edge",
                faultMode = "Thermal Fatigue Cracking (3-inch longitudinal)"
            });

            FaultReportMessage reportMsg = new FaultReportMessage
            {
                @event = "fault_report",
                client_id = this.clientId,
                request_id = "test_fault_" + System.Guid.NewGuid().ToString().Substring(0, 8),
                payload = new FaultReportPayload
                {
                    mainProduct = "Siemens SGT-400 Industrial Gas Turbine",
                    faultDetails = details
                }
            };

            SendJson(JsonUtility.ToJson(reportMsg));
        }
    }
}
