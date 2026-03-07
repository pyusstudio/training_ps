import React, { useEffect, useState } from "react";
import {
  fetchSessionDetail,
  fetchSessions,
  SessionDetail,
  SessionRow
} from "../lib/api";
import { useAuth } from "../state/authStore";
import { SessionTable } from "../components/SessionTable";
import { LiveFeedPanel } from "../components/LiveFeedPanel";
import { SessionDetailPanel } from "./SessionDetail";

export function DashboardPage() {
  const { token, setToken } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSessions(token)
      .then((rows) => {
        if (cancelled) return;
        setSessions(rows);
        if (rows.length > 0 && !selectedId) {
          setSelectedId(rows[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load sessions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    fetchSessionDetail(token, selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load session detail.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-black via-slate-950 to-black text-zinc-50">
      <header className="border-b border-zinc-900 bg-black/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-zinc-500 uppercase">
              Reflex Training
            </p>
            <h1 className="text-lg font-semibold text-zinc-50">
              Live session dashboard
            </h1>
          </div>
          <button
            onClick={() => setToken(null)}
            className="text-xs text-zinc-400 hover:text-zinc-100 border border-zinc-700 rounded-full px-3 py-1"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 space-y-4">
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <SessionTable
              sessions={sessions}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {loading && (
              <p className="text-xs text-zinc-500">
                Loading sessions from backend…
              </p>
            )}
            <SessionDetailPanel
              detail={detail}
              onRefresh={() => {
                if (token && selectedId) {
                  fetchSessionDetail(token, selectedId).then(setDetail).catch(e => setError(e.message));
                  fetchSessions(token).then(setSessions).catch(e => console.error(e));
                }
              }}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <LiveFeedPanel token={token} />
          </div>
        </div>
      </main>
    </div>
  );
}
