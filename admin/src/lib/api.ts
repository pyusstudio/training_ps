const API_BASE =
  (import.meta as any).env.VITE_BACKEND_URL ?? "http://localhost:8000";

export type SessionRow = {
  id: string;
  source: string;
  scenario: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  avg_score: number | null;
  accuracy_percentage: number | null;
};

export type PaginatedSessions = {
  items: SessionRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export type RoleplayEvent = {
  id: string;
  step_id: number;
  speaker: string;
  transcript: string | null;
  intent_category: string | null;
  score: number | null;
  reaction_time_ms: number | null;
  features_json: Record<string, any> | null;
};

export type SessionDetail = {
  id: string;
  source: string;
  scenario: string | null;
  persona_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_score: number | null;
  avg_score: number | null;
  accuracy_percentage: number | null;
  ai_rating_json: any | null;
  events: RoleplayEvent[];
};

export type SystemQuestion = {
  id: string;
  text: string;
  tags: string | null;
  is_active: number;
  created_at: string;
};

export type PaginatedQuestions = {
  items: SystemQuestion[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

// ─── Central fetch wrapper ────────────────────────────────────────────────────
// Fires a global `sessionExpired` event on any 401 so the UI can react.
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("sessionExpired"));
  }
  return res;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function login(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Login failed");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function fetchSessions(
  token: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedSessions> {
  const res = await apiFetch(
    `${API_BASE}/api/admin/sessions?page=${page}&page_size=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to load sessions");
  return (await res.json()) as PaginatedSessions;
}

export async function fetchSessionDetail(
  token: string,
  id: string
): Promise<SessionDetail> {
  const res = await apiFetch(`${API_BASE}/api/admin/sessions/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to load session detail");
  return (await res.json()) as SessionDetail;
}

export async function generateSessionRating(
  token: string,
  id: string
): Promise<SessionDetail> {
  const res = await apiFetch(`${API_BASE}/api/admin/sessions/${id}/rate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to generate session rating");
  return (await res.json()) as SessionDetail;
}

// ─── Questions ────────────────────────────────────────────────────────────────
export async function fetchQuestions(
  token: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedQuestions> {
  const res = await apiFetch(
    `${API_BASE}/api/admin/questions/?page=${page}&page_size=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to load questions");
  return (await res.json()) as PaginatedQuestions;
}

export async function createQuestion(
  token: string,
  data: Partial<SystemQuestion>
): Promise<SystemQuestion> {
  const res = await apiFetch(`${API_BASE}/api/admin/questions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to create question");
  return (await res.json()) as SystemQuestion;
}

export async function updateQuestion(
  token: string,
  id: string,
  data: Partial<SystemQuestion>
): Promise<SystemQuestion> {
  const res = await apiFetch(`${API_BASE}/api/admin/questions/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to update question");
  return (await res.json()) as SystemQuestion;
}

export async function patchQuestion(
  token: string,
  id: string,
  data: Partial<SystemQuestion>
): Promise<SystemQuestion> {
  const res = await apiFetch(`${API_BASE}/api/admin/questions/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to update question status");
  return (await res.json()) as SystemQuestion;
}

export async function deleteQuestion(token: string, id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/admin/questions/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete question");
}

// ─── WebSocket URL ─────────────────────────────────────────────────────────────
export function getWsUrl(): string {
  const configured = (import.meta as any).env.VITE_BACKEND_WS_URL as
    | string
    | undefined;
  if (configured) return configured;
  return "ws://localhost:8000/ws";
}
