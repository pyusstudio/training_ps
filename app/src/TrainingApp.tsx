import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Play,
  Square,
  Terminal,
  Settings,
  User,
  Bot,
  Award,
  TrendingUp,
  Target,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { createTrainingSocket } from "./lib/ws";

type Message = {
  id: string;
  sender: "client" | "salesperson" | "system";
  text: string;
  timestamp: Date;
  score?: number;
  sentiment?: string;
  color_hex?: string;
};

type SessionRating = {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  detailed_feedback: string;
};

type SummaryMetrics = {
  total_score: number;
  avg_score: number;
  accuracy_percentage: number;
};

export function TrainingApp() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [rating, setRating] = useState<SessionRating | null>(null);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "active" | "ending">("idle");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = createTrainingSocket();
    setSocket(ws);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);

        if (data.type === "session_started" && data.session_id) {
          setSessionId(data.session_id as string);
          setMessages([{
            id: `sys-${Date.now()}`,
            sender: "system",
            text: "Session started. The AI trainee will greet you shortly.",
            timestamp: new Date()
          }]);
          setRating(null);
          setSessionStatus("active");
        } else if (data.type === "client_utterance") {
          setMessages(prev => [...prev, {
            id: `client-${Date.now()}`,
            sender: "client",
            text: data.text,
            timestamp: new Date()
          }]);
          if (data.time_remaining_seconds !== undefined) {
            setTimeRemaining(data.time_remaining_seconds);
          }
        } else if (data.type === "score_event") {
          setMessages(prev => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].sender === "salesperson") {
                next[i] = {
                  ...next[i],
                  score: data.score,
                  sentiment: data.sentiment,
                  color_hex: data.color_hex
                };
                break;
              }
            }
            return next;
          });
        } else if (data.type === "session_rating") {
          setRating({
            overall_score: data.overall_score,
            strengths: data.strengths,
            improvements: data.improvements,
            detailed_feedback: data.detailed_feedback,
          });
          setSessionStatus("idle");
          setSessionId(null);
          setTimeRemaining(null);
        } else if (data.type === "session_summary") {
          setSessionStatus("ending");
          setTimeRemaining(null);
          setSummaryMetrics({
            total_score: data.total_score,
            avg_score: data.avg_score,
            accuracy_percentage: data.accuracy_percentage
          });
        } else if (data.type === "session_end") {
          setSessionStatus("ending");
        } else if (data.type === "error") {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "system",
            text: `System Alert: ${data.detail}`,
            timestamp: new Date()
          }]);
        }
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      } else {
        ws.close();
      }
      setSocket(null);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!sessionId || timeRemaining === null || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => prev !== null ? Math.max(0, prev - 1) : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionId, timeRemaining]);

  function startTrainingSession() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    setRating(null);
    setSummaryMetrics(null);
    setMessages([]);
    setTimeRemaining(null);
    setSessionStatus("active");

    const msg = {
      type: "session_start",
      direction: "cs",
      source: "app"
    };
    socket.send(JSON.stringify(msg));
  }

  function endTrainingSession() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !sessionId) return;
    setSessionStatus("ending");

    const msg = {
      type: "session_end",
      direction: "cs",
      session_id: sessionId
    };
    socket.send(JSON.stringify(msg));
  }

  function handleSendResponse(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (!sessionId || !transcript.trim()) return;

    setMessages(prev => [...prev, {
      id: `sp-${Date.now()}`,
      sender: "salesperson",
      text: transcript.trim(),
      timestamp: new Date()
    }]);

    const msg = {
      type: "roleplay_event",
      direction: "cs",
      session_id: sessionId,
      transcript: transcript.trim(),
      reaction_time_ms: 1200
    };
    socket.send(JSON.stringify(msg));
    setTranscript("");
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0c] text-slate-200 font-sans selection:bg-emerald-500/30">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">Reflex Pro</h1>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Training Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-slate-100 font-medium transition-all hover:bg-white/10 group">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <span>Active Session</span>
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium transition-all hover:bg-white/5 hover:text-slate-200 group">
            <TrendingUp className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
            <span>Performance</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium transition-all hover:bg-white/5 hover:text-slate-200 group">
            <Target className="w-5 h-5 group-hover:text-purple-400 transition-colors" />
            <span>Scenarios</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium transition-all hover:bg-white/5 hover:text-slate-200 group">
            <Settings className="w-5 h-5 group-hover:text-slate-200 transition-colors" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-5 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              Next Milestones
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Objection Handling</span>
                  <span>75%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative">

        {/* TOP BAR */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white">Advanced Sales Simulation</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {connected ? "Production Environment" : "System Offline"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <AnimatePresence>
              {sessionStatus === "active" && timeRemaining !== null && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-4 pr-1.5 py-1.5"
                >
                  <span className={`text-xs font-mono font-black ${timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                  <button
                    onClick={endTrainingSession}
                    className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                    title="End Session"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-10 h-10 rounded-full border border-white/10 p-0.5">
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* CHAT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-4xl mx-auto space-y-10">

            <AnimatePresence mode="popLayout">
              {!sessionId && !rating && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                >
                  <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 overflow-hidden">
                      <Bot className="w-12 h-12 text-emerald-500" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#0a0a0c] border border-white/5 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Ready for Excellence?</h3>
                  <p className="max-w-md text-slate-400 text-lg leading-relaxed mb-10">
                    Step into the simulation. Practice your pitch, overcome objections, and refine your closing techniques.
                  </p>

                  <button
                    onClick={startTrainingSession}
                    disabled={!connected}
                    className="group relative px-10 py-4 bg-emerald-500 rounded-2xl text-black font-black text-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Start Session <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  </button>
                </motion.div>
              )}

              {/* MESSAGE LOG */}
              {messages.length > 0 && (
                <motion.div className="space-y-8 pb-32">
                  {messages.map((m, idx) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className={`flex w-full ${m.sender === 'client' ? 'justify-start' : m.sender === 'salesperson' ? 'justify-end' : 'justify-center'}`}
                    >
                      {m.sender === 'system' ? (
                        <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70">
                          <Terminal className="w-3 h-3" />
                          {m.text}
                        </div>
                      ) : (
                        <div className={`flex max-w-[80%] gap-4 ${m.sender === 'salesperson' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`mt-auto w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xl ${m.sender === 'client'
                              ? 'bg-gradient-to-br from-cyan-600 to-blue-700 border border-cyan-400/20'
                              : 'bg-gradient-to-tr from-emerald-500 to-emerald-700 border border-emerald-400/20'
                            }`}>
                            {m.sender === 'client' ? <Bot className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
                          </div>

                          <div className={`flex flex-col gap-2 ${m.sender === 'salesperson' ? 'items-end' : 'items-start'}`}>
                            <div className={`relative px-6 py-4 rounded-3xl shadow-2xl ${m.sender === 'client'
                                ? 'bg-[#16161a] text-slate-100 rounded-bl-sm border border-white/10'
                                : 'bg-emerald-600 text-white rounded-br-sm border border-white/10'
                              }`}>
                              <p className="text-[15px] leading-relaxed font-medium">{m.text}</p>
                            </div>

                            {/* FEEDBACK PILLS */}
                            {m.sender === 'salesperson' && m.score !== undefined && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-3 bg-white/5 border border-white/5 pl-2 pr-4 py-1.5 rounded-full backdrop-blur-md"
                              >
                                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] ${m.sentiment === 'Positive' ? 'bg-emerald-500' : m.sentiment === 'Negative' ? 'bg-red-500' : 'bg-amber-500'
                                  }`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {m.sentiment} Evaluation: {m.score}%
                                </span>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* SUMMARY OVERLAY */}
            <AnimatePresence>
              {sessionStatus === "ending" && !rating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl px-6"
                >
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Terminal className="w-8 h-8 text-emerald-500" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-black text-white mb-2">Analyzing Performance</h3>
                      <p className="text-slate-400 font-medium">Synthesizing AI metrics and qualitative feedback...</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FINAL METRICS REPORT */}
            {rating && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* METRIC CARDS */}
                  <div className="bg-gradient-to-br from-emerald-500/10 to-[#0a0a0c] p-6 rounded-[2rem] border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                      <Award className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-4">Mastery Score</div>
                    <div className="text-5xl font-black text-white">{rating.overall_score}<span className="text-xl text-emerald-500/40">/10</span></div>
                  </div>

                  {summaryMetrics && (
                    <>
                      <div className="bg-gradient-to-br from-cyan-500/10 to-[#0a0a0c] p-6 rounded-[2rem] border border-cyan-500/20 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                          <AnalyzeIcon className="w-24 h-24 text-cyan-500" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 mb-4">Precision</div>
                        <div className="text-5xl font-black text-white">{summaryMetrics.accuracy_percentage}<span className="text-xl text-cyan-500/40">%</span></div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/10 to-[#0a0a0c] p-6 rounded-[2rem] border border-purple-500/20 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                          <Target className="w-24 h-24 text-purple-500" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 mb-4">Avg. Quality</div>
                        <div className="text-5xl font-black text-white">{summaryMetrics.avg_score}<span className="text-xl text-purple-500/40">%</span></div>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* STRENGTHS */}
                  <div className="bg-[#16161a] p-8 rounded-[2.5rem] border border-white/5">
                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      Tactical Strengths
                    </h4>
                    <div className="space-y-4">
                      {rating.strengths.map((s, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden shrink-0 mt-1">
                            <div className="w-full h-1/2 bg-emerald-500 group-hover:h-full transition-all duration-500" />
                          </div>
                          <p className="text-slate-300 font-medium leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* IMPROVEMENTS */}
                  <div className="bg-[#16161a] p-8 rounded-[2.5rem] border border-white/5">
                    <h4 className="text-sm font-black uppercase tracking-widest text-amber-400 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      Strategic Gaps
                    </h4>
                    <div className="space-y-4">
                      {rating.improvements.map((s, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden shrink-0 mt-1">
                            <div className="w-full h-1/4 bg-amber-500 group-hover:h-full transition-all duration-500" />
                          </div>
                          <p className="text-slate-300 font-medium leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-[#16161a] to-black p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Expert Debrief</h4>
                  <p className="text-xl font-medium text-slate-200 leading-relaxed italic border-l-4 border-emerald-500/30 pl-8">
                    "{rating.detailed_feedback}"
                  </p>

                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={startTrainingSession}
                      className="px-12 py-5 bg-white text-black font-black rounded-3xl transition-all hover:scale-105 active:scale-95 shadow-[0_15px_40px_rgba(255,255,255,0.1)]"
                    >
                      Initialize New Simulation
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* INPUT FOOTER */}
        <footer className="h-32 flex items-center bg-black/40 backdrop-blur-3xl px-8 border-t border-white/5 relative">
          <div className="max-w-4xl w-full mx-auto relative group">
            <form onSubmit={handleSendResponse}>
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={sessionStatus !== "active"}
                placeholder={sessionStatus === "active" ? "Engage with the trainee..." : "Start simulation to begin engagement"}
                className="w-full h-16 bg-[#16161a] border border-white/5 rounded-[2rem] px-8 pr-20 text-lg font-medium placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/30 focus:bg-black/40 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale cursor-default"
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <button
                  type="submit"
                  disabled={sessionStatus !== "active" || !transcript.trim()}
                  className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-black transition-all hover:scale-110 active:scale-90 disabled:opacity-0 disabled:scale-50 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-5 h-5 fill-current" />
                </button>
              </div>
            </form>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500">
                Reflex AI Evaluator Online
              </div>
            </div>
          </div>
        </footer>

      </main>

    </div>
  );
}

// Simple Helper Icon
function AnalyzeIcon(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20" />
      <path d="M16 18c1.5-1.5 2.5-3.5 2.5-6s-1-4.5-2.5-6" />
      <path d="M8 18c-1.5-1.5-2.5-3.5-2.5-6s1-4.5 2.5-6" />
    </svg>
  );
}
