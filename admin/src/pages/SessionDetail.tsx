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
    <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        
        // Handle headers (# 1., ## Section, ### Details)
        if (trimmed.startsWith('#')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={i} className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px] mt-10 mb-4 border-b border-slate-100 pb-3 leading-none bg-white/50 backdrop-blur-sm sticky top-0 py-2 z-10">
              {headerText}
            </h4>
          );
        }

        // Handle numbered items that look like section headers (e.g. "1. Executive Summary")
        if (/^\d+\.\s+[A-Z\s]+$/.test(trimmed) || (/^\d+\.\s+/.test(trimmed) && trimmed.length < 50)) {
           return (
            <h4 key={i} className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px] mt-10 mb-4 border-b border-slate-100 pb-3 leading-none italic">
              {trimmed}
            </h4>
          );
        }

        // Handle bullet points
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.replace(/^[\*\-]\s+/, '');
          const parts = content.split('**');
          return (
            <div key={i} className="flex gap-4 items-start pl-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0 shadow-sm shadow-indigo-200" />
              <p className="text-[13px]">{parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-slate-900 font-black">{part}</strong> : part)}</p>
            </div>
          );
        }

        if (trimmed === '') return <div key={i} className="h-2" />;

        // Handle standard paragraphs with bold text
        const parts = line.split('**');
        return (
          <p key={i} className="text-[13px] leading-relaxed">
            {parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-slate-900 font-black">{part}</strong> : part)}
          </p>
        );
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
    
    // Safety check if rating already exists
    if (detail?.ai_rating_json) {
      const ok = window.confirm("This will replace the existing review with a new AI analysis. Are you sure?");
      if (!ok) return;
    }

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
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal/Drawer Content */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          className="relative w-full max-w-[900px] h-full bg-white border-l border-slate-200 shadow-[-40px_0_80px_rgba(0,0,0,0.05)] flex flex-col"
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-[110]">
            <div className="flex items-center gap-5">
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2.5 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session Detail</span>
                  <div className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${detail?.ended_at ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'}`}>
                    {detail?.ended_at ? 'Ended' : 'Live'}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  #{sessionId.split('-')[0].toUpperCase()}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
               {!loading && detail && (
                 <button 
                  onClick={runRating}
                  disabled={ratingLoading}
                  className="flex items-center gap-2.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                 >
                   {ratingLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                   <span>{detail.ai_rating_json ? "Recalculate Review" : "Generate Review"}</span>
                 </button>
               )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-6 py-24">
                <div className="w-14 h-14 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] animate-pulse">Syncing Telemetry...</p>
              </div>
            ) : detail ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col group">
                     <div className="flex justify-between items-start mb-4">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                       <Clock className="w-4 h-4 text-slate-300" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{detail.duration_seconds ? `${Math.floor(detail.duration_seconds / 60)}m ${detail.duration_seconds % 60}s` : "-"}</h3>
                   </div>
                   <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col group">
                     <div className="flex justify-between items-start mb-4">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</p>
                       <Target className="w-4 h-4 text-indigo-400" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{detail.avg_score || 0}%</h3>
                   </div>
                   <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col group">
                     <div className="flex justify-between items-start mb-4">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scenario</p>
                       <Star className="w-4 h-4 text-amber-400" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-900 tracking-tight truncate">{formatLabel(detail.persona_id)}</h3>
                   </div>
                </div>

                {/* AI Rating Section */}
                {detail.ai_rating_json && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50/50 border border-slate-200 rounded-2xl p-8 relative overflow-hidden"
                  >
                    <div className="relative">
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                            <Zap className="text-white w-5 h-5" />
                          </div>
                           <div>
                             <h3 className="text-lg font-bold text-slate-900 tracking-tight">Performance Review</h3>
                             <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Automated Analysis</p>
                           </div>
                        </div>
                         <div className="text-center bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm min-w-[100px]">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Score</span>
                            <span className="text-3xl font-bold text-indigo-600 leading-none">{detail.ai_rating_json.overall_score}/10</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                               Strengths
                            </h4>
                            <ul className="space-y-2">
                               {detail.ai_rating_json.strengths.map((s: string, i: number) => (
                                 <li key={i} className="flex gap-3 items-start bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    <p className="text-[12px] font-semibold text-slate-700 leading-snug">{formatLabel(s)}</p>
                                 </li>
                               ))}
                            </ul>
                         </div>
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                               Improvements
                            </h4>
                            <ul className="space-y-2">
                               {detail.ai_rating_json.improvements.map((s: string, i: number) => (
                                 <li key={i} className="flex gap-3 items-start bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                    <p className="text-[12px] font-semibold text-slate-700 leading-snug">{formatLabel(s)}</p>
                                 </li>
                               ))}
                            </ul>
                         </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-slate-200">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Detailed Analysis</h4>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-8">
                          {typeof detail.ai_rating_json.detailed_feedback === 'object' ? (
                            <div className="grid grid-cols-1 gap-8">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-x divide-slate-100">
                                {detail.ai_rating_json.detailed_feedback.customer_engagement && (
                                  <div className="space-y-2 px-4 first:pl-0">
                                    <h5 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Engagement</h5>
                                    <p className="text-[12px] font-medium text-slate-600 leading-relaxed">{detail.ai_rating_json.detailed_feedback.customer_engagement}</p>
                                  </div>
                                )}
                                {detail.ai_rating_json.detailed_feedback.needs_assessment_and_pitch && (
                                  <div className="space-y-2 px-4">
                                    <h5 className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">Delivery</h5>
                                    <p className="text-[12px] font-medium text-slate-600 leading-relaxed">{detail.ai_rating_json.detailed_feedback.needs_assessment_and_pitch}</p>
                                  </div>
                                )}
                                {detail.ai_rating_json.detailed_feedback.objection_handling_and_closing && (
                                  <div className="space-y-2 px-4 last:pr-0">
                                    <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Conclusion</h5>
                                    <p className="text-[12px] font-medium text-slate-600 leading-relaxed">{detail.ai_rating_json.detailed_feedback.objection_handling_and_closing}</p>
                                  </div>
                                )}
                              </div>
                              
                              {detail.ai_rating_json.performance_debrief && (
                                <div className="pt-8 border-t border-slate-100">
                                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Summary Review</h5>
                                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <MarkdownText content={detail.ai_rating_json.performance_debrief} />
                                  </div>
                                </div>
                              )}

                              {detail.ai_rating_json.detailed_feedback.areas_for_improvement && Array.isArray(detail.ai_rating_json.detailed_feedback.areas_for_improvement) && detail.ai_rating_json.detailed_feedback.areas_for_improvement.length > 0 && (
                                <div className="pt-10 border-t border-slate-100">
                                  <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6 ml-1">Coaching Roadmap</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {detail.ai_rating_json.detailed_feedback.areas_for_improvement.map((point: string, i: number) => (
                                      <div key={i} className="flex items-center gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-200" />
                                        <p className="text-xs font-bold text-slate-500 leading-snug">{point}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-slate-600 italic leading-[1.8] text-center max-w-2xl mx-auto">
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
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-indigo-600" />
                      Transcript
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{detail.events.length} Messages</span>
                  </div>

                  <div className="space-y-10 relative">
                    {/* Visual Vertical Line */}
                    <div className="absolute left-[20px] top-0 bottom-0 w-[2px] bg-slate-50" />
                    
                    {detail.events.map((e, idx) => {
                      const isClient = e.speaker === "client";
                      return (
                        <div 
                          key={e.id}
                          className={`flex ${isClient ? 'justify-start' : 'justify-end'} relative z-10`}
                        >
                          <div className={`max-w-[85%] flex items-start gap-4 ${isClient ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border transition-all ${isClient ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                               {isClient ? <MessageSquare className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div className="space-y-1.5">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {e.speaker === "client" ? "AI Agent" : "User"} • <span className={isClient ? "text-indigo-600" : "text-slate-500"}>{idx + 1}</span>
                              </span>
                              <div className={`p-4 rounded-xl text-sm font-semibold leading-relaxed border shadow-sm ${isClient ? 'bg-indigo-50 border-indigo-100 text-slate-800 rounded-tl-none' : 'bg-white border-slate-200 text-slate-700 rounded-tr-none'}`}>
                                {e.transcript}
                              </div>
                              {!isClient && e.score != null && (
                                <div className={`flex items-center gap-3 mt-2 ${!isClient ? 'justify-end' : ''}`}>
                                   <div className={`flex items-center gap-2 bg-white border border-slate-100 rounded-full px-3 py-1 shadow-sm`}>
                                      <div className={`w-1.5 h-1.5 rounded-full ${e.score >= 80 ? 'bg-emerald-500' : e.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                      <span className="text-[9px] font-bold text-slate-900 uppercase tracking-tight">Score: {e.score}%</span>
                                   </div>
                                   {e.intent_category && (
                                     <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                        {e.intent_category}
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
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-6 py-32">
                <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center border border-slate-100">
                  <AlertTriangle className="w-10 h-10 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="font-black uppercase tracking-[0.3em] text-xs mb-2">Identifier Not Found</p>
                  <p className="text-sm font-medium text-slate-400">Node data has been purged or is inaccessible.</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
