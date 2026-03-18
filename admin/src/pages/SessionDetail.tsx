import React, { useEffect, useState } from "react";
import {
  fetchSessionDetail,
  generateSessionRating,
  SessionDetail,
  RoleplayEvent
} from "../lib/api";
import { useAuth } from "../state/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Clock, Target, Hash, User, MessageSquare, 
  ChevronRight, Brain, Zap, AlertTriangle, CheckCircle, 
  RotateCw, Terminal, ArrowRight, Star
} from "lucide-react";
 
const formatLabel = (label: string) => {
  if (typeof label !== 'string') return label;
  return label
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

type Props = {
  sessionId: string | null;
  onClose: () => void;
};

const MarkdownText = ({ content }: { content: string }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-4 text-slate-300 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return <h4 key={i} className="text-violet-400 font-black uppercase tracking-widest text-[10px] mt-8 mb-4 border-b border-white/5 pb-2">{trimmed.replace(/^###\s+/, '')}</h4>;
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const parts = trimmed.replace(/^[\*\-]\s+/, '').split('**');
          return (
            <div key={i} className="flex gap-3 items-start pl-4">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0" />
              <p className="text-sm">{parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-white font-bold">{part}</strong> : part)}</p>
            </div>
          );
        }
        if (trimmed === '') return <div key={i} className="h-2" />;
        const parts = line.split('**');
        return <p key={i} className="text-sm">{parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-white font-bold">{part}</strong> : part)}</p>;
      })}
    </div>
  );
};

