const WS_BASE =
  (import.meta as any).env.VITE_BACKEND_WS_URL ?? "ws://localhost:8000/ws";

export function createTrainingSocket(): WebSocket {
  const url = `${WS_BASE}?role=trainee`;
  return new WebSocket(url);
}

