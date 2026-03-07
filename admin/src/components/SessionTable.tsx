import React from "react";
import type { SessionRow } from "../lib/api";

type Props = {
  sessions: SessionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function SessionTable({ sessions, selectedId, onSelect }: Props) {
  return (
    <div className="bg-card border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-200">Sessions</h2>
        <span className="text-xs text-zinc-500">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Session</th>
              <th className="px-4 py-2 text-left">Source</th>
              <th className="px-4 py-2 text-right">Duration</th>
              <th className="px-4 py-2 text-right">Score</th>
              <th className="px-4 py-2 text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const isSelected = s.id === selectedId;
              const formatDuration = (seconds: number | null) => {
                if (seconds == null) return "-";
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
              };
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`cursor-pointer border-t border-zinc-900 hover:bg-zinc-900/60 ${isSelected ? "bg-zinc-900/80" : ""
                    }`}
                >
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-100 truncate">
                        {s.id}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(s.started_at).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-zinc-300">
                    {s.source.toUpperCase()}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400 font-mono">
                    {formatDuration(s.duration_seconds)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-200">
                    {s.avg_score ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400">
                    {s.accuracy_percentage != null
                      ? `${s.accuracy_percentage}%`
                      : "-"}
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-zinc-500"
                >
                  No sessions yet. They will appear here in real time.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
