import React, { useEffect, useState, useRef } from 'react';
import { getWsUrl } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, AlertCircle, MessageSquare, Terminal } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative w-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-black/40 z-10 w-full">
        <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 md:gap-3">
          <Terminal className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400 shrink-0" />
          Raw Telemetry
        </h2>
        <div className={`px-2 md:px-3 py-1 rounded-full border flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <Radio className={`w-3 h-3 ${connected ? 'animate-pulse' : ''}`} />
          {connected ? 'Live Feed' : 'Offline'}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-6 py-4 space-y-4 font-mono z-10 custom-scrollbar w-full">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-slate-500">
            <Radio className="w-10 h-10 opacity-20" />
            <p className="text-xs uppercase tracking-widest font-semibold">Awaiting transmission...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.div
                key={e.ts}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                className="bg-black/40 rounded-xl border border-white/5 p-4 overflow-hidden shadow-sm"
              >
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded">{e.type}</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {new Date(e.ts).toISOString().split('T')[1].slice(0, -1)}
                  </span>
                </div>

                <div className="mt-1">
                  {e.type === 'session_rating' ? (
                    <div className="rounded-lg bg-indigo-900/30 p-3 border border-indigo-500/20 text-indigo-200 text-xs">
                      <div className="font-bold text-indigo-400 mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Final Evaluation: {(e.payload as any)?.overall_score}/10
                      </div>
                      <div className="space-y-1.5 opacity-90">
                        <div className="flex gap-2"><span className="text-emerald-400 shrink-0 font-bold">[+]</span> <span className="truncate">{((e.payload as any)?.strengths || [])[0] || 'None'}</span></div>
                        <div className="flex gap-2"><span className="text-amber-400 shrink-0 font-bold">[-]</span> <span className="truncate">{((e.payload as any)?.improvements || [])[0] || 'None'}</span></div>
                      </div>
                    </div>
                  ) : e.type === 'session_summary' ? (
                    <div className="rounded-lg bg-slate-800/50 p-3 grid grid-cols-3 gap-2 text-center text-xs border border-white/5">
                      <div className="flex flex-col"><span className="text-slate-500 text-[9px] uppercase">Score</span><strong className="text-emerald-400 text-sm">{(e.payload as any)?.total_score}</strong></div>
                      <div className="flex flex-col border-x border-white/10"><span className="text-slate-500 text-[9px] uppercase">Avg</span><strong className="text-sky-400 text-sm">{(e.payload as any)?.avg_score}</strong></div>
                      <div className="flex flex-col"><span className="text-slate-500 text-[9px] uppercase">Accuracy</span><strong className="text-purple-400 text-sm">{(e.payload as any)?.accuracy_percentage}%</strong></div>
                    </div>
                  ) : e.type === 'roleplay_event' ? (
                    <div className="text-sm flex flex-col gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${(e.payload as any).speaker === 'client' ? 'text-sky-400' : 'text-emerald-400'}`}>
                        {(e.payload as any).speaker === 'client' ? <><MessageSquare className="w-3 h-3" /> Client</> : <><User className="w-3 h-3" /> Salesperson</>}
                      </span>
                      <span className="text-slate-300 leading-relaxed font-sans font-medium pl-4 border-l-2 border-slate-700/50">{(e.payload as any).transcript}</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-all text-[10px] text-slate-400/70 p-2 bg-black/50 rounded overflow-x-auto">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Helper icons
function Award(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M16 18c1.5-1.5 2.5-3.5 2.5-6s-1-4.5-2.5-6" /><path d="M8 18c-1.5-1.5-2.5-3.5-2.5-6s1-4.5 2.5-6" /></svg>
}
function User(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
