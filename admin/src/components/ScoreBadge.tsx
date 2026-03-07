import React from "react";

type Props = {
  score: number | null | undefined;
};

export function ScoreBadge({ score }: Props) {
  if (score == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
        N/A
      </span>
    );
  }

  const color =
    score >= 80 ? "bg-emerald-500/20 text-emerald-300" : score >= 60
    ? "bg-amber-500/20 text-amber-300"
    : "bg-red-500/20 text-red-300";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {score}
    </span>
  );
}