export function SessionDetailModal({ sessionId, onClose }: Props) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    if (sessionId && token) {
      loadDetail();
    } else {
      setDetail(null);
    }
  }, [sessionId, token]);

  const loadDetail = async () => {
    if (!sessionId || !token) return;
    setLoading(true);
    try {
      const res = await fetchSessionDetail(token, sessionId);
      setDetail(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runRating = async () => {
    if (!sessionId || !token) return;
    setRatingLoading(true);
    try {
      const res = await generateSessionRating(token, sessionId);
      setDetail(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRatingLoading(false);
    }
  };

  if (!sessionId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal/Drawer Content */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full max-w-[900px] h-full bg-[#06091A] border-l border-white/10 shadow-[-50px_0_100px_rgba(0,0,0,0.5)] flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-6">
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-black tracking-[0.3em] text-violet-500 uppercase">Telemetry Node</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${detail?.ended_at ? 'bg-slate-500/10 text-slate-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {detail?.ended_at ? 'ARCHIVED' : 'ACTIVE'}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Session <span className="text-slate-500 font-mono">#{sessionId.split('-')[0].toUpperCase()}</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button 
                onClick={runRating}
                disabled={ratingLoading || !detail}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 text-white text-xs font-black rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-95"
               >
                 {ratingLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                 {detail?.ai_rating_json ? "Regenerate AI Audit" : "Request AI Audit"}
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 animate-pulse">Decrypting data streams...</p>
              </div>
            ) : detail ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
                     <Clock className="w-5 h-5 text-cyan-400 mb-4" />
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Duration</p>
                     <h3 className="text-2xl font-black text-white">{detail.duration_seconds ? `${Math.floor(detail.duration_seconds / 60)}m ${detail.duration_seconds % 60}s` : "-"}</h3>
                   </div>
                   <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
                     <Target className="w-5 h-5 text-violet-400 mb-4" />
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Performance</p>
                     <h3 className="text-2xl font-black text-white">{detail.avg_score || 0}%</h3>
                   </div>
                   <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
                     <Star className="w-5 h-5 text-amber-400 mb-4" />
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Persona</p>
                     <h3 className="text-2xl font-black text-white capitalize">{detail.persona_id}</h3>
                   </div>
                </div>

                {/* AI Rating Section */}
                {detail.ai_rating_json && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-violet-600/20 to-cyan-600/10 border border-violet-500/30 rounded-[2.5rem] p-10 relative overflow-hidden"
                  >
                    <div className="absolute top-[-10%] right-[-10%] opacity-10 rotate-12">
                       <Brain className="w-40 h-40 text-violet-400" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
                          <Zap className="text-white w-6 h-6" />
                        </div>
                         <div>
                           <h3 className="text-xl font-black text-white">Qualitative Performance Audit</h3>
                           <p className="text-xs font-bold text-violet-300">Artificial Intelligence Analysis</p>
                         </div>
                         <div className="ml-auto flex flex-col items-center">
                            <span className="text-[10px] font-black text-violet-300 uppercase mb-1">Overall</span>
                            <span className="text-4xl font-black text-white">{detail.ai_rating_json.overall_score}</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                         <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                               <CheckCircle className="w-4 h-4" /> Tactical Strengths
                            </h4>
                            <ul className="space-y-3">
                               {detail.ai_rating_json.strengths.map((s: string, i: number) => (
                                 <li key={i} className="flex gap-4 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                                    <p className="text-sm font-medium text-slate-200 leading-relaxed">{formatLabel(s)}</p>
                                 </li>
                               ))}
                            </ul>
                         </div>
                         <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                               <AlertTriangle className="w-4 h-4" /> Critical Improvements
                            </h4>
                            <ul className="space-y-3">
                               {detail.ai_rating_json.improvements.map((s: string, i: number) => (
                                 <li key={i} className="flex gap-4 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                                    <p className="text-sm font-medium text-slate-200 leading-relaxed">{formatLabel(s)}</p>
                                 </li>
                               ))}
                            </ul>
                         </div>
                      </div>

                      <div className="mt-10 pt-10 border-t border-white/10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Strategic Feedback Analysis</h4>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-8">
                          {typeof detail.ai_rating_json.detailed_feedback === 'object' ? (
                            <div className="grid grid-cols-1 gap-8">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {detail.ai_rating_json.detailed_feedback.customer_engagement && (
                                  <div className="space-y-3">
                                    <h5 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Rapport & Engagement</h5>
                                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{detail.ai_rating_json.detailed_feedback.customer_engagement}</p>
                                  </div>
                                )}
                                {detail.ai_rating_json.detailed_feedback.needs_assessment_and_pitch && (
                                  <div className="space-y-3">
                                    <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Assessment & Pitch</h5>
                                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{detail.ai_rating_json.detailed_feedback.needs_assessment_and_pitch}</p>
                                  </div>
                                )}
                                {detail.ai_rating_json.detailed_feedback.objection_handling_and_closing && (
                                  <div className="space-y-3">
                                    <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Closing Strategy</h5>
                                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{detail.ai_rating_json.detailed_feedback.objection_handling_and_closing}</p>
                                  </div>
                                )}
                              </div>
                              
                              {detail.ai_rating_json.performance_debrief && (
                                <div className="pt-8 border-t border-white/5">
                                  <h5 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-4">Advanced Performance Debrief Narrative</h5>
                                  <div className="bg-black/20 p-8 rounded-2xl border border-white/5">
                                    <MarkdownText content={detail.ai_rating_json.performance_debrief} />
                                  </div>
                                </div>
                              )}

                              {detail.ai_rating_json.detailed_feedback.areas_for_improvement && Array.isArray(detail.ai_rating_json.detailed_feedback.areas_for_improvement) && detail.ai_rating_json.detailed_feedback.areas_for_improvement.length > 0 && (
                                <div className="pt-8 border-t border-white/5">
                                  <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4">Tactical Coaching Roadmap</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Array.isArray(detail.ai_rating_json.detailed_feedback.areas_for_improvement) && detail.ai_rating_json.detailed_feedback.areas_for_improvement.map((point: string, i: number) => (
                                      <div key={i} className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                        <p className="text-xs font-semibold text-slate-400">{point}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-slate-300 italic leading-[1.8] text-center">
                              "{detail.ai_rating_json.detailed_feedback}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Transcript */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      Interaction Log
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{detail.events.length} TRANSMISSIONS</span>
                  </div>

                  <div className="space-y-8">
                    {detail.events.map((e, idx) => {
                      const isClient = e.speaker === "client";
                      return (
                        <div 
                          key={e.id}
                          className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[80%] flex items-start gap-4 ${isClient ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border transition-all duration-500 ${isClient ? 'bg-violet-600/20 border-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.1)]' : 'bg-cyan-600/20 border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]'}`}>
                              {isClient ? <Zap className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>
                            <div className="space-y-2">
                              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                {e.speaker === "client" ? "AI PERSONA" : "SALESPERSON"} • STEP {e.step_id}
                              </span>
                              <div className={`p-6 rounded-[2rem] text-sm font-medium leading-relaxed border ${isClient ? 'bg-white/5 border-white/10 text-slate-100 rounded-tl-none' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.05)] rounded-tr-none'}`}>
                                {e.transcript}
                              </div>
                              {!isClient && e.score != null && (
                                <div className="flex items-center gap-4 mt-2 px-1">
                                   <div className="flex items-center gap-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${e.score >= 80 ? 'bg-emerald-400' : e.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} />
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Score {e.score}</span>
                                   </div>
                                   {e.intent_category && (
                                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter border border-white/5 px-2 py-0.5 rounded italic">
                                        \"{e.intent_category}\"
                                     </span>
                                   )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">Node identifier not found in primary storage.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
