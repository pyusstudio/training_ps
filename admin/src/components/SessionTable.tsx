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
    <div className="flex flex-col w-full bg-white">
      <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Sessions</h3>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Real-time performance metrics from active training nodes.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total recorded</span>
             <span className="text-xs font-bold text-slate-900">
               {total} Sessions
             </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Source</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
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
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`group cursor-pointer transition-all ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/80"}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isSelected ? "bg-indigo-600 border-indigo-400 text-white" : "bg-white border-slate-100 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100"}`}>
                        <Hash className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold text-sm text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">#{shortId}</span>
                        <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          {new Date(s.started_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-[10px] font-bold uppercase text-slate-600 tracking-wider">
                      {s.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isLive ? (
                      <span className="inline-flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/50">
                         <CheckCircle className="w-3.5 h-3.5" />
                         Ended
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-xs text-slate-600">
                      {formatDuration(s.duration_seconds)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5 w-32">
                       <div className="flex justify-between items-end">
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Score</span>
                         <span className={`text-[11px] font-bold ${s.avg_score && s.avg_score >= 80 ? 'text-indigo-600' : 'text-slate-700'}`}>
                           {s.avg_score ?? "0"}%
                         </span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${s.avg_score || 0}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full ${s.avg_score && s.avg_score >= 80 ? 'bg-indigo-600' : 'bg-slate-400'}`}
                          />
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className={`p-2 rounded-lg border transition-all ${isSelected ? "bg-indigo-600 border-indigo-400 text-white" : "bg-white border-slate-200 text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-100"}`}>
                      <ChevronRight className="w-4 h-4" />
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
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-900 leading-none">
              {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} <span className="text-slate-400 font-medium mx-1">of</span> {total} sessions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all font-bold"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(pages, 5) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onPageChange(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === i + 1 ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === pages}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all font-bold"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
