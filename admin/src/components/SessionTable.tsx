import React from "react";
import type { SessionRow } from "../lib/api";
import { motion } from "framer-motion";
import { Activity, Clock, Target, Hash } from "lucide-react";

type Props = {
  sessions: SessionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function SessionTable({ sessions, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-white/5 overflow-hidden w-full max-w-[100vw]">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-black/20">
        <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 md:gap-3">
          <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 shrink-0" />
          Monitored Sessions
        </h2>
        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-2 md:px-3 py-1 rounded-full border border-white/5 whitespace-nowrap">
          {sessions.length} Active {sessions.length === 1 ? "" : "Streams"}
        </span>
      </div>

      <div className="flex-1 custom-scrollbar min-h-[400px] overflow-x-auto w-full">
        <table className="min-w-[600px] w-full text-sm">
          <thead className="bg-black/40 text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-widest sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4 text-left font-bold w-1/3">
                <div className="flex items-center gap-2"><Hash className="w-3 h-3" /> Identifier</div>
              </th>
              <th className="px-6 py-4 text-left font-bold">Source</th>
              <th className="px-6 py-4 text-right font-bold">
                <div className="flex items-center justify-end gap-2"><Clock className="w-3 h-3" /> Time</div>
              </th>
              <th className="px-6 py-4 text-right font-bold">Quality</th>
              <th className="px-6 py-4 text-right font-bold">
                <div className="flex items-center justify-end gap-2"><Target className="w-3 h-3" /> Hit Rate</div>
              </th>
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

              return (
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`cursor-pointer transition-all duration-300 group ${isSelected
                    ? "bg-gradient-to-r from-emerald-500/10 to-transparent border-l-2 border-emerald-500 shadow-[inset_0_1px_rgba(255,255,255,0.05)]"
                    : "hover:bg-white/5 border-l-2 border-transparent"
                    }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`font-mono font-bold tracking-wider text-sm transition-colors ${isSelected ? 'text-emerald-400' : 'text-slate-200 group-hover:text-emerald-400'}`}>
                        {shortId}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">
                        {new Date(s.started_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-[10px] uppercase font-bold tracking-wider text-slate-300">
                      {s.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs font-semibold">
                    {formatDuration(s.duration_seconds)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-bold ${s.avg_score && s.avg_score >= 80 ? 'text-emerald-400' : s.avg_score && s.avg_score >= 60 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {s.avg_score ?? "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-cyan-400">
                      {s.accuracy_percentage != null ? `${s.accuracy_percentage}%` : "-"}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Activity className="w-8 h-8 opacity-20" />
                    <p className="text-sm font-medium tracking-wide">Waiting for inbound telemetry...</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
