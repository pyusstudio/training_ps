import React, { useEffect, useState } from 'react';
import { getWsUrl } from '../lib/api';

type LiveEvent = {
  ts: number;
  type: string;
  payload: unknown;
};

type Props = {
  token: string;
};

export function LiveFeedPanel({ token }: Props) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const url = `${getWsUrl()}?role=admin&token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          payload?: unknown;
        };
        if (data.type === 'broadcast_event') {
          setEvents((prev) => {
            const next = [
              {
                ts: Date.now(),
                type: (data.payload as any)?.event ?? 'broadcast_event',
                payload: data.payload
              },
              ...prev
            ].slice(0, 50);
            return next;
          });
        }
      } catch {
        // Ignore parse errors for PoC
      }
    };

    return () => {
      ws?.close();
      ws = null;
    };
  }, [token]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-200">Live Feed</h2>
        <span
          className={`inline-flex items-center gap-1 text-xs ${connected ? 'text-reflex-green' : 'text-neutral-500'
            }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-reflex-green' : 'bg-neutral-600'
              }`}
          />
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 text-xs font-mono text-neutral-300 space-y-1">
        {events.length === 0 ? (
          <div className="text-neutral-500">
            Waiting for session events from Unity or training app…
          </div>
        ) : (
          events.map((e) => (
            <div key={e.ts} className="border-b border-neutral-900 pb-1 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{e.type}</span>
                <span className="text-neutral-500">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1">
                {e.type === 'session_rating' ? (
                  <div className="rounded bg-indigo-950/30 p-2 border border-indigo-500/20 text-indigo-300">
                    <div className="font-semibold text-indigo-400 mb-1">AI Rating: {(e.payload as any)?.overall_score}/10</div>
                    <div className="text-[10px] space-y-1">
                      <div><span className="text-emerald-400">+]</span> {((e.payload as any)?.strengths || []).join(', ')}</div>
                      <div><span className="text-amber-400">-]</span> {((e.payload as any)?.improvements || []).join(', ')}</div>
                      <div className="italic mt-1 text-indigo-400/80">"{(e.payload as any)?.detailed_feedback}"</div>
                    </div>
                  </div>
                ) : e.type === 'session_summary' ? (
                  <div className="rounded bg-neutral-900/50 p-2 flex gap-3">
                    <span>Total: <strong className="text-emerald-400">{(e.payload as any)?.total_score}</strong></span>
                    <span>Avg: <strong className="text-sky-400">{(e.payload as any)?.avg_score}</strong></span>
                    <span>Acc: <strong className="text-purple-400">{(e.payload as any)?.accuracy_percentage}%</strong></span>
                  </div>
                ) : e.type === 'roleplay_event' ? (
                  <div className="text-neutral-400 flex flex-col">
                    <span className={(e.payload as any).speaker === 'client' ? 'text-sky-400' : 'text-emerald-400'}>
                      {(e.payload as any).speaker === 'client' ? 'Client:' : 'Salesperson:'}
                    </span>
                    <span className="pl-2">&gt; {(e.payload as any).transcript}</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-all text-neutral-500">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


