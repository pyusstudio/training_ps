import React from "react";

type Props = {
  score: number | null | undefined;
};

export function ScoreBadge({ score }: Props) {
  if (score == null) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
        —
      </span>
    );
  }

  const styles =
    score >= 80 ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : score >= 60
    ? "bg-amber-50 text-amber-600 border-amber-100/50"
    : "bg-red-50 text-red-600 border-red-100/50";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${styles}`}
    >
      {score}%
    </span>
  );
}

