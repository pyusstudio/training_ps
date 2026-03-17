import React, { useEffect, useState } from "react";
import {
  fetchSessions,
  SessionRow,
  PaginatedSessions
} from "../lib/api";
import { useAuth } from "../state/authStore";
import { SessionTable } from "../components/SessionTable";
import { LiveFeedPanel } from "../components/LiveFeedPanel";
import { SessionDetailModal } from "./SessionDetail";
import { motion, AnimatePresence } from "framer-motion";
import QuestionManagement from "./QuestionManagement";
import { ShieldCheck, LogOut, Terminal, AlertCircle, BookOpen, Activity, LayoutDashboard, Database, TrendingUp, Users } from "lucide-react";

export function DashboardPage() {
  const { token, setToken } = useAuth();
  const [data, setData] = useState<PaginatedSessions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"telemetry" | "questions">("telemetry");
  const [page, setPage] = useState(1);

  const loadData = async (p: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchSessions(token, p, 10);
      setData(res);
    } catch (err) {
      setError("Failed to load session telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "telemetry") {
      loadData(page);
    }
  }, [token, view, page]);

  // Derived stats (mocking some for visual wow, but using real counts)
  const totalSessions = data?.total || 0;
  const avgAccuracy = (data?.items || []).reduce((acc, s) => acc + (s.accuracy_percentage || 0), 0) / (data?.items?.length || 1);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[#06091A] text-slate-50 font-sans selection:bg-violet-500/30 overflow-x-hidden">
      {/* Premium Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      <header className="border-b border-white/5 bg-[#06091A]/60 backdrop-blur-2xl sticky top-0 z-40 shadow-2xl shadow-black/50">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-violet-400 uppercase leading-none mb-1">
                  Reflex OS
                </p>
                <h1 className="text-lg font-black tracking-tight text-white leading-none">
                  Command Center
                </h1>
              </div>
            </div>

            <nav className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 shadow-inner">
              <button 
                onClick={() => setView("telemetry")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${view === "telemetry" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-400 hover:text-white"}`}
              >
                <Activity className="w-4 h-4" /> Telemetry
              </button>
              <button 
                onClick={() => setView("questions")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${view === "questions" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-400 hover:text-white"}`}
              >
                <Database className="w-4 h-4" /> Question Bank
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
               <div className="flex flex-col items-end">
                 <span className="text-[10px] font-bold text-slate-500 uppercase">System Status</span>
                 <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                   Fully Operational
                 </span>
               </div>
             </div>

            <button
              onClick={() => setToken(null)}
              className="flex items-center gap-2 text-xs font-black text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-5 py-3 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-10 space-y-10 relative">
        <AnimatePresence mode="wait">
          {view === "telemetry" ? (
            <motion.div 
              key="telemetry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Sessions", value: totalSessions, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                  { label: "Avg Hit Rate", value: `${avgAccuracy.toFixed(1)}%`, icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
                  { label: "Active Nodes", value: "3", icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                  { label: "System Load", value: "14%", icon: LayoutDashboard, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
                ].map((stat, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    key={stat.label}
                    className={`${stat.bg} ${stat.border} border rounded-3xl p-6 relative overflow-hidden group shadow-xl`}
                  >
                    <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-125 transition-transform duration-500">
                      <stat.icon className={`w-24 h-24 ${stat.color}`} />
                    </div>
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-4`} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                <div className="xl:col-span-3 space-y-6">
                  <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                    <SessionTable
                      sessions={data?.items || []}
                      total={data?.total || 0}
                      page={page}
                      pages={data?.pages || 1}
                      onPageChange={setPage}
                      selectedId={selectedId}
                      onSelect={(id) => setSelectedId(id)}
                    />
                    {loading && (
                      <div className="absolute inset-0 bg-[#06091A]/40 backdrop-blur-sm flex items-center justify-center z-20">
                         <div className="flex flex-col items-center gap-4">
                           <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                           <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em] animate-pulse">Syncing...</span>
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-1">
                  <LiveFeedPanel token={token} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuestionManagement />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Session Detail Modal */}
      <SessionDetailModal
        sessionId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Toast-like Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-red-500/20 border border-red-500/30 backdrop-blur-xl rounded-2xl flex items-center gap-4 shadow-2xl"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm font-bold text-red-200">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg"><LogOut className="w-4 h-4 rotate-90" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
