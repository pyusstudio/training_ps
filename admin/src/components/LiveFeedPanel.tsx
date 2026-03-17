import React, { useEffect, useState, useRef } from 'react';
import { getWsUrl } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Terminal, MessageSquare, Zap, Award, BarChart3, User, CheckCircle } from 'lucide-react';

type LiveEvent = {
  ts: number;
  id: string;
  type: string;
  payload: Record<string, any>;
};

type Props = {
  token: string;
};

let _idCounter = 0;
function nextId() { return `ev-${++_idCounter}`; }

// ─── Score badge colours ──────────────────────────────────────────────────────
function scoreBg(score: number | undefined | null) {
  if (score == null) return 'text-slate-400';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

// ─── Individual event renderers ───────────────────────────────────────────────

function SessionStartedCard({ p }: { p: Record<string, any> }) {
  return (
    <div className="rounded-lg bg-violet-900/30 border border-violet-500/20 p-3 flex items-center gap-3">
      <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Session Live</p>
        <p className="text-xs text-slate-300 mt-0.5">
          ID: <span className="text-white font-mono">{p.session_id}</span>
          {p.user_id && <> · User: <span className="text-white font-mono">{p.user_id}</span></>}
        </p>
      </div>
    </div>
  );
}

function RoleplayCard({ p }: { p: Record<string, any> }) {
  const isClient = p.speaker === 'client';
  return (
    <div className="text-sm flex flex-col gap-1.5">
      <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isClient ? 'text-sky-400' : 'text-emerald-400'}`}>
        {isClient
          ? <><MessageSquare className="w-3 h-3" /> AI Client</>
          : <><User className="w-3 h-3" /> Salesperson</>}
      </span>
      <span className={`text-slate-300 leading-relaxed font-sans font-medium pl-4 border-l-2 ${isClient ? 'border-sky-500/40' : 'border-emerald-500/40'}`}>
        {p.transcript || <span className="text-slate-500 italic">—</span>}
      </span>
    </div>
  );
}

function ScoreCard({ p }: { p: Record<string, any> }) {
  const sc = p.score as number | null;
  const keywords: string[] = p.keywords_detected || [];
  return (
    <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Score
        </span>
        <span className={`text-lg font-black ${scoreBg(sc)}`}>{sc ?? '—'}</span>
      </div>
      {p.intent_category && (
        <p className="text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded inline-block uppercase tracking-wider">
          {p.intent_category}
        </p>
      )}
      {p.sentiment && (
        <p className="text-[10px] text-slate-400">Sentiment: <span className="text-slate-200">{p.sentiment}</span></p>
      )}
      {p.feedback && (
        <p className="text-[10px] text-slate-300 leading-relaxed">{p.feedback}</p>
      )}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {keywords.map((kw, i) => (
            <span key={i} className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ p }: { p: Record<string, any> }) {
  return (
    <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3 grid grid-cols-3 gap-2 text-center">
      <div className="flex flex-col">
        <span className="text-slate-500 text-[9px] uppercase font-bold mb-1">Total</span>
        <strong className={`text-base ${scoreBg(p.total_score)}`}>{p.total_score ?? '—'}</strong>
      </div>
      <div className="flex flex-col border-x border-white/10">
        <span className="text-slate-500 text-[9px] uppercase font-bold mb-1">Avg</span>
        <strong className="text-sky-400 text-base">{p.avg_score ?? '—'}</strong>
      </div>
      <div className="flex flex-col">
        <span className="text-slate-500 text-[9px] uppercase font-bold mb-1">Accuracy</span>
        <strong className="text-purple-400 text-base">{p.accuracy_percentage != null ? `${p.accuracy_percentage}%` : '—'}</strong>
      </div>
    </div>
  );
}

function RatingCard({ p }: { p: Record<string, any> }) {
  const score = p.overall_score as number;
  const strengths: string[] = p.strengths || [];
  const improvements: string[] = p.improvements || [];
  const detailed: Record<string, any> = p.detailed_feedback || {};

  return (
    <div className="rounded-lg bg-indigo-900/20 border border-indigo-500/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" /> Final Evaluation
        </span>
        <span className={`text-lg font-black ${scoreBg(score * 10)}`}>{score}/10</span>
      </div>

      {strengths.length > 0 && (
        <div className="space-y-1">
          {strengths.map((s, i) => (
            <div key={i} className="flex gap-2 text-[10px]">
              <span className="text-emerald-400 font-black shrink-0">[+]</span>
              <span className="text-slate-300">{s}</span>
            </div>
          ))}
        </div>
      )}

      {improvements.length > 0 && (
        <div className="space-y-1">
          {improvements.map((s, i) => (
            <div key={i} className="flex gap-2 text-[10px]">
              <span className="text-amber-400 font-black shrink-0">[-]</span>
              <span className="text-slate-300">{s}</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(detailed).length > 0 && (
        <div className="pt-1 border-t border-white/5 space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Detail Breakdown</p>
          {Object.entries(detailed).map(([key, val]) => (
            <div key={key} className="flex items-start justify-between gap-2">
              <span className="text-[10px] text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
              {typeof val === 'number'
                ? <span className={`text-[10px] font-black ${scoreBg(val * 10)}`}>{val}/10</span>
                : <span className="text-[10px] text-slate-300 text-right">{String(val)}</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Event type meta (label + icon colour) ────────────────────────────────────
const EVENT_META: Record<string, { label: string; color: string }> = {
  session_started:  { label: 'Session Started',   color: 'text-violet-400 bg-violet-500/10' },
  roleplay_event:   { label: 'Conversation',       color: 'text-sky-400 bg-sky-500/10'      },
  score_event:      { label: 'Score',              color: 'text-amber-400 bg-amber-500/10'  },
  session_summary:  { label: 'Summary',            color: 'text-purple-400 bg-purple-500/10'},
  session_rating:   { label: 'Rating',             color: 'text-indigo-400 bg-indigo-500/10'},
};

// ─── Main component ───────────────────────────────────────────────────────────
export function LiveFeedPanel({ token }: Props) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;

    const url = `${getWsUrl()}?role=admin&token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = new WebSocket(url);

    ws.onopen  = () => setConnected(true);
    ws.onclose = (ev) => {
      setConnected(false);
      // 1008 = Policy Violation (token rejected / expired)
      if (ev.code === 1008) {
        window.dispatchEvent(new CustomEvent("sessionExpired"));
      }
    };
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as { type: string; payload?: Record<string, any> };
        if (data.type === 'broadcast_event' && data.payload) {
          const evType = data.payload.event ?? 'broadcast_event';
          setEvents(prev =>
            [{ ts: Date.now(), id: nextId(), type: evType, payload: data.payload! }, ...prev].slice(0, 100)
          );
        }
      } catch {
        // ignore
      }
    };

    return () => { ws?.close(); ws = null; };
  }, [token]);

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative w-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
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

      {/* Feed */}
      <div ref={containerRef} className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-6 py-4 space-y-4 font-mono z-10 custom-scrollbar w-full">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-slate-500">
            <Radio className="w-10 h-10 opacity-20" />
            <p className="text-xs uppercase tracking-widest font-semibold">Awaiting transmission...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const meta = EVENT_META[e.type];
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  className="bg-black/40 rounded-xl border border-white/5 p-4 overflow-hidden shadow-sm"
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${meta?.color ?? 'text-cyan-400 bg-cyan-500/10'}`}>
                      {meta?.label ?? e.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date(e.ts).toISOString().split('T')[1].slice(0, 8)}
                    </span>
                  </div>

                  {/* Type-specific content */}
                  <div className="mt-1">
                    {e.type === 'session_started' && <SessionStartedCard p={e.payload} />}
                    {e.type === 'roleplay_event'  && <RoleplayCard p={e.payload} />}
                    {e.type === 'score_event'     && <ScoreCard p={e.payload} />}
                    {e.type === 'session_summary' && <SummaryCard p={e.payload} />}
                    {e.type === 'session_rating'  && <RatingCard p={e.payload} />}
                    {!['session_started','roleplay_event','score_event','session_summary','session_rating'].includes(e.type) && (
                      <pre className="whitespace-pre-wrap break-all text-[10px] text-slate-400/70 p-2 bg-black/50 rounded overflow-x-auto">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
