import React, { useState } from "react";
import { RoleplayEvent, SessionDetail, generateSessionRating } from "../lib/api";
import { useAuth } from "../state/authStore";

type Props = {
  detail: SessionDetail | null;
  onRefresh?: () => void; // Optional callback to trigger dashboard reload
};

export function SessionDetailPanel({ detail, onRefresh }: Props) {
  const { token } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!detail) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950/50">
        <p className="text-sm text-neutral-500">Select a session to view details</p>
      </div>
    );
  }

  const { id, source, started_at, duration_seconds, total_score, avg_score, accuracy_percentage, events, ai_rating_json } = detail;

  // Try to parse the AI rating if it exists
  let rating: any = null;
  if (ai_rating_json) {
    try {
      // If it's already an object, use it; if string, parse it
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
      // Wait a moment then refresh if a callback was passed
      setTimeout(() => {
        if (onRefresh) onRefresh();
        // Fallback: force a hard reload of the window if needed 
        else window.location.reload();
      }, 500);
    } catch (e: any) {
      setGenerationError(e.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col pt-4 overflow-hidden h-full">
      <div className="px-5 pb-5 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-neutral-100 flex items-center justify-between">
          Session Insight
          <span className="text-xs font-mono font-normal text-neutral-500 bg-neutral-900 px-2 py-1 rounded">ID: {id.split('-')[0]}...</span>
        </h2>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Source</span>
            <span className="font-medium text-neutral-200">{source}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Time</span>
            <span className="font-medium text-neutral-200">{new Date(started_at).toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Duration</span>
            <span className="font-medium text-neutral-200">
              {duration_seconds != null
                ? `${Math.floor(duration_seconds / 60)}:${(duration_seconds % 60).toString().padStart(2, '0')}`
                : "-"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* METRICS GRID */}
        {total_score !== null && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded border border-neutral-800 bg-neutral-900 p-3 text-center">
              <div className="text-xs text-neutral-500">Total Score</div>
              <div className="mt-1 text-lg font-medium text-emerald-400">{total_score}</div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900 p-3 text-center">
              <div className="text-xs text-neutral-500">Avg Quality</div>
              <div className="mt-1 text-lg font-medium text-sky-400">{avg_score}</div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900 p-3 text-center">
              <div className="text-xs text-neutral-500">Accuracy</div>
              <div className="mt-1 text-lg font-medium text-purple-400">{accuracy_percentage}%</div>
            </div>
          </div>
        )}

        {/* RATING CARD */}
        {rating ? (
          <div className="rounded-xl bg-indigo-950/30 border border-indigo-500/20 p-5 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-indigo-300">AI Performance Evaluation</h3>
                <p className="text-xs text-indigo-400/70 mt-0.5">Automated coaching feedback</p>
              </div>
              <div className="flex items-center justify-center bg-indigo-900 rounded-lg px-3 py-2 border border-indigo-500/30">
                <span className="font-bold text-lg text-indigo-300">{rating.overall_score}</span>
                <span className="text-xs text-indigo-400/60 ml-0.5 mt-1">/10</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="bg-neutral-900/40 rounded p-3">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Strengths
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-sm text-neutral-300">
                  {rating.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>) || <li className="text-neutral-500 italic">None noted</li>}
                </ul>
              </div>
              <div className="bg-neutral-900/40 rounded p-3">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  Needs Polish
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-sm text-neutral-300">
                  {rating.improvements?.map((s: string, i: number) => <li key={i}>{s}</li>) || <li className="text-neutral-500 italic">None noted</li>}
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-500/10">
              <p className="text-sm italic text-neutral-300 leading-relaxed">"{rating.detailed_feedback}"</p>
            </div>
          </div>
        ) : total_score !== null ? (
          <div className="flex flex-col items-center justify-center py-6 border border-dashed border-neutral-800 rounded bg-neutral-900/50 mb-6">
            <p className="text-sm text-neutral-400 mb-4">No AI evaluation has been generated for this session yet.</p>

            {generationError && (
              <p className="text-xs text-red-400 mb-3 bg-red-900/20 px-3 py-1.5 rounded">{generationError}</p>
            )}

            <button
              onClick={handleGenerateRating}
              disabled={isGenerating || events.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Synthesizing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
                  Generate AI Insight
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500 flex flex-col items-center justify-center mb-6">
            <p>Session active or no summary available.</p>
            {events.length > 0 && !rating && (
              <button
                onClick={handleGenerateRating}
                disabled={isGenerating}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded flex items-center gap-2 transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Force AI Generation'}
              </button>
            )}
          </div>
        )}

        {/* TRANSCRIPT */}
        <div>
          <h3 className="mb-4 text-sm font-semibold text-neutral-300 uppercase tracking-widest">Full Transcript</h3>
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-sm text-neutral-500">No events found.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="relative pl-4 border-l-2 border-neutral-800 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold ${e.speaker === "client" ? "text-sky-400" : "text-emerald-400"
                        }`}
                    >
                      {e.speaker === "client" ? "📝 Customer" : "👨‍💼 Salesperson"}
                    </span>

                    {e.score !== null && (
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-400 border border-neutral-800">
                        Score: <strong className={e.score >= 70 ? 'text-emerald-400' : 'text-amber-400'}>{e.score}</strong>
                        {e.intent_category && <span className="ml-1 opacity-70">({e.intent_category})</span>}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{e.transcript || <span className="text-neutral-600 italic">No audio recorded</span>}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
