import React from "react";
import type { SessionRow } from "../lib/api";
import { motion } from "framer-motion";
import { Activity, Clock, Target, Hash, ChevronLeft, ChevronRight, Monitor, Play, CheckCircle } from "lucide-react";

type Props = {
  sessions: SessionRow[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (p: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function SessionTable({ sessions, total, page, pages, onPageChange, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col w-full">
      <div className="px-10 py-8 border-b border-white/5 flex items-end justify-between gap-6 bg-white/[0.01]">
        <div>
           <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 mb-2">
            <Activity className="w-4 h-4 text-violet-500" />
            Live Ingest Stream
          </h2>
          <p className="text-xs font-medium text-slate-500">Real-time telemetry from active training nodes.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            {total} RECORDED SESSIONS
          </span>
        </div>
      </div>

      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5">
              <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identifier</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Protocol</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Performance</th>
              <th className="px-10 py-5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sessions.map((s, idx) => {
              const isSelected = s.id === selectedId;
              const formatDuration = (seconds: number | null) => {
                if (seconds == null) return "-";
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
              };

              const shortId = s.id.split('-')[0].toUpperCase();
              const isLive = !s.ended_at;

              return (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`group cursor-pointer transition-all duration-300 ${isSelected ? "bg-violet-600/10" : "hover:bg-white/5"}`}
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${isSelected ? "bg-violet-600 border-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "bg-white/5 border-white/5"}`}>
                        <Hash className={`w-5 h-5 ${isSelected ? "text-white" : "text-slate-500 group-hover:text-violet-400"}`} />
                      </div>
                      <div>
                        <span className="block font-mono font-black text-sm text-slate-100 mb-0.5 tracking-wider">#{shortId}</span>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {new Date(s.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[10px] font-black uppercase text-cyan-400 tracking-[0.1em]">
                      {s.source}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    {isLive ? (
                      <span className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">
                         <CheckCircle className="w-3.5 h-3.5" />
                         Ended
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      <span className="font-mono font-bold text-sm text-slate-300">
                        {formatDuration(s.duration_seconds)}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1.5 max-w-[120px]">
                       <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-slate-500 uppercase">Mastery</span>
                         <span className={`text-xs font-black ${s.avg_score && s.avg_score >= 80 ? 'text-violet-400' : 'text-slate-400'}`}>
                           {s.avg_score ?? "0"}%
                         </span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${s.avg_score || 0}%` }}
                            className={`h-full bg-gradient-to-r ${s.avg_score && s.avg_score >= 80 ? 'from-violet-600 to-violet-400' : 'from-slate-600 to-slate-500'}`}
                          />
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button className={`p-3 rounded-xl border transition-all duration-300 ${isSelected ? "border-violet-500 text-violet-400" : "border-white/5 text-slate-600 group-hover:text-white"}`}>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {(pages > 1 || total > sessions.length) && (
        <div className="px-10 py-8 border-t border-white/5 bg-black/20 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
            Showing <span className="text-white">{(page - 1) * 10 + 1}</span> to <span className="text-white">{Math.min(page * 10, total)}</span> of {total} nodes
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(pages, 5) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onPageChange(i + 1)}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "hover:bg-white/5 text-slate-500"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === pages}
              className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
