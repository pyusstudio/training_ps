import React, { useEffect, useState, useRef } from 'react';
import { getWsUrl } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Terminal, MessageSquare, Zap, Award, BarChart3, User, CheckCircle, AlertTriangle } from 'lucide-react';

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
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

// ─── Individual event renderers ───────────────────────────────────────────────

function SessionStartedCard({ p }: { p: Record<string, any> }) {
  return (
    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
        <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Session Activated</p>
        <p className="text-xs text-slate-600 mt-0.5 font-medium">
          Node: <span className="text-slate-900 font-mono font-bold">#{p.session_id.split('-')[0].toUpperCase()}</span>
          {p.user_id && <> · Subject: <span className="text-slate-900 font-mono font-bold">{p.user_id}</span></>}
        </p>
      </div>
    </div>
  );
}

function RoleplayCard({ p }: { p: Record<string, any> }) {
  const isClient = p.speaker === 'client';
  return (
    <div className="text-sm flex flex-col gap-1.5">
      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isClient ? 'text-indigo-600' : 'text-slate-500'}`}>
        {isClient
          ? <><MessageSquare className="w-3.5 h-3.5" /> AI Agent</>
          : <><User className="w-3.5 h-3.5" /> User</>}
      </span>
      <div className={`p-4 rounded-xl text-slate-700 leading-relaxed font-semibold border ${isClient ? 'bg-indigo-50 border-indigo-100 rounded-tl-none' : 'bg-slate-50 border-slate-200 rounded-tr-none ml-4'}`}>
        {p.transcript || <span className="text-slate-400 italic font-medium">— No content —</span>}
      </div>
    </div>
  );
}

function ScoreCard({ p }: { p: Record<string, any> }) {
  const sc = p.score as number | null;
  const keywords: string[] = p.keywords_detected || [];
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Analysis
        </span>
        <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 border border-slate-100 ${scoreBg(sc)}`}>
          {sc != null ? `${sc}%` : '—'}
        </div>
      </div>
      {p.intent_category && (
        <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg inline-flex items-center gap-1.5 uppercase tracking-wider">
          <Zap className="w-3 h-3" /> {p.intent_category}
        </div>
      )}
      {p.feedback && (
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed border-l-2 border-slate-100 pl-3 italic">"{p.feedback}"</p>
      )}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {keywords.map((kw, i) => (
            <span key={i} className="text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded uppercase tracking-tight">
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
    <div className="rounded-xl bg-white border border-slate-200 p-4 grid grid-cols-3 gap-2 text-center shadow-sm">
      <div className="flex flex-col">
        <span className="text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-widest">Total</span>
        <strong className={`text-lg font-bold ${scoreBg(p.total_score)}`}>{p.total_score ?? '—'}</strong>
      </div>
      <div className="flex flex-col border-x border-slate-100">
        <span className="text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-widest">Average</span>
        <strong className="text-indigo-600 text-lg font-bold">{p.avg_score ?? '—'}</strong>
      </div>
      <div className="flex flex-col">
        <span className="text-slate-400 text-[9px] uppercase font-bold mb-1 tracking-widest">Score</span>
        <strong className="text-cyan-600 text-lg font-bold">{p.accuracy_percentage != null ? `${p.accuracy_percentage}%` : '—'}</strong>
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
    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-indigo-600 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
          <Award className="w-4 h-4" /> Performance Review
        </span>
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-indigo-100 shadow-sm">
          <span className={`text-xs font-bold ${scoreBg(score * 10)}`}>{score}</span>
        </div>
      </div>

      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid grid-cols-1 gap-3">
          {strengths.slice(0, 2).map((s, i) => (
            <div key={i} className="flex gap-3 text-[11px] font-semibold items-start">
              <CheckCircle className="text-emerald-500 w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="text-slate-700 leading-snug">{s}</span>
            </div>
          ))}
          {improvements.slice(0, 2).map((s, i) => (
            <div key={i} className="flex gap-3 text-[11px] font-semibold items-start">
              <AlertTriangle className="text-amber-500 w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="text-slate-700 leading-snug">{s}</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(detailed).length > 0 && (
        <div className="pt-3 border-t border-indigo-100 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/70">Breakdown Output</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(detailed).slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-2 border-b border-indigo-100/50 pb-1">
                <span className="text-[10px] text-slate-500 font-bold capitalize truncate">{key.split('_')[0]}</span>
                {typeof val === 'number'
                  ? <span className={`text-[10px] font-black ${scoreBg(val * 10)}`}>{val}</span>
                  : <span className="text-[10px] font-black text-slate-700">{String(val)}</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Event type meta (label + icon colour) ────────────────────────────────────
const EVENT_META: Record<string, { label: string; color: string }> = {
  session_started:  { label: 'Session Started',           color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
  roleplay_event:   { label: 'Conversation',              color: 'text-cyan-600 bg-cyan-50 border border-cyan-100'      },
  score_event:      { label: 'Analysis',                  color: 'text-amber-600 bg-amber-50 border border-amber-100'  },
  session_summary:  { label: 'Analytics',                 color: 'text-purple-600 bg-purple-50 border border-purple-100'},
  session_rating:   { label: 'Review',                    color: 'text-indigo-600 bg-indigo-50 border border-indigo-100'},
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
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative w-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white z-10 w-full">
        <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2.5">
          <Terminal className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          Live Activity
        </h2>
        <div className={`px-2 py-1 rounded-full border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${connected ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          {connected ? 'Syncing' : 'Offline'}
        </div>
      </div>

      {/* Feed */}
      <div ref={containerRef} className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-6 space-y-5 font-sans z-10 custom-scrollbar w-full">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 text-slate-400 py-20">
            <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center border border-slate-100 mb-2">
              <Radio className="w-8 h-8 opacity-20" />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] font-black text-slate-900">Awaiting Signal</p>
              <p className="text-[11px] font-bold text-slate-400">Initialize a training session to begin capture.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const meta = EVENT_META[e.type];
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-lg border border-slate-100 p-4 shadow-sm hover:border-indigo-100 transition-colors group"
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                    <span className={`text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-lg ${meta?.color ?? 'text-indigo-600 bg-indigo-50 border border-indigo-100'}`}>
                      {meta?.label ?? e.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">
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
                      <div className="relative">
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-100 text-[8px] font-black text-slate-500 uppercase tracking-widest">Raw Data</div>
                        <pre className="whitespace-pre-wrap break-all text-[10px] font-mono text-slate-500 font-medium p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-x-auto">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </div>
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
