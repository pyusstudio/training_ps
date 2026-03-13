import React, { useEffect, useState } from "react";
import {
  fetchSessionDetail,
  fetchSessions,
  SessionDetail,
  SessionRow
} from "../lib/api";
import { useAuth } from "../state/authStore";
import { SessionTable } from "../components/SessionTable";
import { LiveFeedPanel } from "../components/LiveFeedPanel";
import { SessionDetailPanel } from "./SessionDetail";
import { motion, AnimatePresence } from "framer-motion";
import QuestionManagement from "./QuestionManagement";
import { ShieldCheck, LogOut, Terminal, AlertCircle, BookOpen, Activity } from "lucide-react";

export function DashboardPage() {
  const { token, setToken } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [view, setView] = useState<"telemetry" | "questions">("telemetry");

  useEffect(() => {
    if (!token || view !== "telemetry") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSessions(token)
      .then((rows) => {
        if (cancelled) return;
        setSessions(rows);
        if (rows.length > 0 && !selectedId) {
          setSelectedId(rows[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load sessions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, view]);

  useEffect(() => {
    if (!token || !selectedId || view !== "telemetry") {
      setDetail(null);
      return;
    }
    let cancelled = false;
    fetchSessionDetail(token, selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load session detail.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedId, view]);

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-[#0a0f1a] to-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-2xl sticky top-0 z-50 shadow-md shadow-black/50">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-6 md:gap-12">
            <div className="flex items-center gap-3 md:gap-4 truncate">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <ShieldCheck className="text-black w-5 h-5 md:w-6 md:h-6 border border-emerald-300 rounded-[10px] md:rounded-xl bg-emerald-400 p-0.5" />
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-[9px] md:text-[10px] font-black tracking-widest text-emerald-400 uppercase drop-shadow-sm truncate">
                  Reflex Command Center
                </p>
                <h1 className="text-base md:text-lg font-black tracking-tight text-white drop-shadow-md truncate">
                  {view === "telemetry" ? "Live Session Telemetry" : "Question Bank"}
                </h1>
              </div>
            </div>

            <nav className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-2xl p-1 shadow-inner relative">
              <button 
                onClick={() => setView("telemetry")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${view === "telemetry" ? "bg-emerald-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                <Activity className="w-4 h-4" /> Telemetry
              </button>
              <button 
                onClick={() => setView("questions")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${view === "questions" ? "bg-emerald-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                <BookOpen className="w-4 h-4" /> Questions
              </button>
            </nav>
          </div>

          <button
            onClick={() => setToken(null)}
            className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 md:px-5 py-2 md:py-2.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-xl shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-3 md:px-6 py-6 md:py-8 space-y-6 relative overflow-x-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none hidden md:block" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none hidden md:block" />

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 flex items-center gap-3 backdrop-blur-md shadow-lg overflow-hidden"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}

          {view === "telemetry" ? (
            <motion.div 
              key="telemetry"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10 min-h-[calc(100vh-10rem)]"
            >
              {/* Left Column (Table + Details) */}
              <div className="xl:col-span-2 flex flex-col gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden shadow-black/50"
                >
                  <SessionTable
                    sessions={sessions}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                  {loading && (
                    <div className="p-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-black/40 border-t border-white/5">
                      <Terminal className="w-4 h-4 animate-pulse" />
                      Synchronizing Telemetry...
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex-1 min-h-[500px]"
                >
                  <SessionDetailPanel
                    detail={detail}
                    onRefresh={() => {
                      if (token && selectedId) {
                        fetchSessionDetail(token, selectedId).then(setDetail).catch(e => setError(e.message));
                        fetchSessions(token).then(setSessions).catch(e => console.error(e));
                      }
                    }}
                  />
                </motion.div>
              </div>

              {/* Right Column (Live Feed) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="xl:col-span-1 xl:sticky xl:top-24 h-[500px] xl:h-fit xl:max-h-[calc(100vh-8rem)]"
              >
                <LiveFeedPanel token={token} />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <QuestionManagement />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
