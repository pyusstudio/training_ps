import React, { useState } from "react";
import { RoleplayEvent, SessionDetail, generateSessionRating } from "../lib/api";
import { useAuth } from "../state/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock, Target, ShieldCheck, AlertCircle, MessageSquare, Play, FastForward, CheckCircle2, User, Bot, Loader2 } from "lucide-react";

type Props = {
  detail: SessionDetail | null;
  onRefresh?: () => void;
};

export function SessionDetailPanel({ detail, onRefresh }: Props) {
  const { token } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!detail) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center rounded-[2rem] bg-slate-900/40 backdrop-blur-md border border-white/5 shadow-inner">
        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-white/5">
          <Activity className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-300">Awaiting Selection</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-xs text-center">Select a session from the telemetry table to review detailed analytics.</p>
      </div>
    );
  }

  const { id, source, started_at, duration_seconds, total_score, avg_score, accuracy_percentage, events, ai_rating_json } = detail;

  let rating: any = null;
  if (ai_rating_json) {
    try {
      rating = typeof ai_rating_json === 'string' ? JSON.parse(ai_rating_json) : ai_rating_json;
    } catch (e) {
      console.error("Failed to parse rating JSON", e);
    }
  }

  const handleGenerateRating = async () => {
    if (!token) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      await generateSessionRating(token, id);
      setTimeout(() => {
        if (onRefresh) onRefresh();
        else window.location.reload();
      }, 500);
    } catch (e: any) {
      setGenerationError(e.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const shortId = id.split('-')[0].toUpperCase();

  return (
    <div className="rounded-[2rem] border border-white/5 bg-slate-900/40 backdrop-blur-xl flex flex-col overflow-hidden h-full shadow-2xl relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER */}
      <div className="px-8 py-6 border-b border-white/5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-3 drop-shadow-md">
            Review Protocol
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg shadow-sm">ID: {shortId}</span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-4 md:gap-8 text-sm bg-black/30 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center">
              <FastForward className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Source</span>
              <span className="font-bold text-slate-200 leading-none uppercase">{source}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Time</span>
              <span className="font-bold text-slate-200 leading-none">{new Date(started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center">
              <Play className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Duration</span>
              <span className="font-mono font-bold text-cyan-400 leading-none">
                {duration_seconds != null
                  ? `${Math.floor(duration_seconds / 60)}:${(duration_seconds % 60).toString().padStart(2, '0')}`
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 z-10 custom-scrollbar">

        {/* METRICS GRID */}
        {total_score !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-4 md:gap-6"
          >
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform"><Activity className="w-16 h-16 text-emerald-500" /></div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Total Score</div>
              <div className="text-3xl font-black text-white">{total_score}</div>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform"><Target className="w-16 h-16 text-cyan-500" /></div>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2">Avg Quality</div>
              <div className="text-3xl font-black text-white">{avg_score}</div>
            </div>
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle2 className="w-16 h-16 text-purple-500" /></div>
              <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Hit Rate</div>
              <div className="text-3xl font-black text-white">{accuracy_percentage}%</div>
            </div>
          </motion.div>
        )}

        {/* RATING CARD */}
        <AnimatePresence mode="wait">
          {rating ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border border-indigo-500/30 p-8 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                <div>
                  <h3 className="text-xl font-black text-white mb-1">AI Assessor Synthesis</h3>
                  <p className="text-sm font-medium text-indigo-300/80">Automated performance evaluation generated post-session.</p>
                </div>
                <div className="flex items-center justify-center bg-black/40 rounded-2xl px-6 py-4 border border-indigo-500/40 shadow-inner">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Mastery</span>
                    <div>
                      <span className="font-black text-3xl text-white drop-shadow-md">{rating.overall_score}</span>
                      <span className="text-sm font-bold text-indigo-400/60 ml-0.5">/10</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/30 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm shadow-inner">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center"><ShieldCheck className="w-3.5 h-3.5" /></div>
                    Tactical Dominance
                  </span>
                  <div className="space-y-3">
                    {rating.strengths?.map((s: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start group">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                        <span className="text-slate-300 font-medium text-sm leading-relaxed">{s}</span>
                      </div>
                    )) || <span className="text-slate-500 italic text-sm">No significant strengths detected.</span>}
                  </div>
                </div>
                <div className="bg-black/30 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm shadow-inner">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center"><AlertCircle className="w-3.5 h-3.5" /></div>
                    Strategic Gaps
                  </span>
                  <div className="space-y-3">
                    {rating.improvements?.map((s: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start group">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                        <span className="text-slate-300 font-medium text-sm leading-relaxed">{s}</span>
                      </div>
                    )) || <span className="text-slate-500 italic text-sm">No major improvements flagged.</span>}
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-indigo-500/5 rounded-2xl p-6 border border-indigo-500/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 block">Direct Feedback</span>
                <p className="text-base font-medium italic text-slate-200 leading-relaxed border-l-2 border-indigo-500/50 pl-4">
                  "{rating.detailed_feedback}"
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-slate-700 rounded-3xl bg-black/20"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Evaluation Pending</h3>
              <p className="text-sm font-medium text-slate-400 mb-8 max-w-sm text-center">Execute the AI assessor protocol to synthesize performance metrics and generate actionable feedback.</p>

              <AnimatePresence>
                {generationError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-bold text-red-400 mb-6 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {generationError}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleGenerateRating}
                disabled={isGenerating || events.length === 0}
                className="group relative bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black px-8 py-4 rounded-xl flex items-center gap-3 transition-all shadow-[0_10px_20px_rgba(79,70,229,0.2)] hover:scale-105 active:scale-95 disabled:hover:scale-100 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-3">
                  {isGenerating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Synthesizing Data...</>
                  ) : (
                    <><Activity className="w-5 h-5" /> Initialize AI Assessor</>
                  )}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TRANSCRIPT */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Complete Decrypt
            </h3>
            <span className="text-xs font-bold text-slate-500">{events.length} Messages</span>
          </div>

          <div className="space-y-6">
            {events.length === 0 ? (
              <div className="text-center py-8 border border-white/5 rounded-2xl bg-black/20">
                <p className="text-sm font-medium text-slate-500">No transmissions recorded yet.</p>
              </div>
            ) : (
              events.map((e, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: e.speaker === 'client' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={e.id}
                  className={`flex ${e.speaker === 'client' ? 'justify-start' : 'justify-end'} w-full`}
                >
                  <div className={`flex gap-4 max-w-[85%] ${e.speaker === 'salesperson' ? 'flex-row-reverse' : ''}`}>
                    <div className={`shrink-0 mt-auto w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border ${e.speaker === 'client'
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-800 border-cyan-400/30'
                      : 'bg-emerald-500 border-emerald-400/50'
                      }`}>
                      {e.speaker === 'client' ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-black" />}
                    </div>

                    <div className={`flex flex-col gap-2 ${e.speaker === 'salesperson' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-6 py-4 rounded-3xl shadow-xl border backdrop-blur-md ${e.speaker === 'client'
                        ? 'bg-slate-900/80 border-white/10 rounded-bl-sm text-white'
                        : 'bg-emerald-600/90 border-emerald-500/50 rounded-br-sm text-white'
                        }`}>
                        <p className="text-sm md:text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{e.transcript || <span className="opacity-50 italic">Empty transmission</span>}</p>
                      </div>

                      <div className={`flex items-center gap-3 ${e.speaker === 'salesperson' ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracing-wider">
                          {e.speaker === "client" ? "Customer" : "Trainee"}
                        </span>

                        {e.score !== null && (
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${e.score >= 80
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : e.score >= 60
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                            Score: {e.score}
                            {e.intent_category && <span className="opacity-75 font-medium ml-1">| {e.intent_category}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
