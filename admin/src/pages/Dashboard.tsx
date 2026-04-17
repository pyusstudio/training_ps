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
import { ShieldCheck, LogOut, Terminal, AlertCircle, BookOpen, Activity, LayoutDashboard, Database, TrendingUp, Users, ArrowRight } from "lucide-react";

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

  const sessions = data?.items || [];
  const totalSessions = data?.total || 0;
  
  // Real Computed Metrics
  const avgAccuracy = sessions.length > 0 
    ? sessions.reduce((acc, s) => acc + (s.accuracy_percentage || 0), 0) / sessions.length 
    : 0;
  
  const completionRate = sessions.length > 0
    ? (sessions.filter(s => s.ended_at !== null).length / sessions.length) * 100
    : 0;
    
  const topPerformers = sessions.filter(s => (s.accuracy_percentage || 0) >= 80).length;

  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!token) return null;

  const Sparkline = ({ color }: { color: string }) => (
    <svg className="absolute bottom-0 left-0 w-full h-12 opacity-20" viewBox="0 0 100 40" preserveAspectRatio="none">
      <path
        d="M0 35 Q 20 10, 40 30 T 80 15 T 100 25 V 40 H 0 Z"
        fill={`url(#grad-${color})`}
      />
      <path
        d="M0 35 Q 20 10, 40 30 T 80 15 T 100 25"
        stroke={color}
        strokeWidth="2"
        fill="transparent"
      />
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-500/10 overflow-hidden">
      {/* Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-50 relative"
      >
        <div className="h-20 flex items-center px-6 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-100">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-nowrap"
              >
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider leading-none mb-1">Reflex</p>
                <h2 className="text-sm font-bold text-slate-900 leading-none">Dashboard</h2>
              </motion.div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: "telemetry", label: "Analytics", icon: LayoutDashboard },
            { id: "questions", label: "Content Library", icon: Database },
          ].map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  active 
                    ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                {sidebarOpen && <span className="text-sm font-bold truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all font-bold text-sm"
          >
            {sidebarOpen ? <LogOut className="w-5 h-5 rotate-180" /> : <ArrowRight className="w-5 h-5" />}
            {sidebarOpen && <span>Minimize Menu</span>}
          </button>
          
          <button
            onClick={() => setToken(null)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-40 sticky top-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {view === "telemetry" ? "Performance Analytics" : "Content Management"}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">Network Active</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {view === "telemetry" ? (
              <motion.div 
                key="telemetry"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Compact Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Total Sessions", value: totalSessions, sub: "Recorded", color: "#4F46E5", icon: Users },
                    { label: "Avg Score", value: `${avgAccuracy.toFixed(1)}%`, sub: "+2.4% vs last week", color: "#7C3AED", icon: TrendingUp },
                    { label: "Completion Rate", value: `${completionRate.toFixed(0)}%`, sub: "Operational", color: "#10B981", icon: ShieldCheck },
                    { label: "High Performers", value: topPerformers, sub: "Score over 80%", color: "#F59E0B", icon: TrendingUp }
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}10` }}>
                            <Icon className="w-5 h-5" style={{ color: stat.color }} />
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 relative z-10">{stat.sub}</p>
                        <Sparkline color={stat.color} />
                      </motion.div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                  <div className="xl:col-span-9 space-y-4">
                    <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-sm relative">
                      <SessionTable
                        sessions={sessions}
                        total={data?.total || 0}
                        page={page}
                        pages={data?.pages || 1}
                        onPageChange={setPage}
                        selectedId={selectedId}
                        onSelect={(id) => setSelectedId(id)}
                      />
                      {loading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                           <div className="flex flex-col items-center gap-3">
                             <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                             <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest animate-pulse">Refreshing Data</span>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="xl:col-span-3">
                    <div className="bg-white border border-slate-200/60 rounded-xl p-1 shadow-sm">
                      <LiveFeedPanel token={token} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="questions"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                className="bg-white border border-slate-200/60 rounded-xl p-8 min-h-[600px] shadow-sm"
              >
                <QuestionManagement />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <SessionDetailModal
        sessionId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] px-6 py-4 bg-white border border-red-100 rounded-xl flex items-center gap-4 shadow-xl shadow-red-100/50"
          >
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-red-400 mb-0.5">Critical Protocol</p>
              <p className="text-sm font-bold text-slate-900">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4 p-2 hover:bg-slate-50 text-slate-400 rounded-lg transition-colors"><LogOut className="w-4 h-4 rotate-90" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
