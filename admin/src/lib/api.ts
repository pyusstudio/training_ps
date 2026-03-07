const API_BASE =
  (import.meta as any).env.VITE_BACKEND_URL ?? "http://localhost:8000";

export type SessionRow = {
  id: string;
  user_id: string | null;
  source: string;
  scenario: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_score: number | null;
  avg_score: number | null;
  accuracy_percentage: number | null;
};

export type RoleplayEvent = {
  id: string;
  step_id: number;
  question_id: string | null;
  speaker: string;
  transcript: string | null;
  intent_category: string | null;
  score: number | null;
  reaction_time_ms: number | null;
  features_json: Record<string, unknown> | null;
};

export type SessionDetail = {
  id: string;
  source: string;
  scenario: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_score: number | null;
  avg_score: number | null;
  accuracy_percentage: number | null;
  ai_rating_json: any | null;
  events: RoleplayEvent[];
};

export async function login(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function fetchSessions(token: string): Promise<SessionRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error("Failed to load sessions");
  }
  return (await res.json()) as SessionRow[];
}

export async function fetchSessionDetail(
  token: string,
  id: string
): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/api/admin/sessions/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error("Failed to load session detail");
  }
  return (await res.json()) as SessionDetail;
}

export async function generateSessionRating(
  token: string,
  id: string
): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/api/admin/sessions/${id}/rate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error("Failed to generate session rating");
  }
  return (await res.json()) as SessionDetail;
}

export function getWsUrl(): string {
  const configured = (import.meta as any).env.VITE_BACKEND_WS_URL as
    | string
    | undefined;
  if (configured) return configured;
  return "ws://localhost:8000/ws";
}

