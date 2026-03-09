import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
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
  AlertCircle,
  RefreshCw,
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
  const [reconnecting, setReconnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [rating, setRating] = useState<SessionRating | null>(null);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "active" | "ending">("idle");
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastClientMsgTime = useRef<number | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number;
    let attempts = 0;
    let isUnmounted = false;

    function connect() {
      if (isUnmounted) return;
      ws = createTrainingSocket();
      setSocket(ws);

      ws.onopen = () => {
        setConnected(true);
        setReconnecting(false);
        attempts = 0;
      };

      ws.onclose = (event) => {
        setConnected(false);
        setIsTyping(false);
        if (isUnmounted) return;

        // Let the user know the connection dropped if active
        if (sessionStatus === "active") {
          setMessages(prev => [...prev, {
            id: `sys-drop-${Date.now()}`,
            sender: "system",
            text: "Connection to simulation server lost. Attempting to reconnect...",
            timestamp: new Date()
          }]);
        }

        if (attempts < 5 && event.code !== 1008) { // 1008 is policy violation/auth failure
          setReconnecting(true);
          reconnectTimer = window.setTimeout(connect, 2000 * Math.pow(1.5, attempts));
          attempts++;
        }
      };

      ws.onerror = () => {
        // Handled by onclose
      };

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
            setIsTyping(true);
            lastClientMsgTime.current = Date.now();
          } else if (data.type === "client_utterance") {
            setIsTyping(false);
            lastClientMsgTime.current = Date.now();
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
            setIsTyping(false);
          } else if (data.type === "session_summary") {
            setSessionStatus("ending");
            setTimeRemaining(null);
            setIsTyping(false);
            setSummaryMetrics({
              total_score: data.total_score,
              avg_score: data.avg_score,
              accuracy_percentage: data.accuracy_percentage
            });
            setMessages(prev => [...prev, {
              id: `sys-end-${Date.now()}`,
              sender: "system",
              text: "Simulation concluded (time elapsed or maximum exchanges reached). Compiling final assessor debrief...",
              timestamp: new Date()
            }]);
          } else if (data.type === "session_end") {
            setSessionStatus("ending");
            setIsTyping(false);
          } else if (data.type === "error") {
            setIsTyping(false);
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
    }

    connect();

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimer);
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws?.close();
        } else {
          ws.close();
        }
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
    setIsTyping(true);

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
    setIsTyping(false);

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

    // Calculate real reaction time
    let reactionTime = 0;
    if (lastClientMsgTime.current !== null) {
      reactionTime = Date.now() - lastClientMsgTime.current;
    }

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
      reaction_time_ms: reactionTime
    };
    socket.send(JSON.stringify(msg));
    setTranscript("");
    setIsTyping(true);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRelativeTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1a] to-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/5 bg-slate-950/40 backdrop-blur-2xl">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white drop-shadow-sm">Reflex Pro</h1>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Training Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5 transition-all group">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Active Session</span>
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium border border-transparent transition-all hover:bg-white/5 hover:border-white/5 hover:text-slate-200 group">
            <TrendingUp className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
            <span>Performance</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium border border-transparent transition-all hover:bg-white/5 hover:border-white/5 hover:text-slate-200 group">
            <Target className="w-5 h-5 group-hover:text-purple-400 transition-colors" />
            <span>Scenarios</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium border border-transparent transition-all hover:bg-white/5 hover:border-white/5 hover:text-slate-200 group">
            <Settings className="w-5 h-5 group-hover:text-slate-200 transition-colors" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
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
                <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
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
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-black/20 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white">Advanced Sales Simulation</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500 animate-pulse"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {connected ? "Production Environment" : reconnecting ? "Reconnecting..." : "System Offline"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <AnimatePresence>
              {sessionStatus === "active" && timeRemaining !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/10 rounded-full pl-4 pr-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  <span className={`text-xs font-mono font-black ${timeRemaining < 30 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                  <button
                    onClick={endTrainingSession}
                    className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                    title="End Session"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {reconnecting && (
              <div className="animate-spin text-slate-500 p-2">
                <RefreshCw className="w-4 h-4" />
              </div>
            )}

            <div className="w-10 h-10 rounded-full border border-white/10 p-0.5 bg-white/5 backdrop-blur-sm hidden md:block">
              <div className="w-full h-full rounded-full bg-black/50 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          </div>
        </header>

        {/* CHAT CONTAINER */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:p-8 relative">
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
                    <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 backdrop-blur-md flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden">
                      <Bot className="w-12 h-12 text-emerald-400" />
                    </div>
                    {connected && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-3xl font-black text-white mb-3 tracking-tight drop-shadow-md">Ready for Excellence?</h3>
                  <p className="max-w-md text-slate-400 text-lg leading-relaxed mb-10 font-medium">
                    Step into the simulation. Practice your pitch, overcome objections, and refine your closing techniques.
                  </p>

                  <button
                    onClick={startTrainingSession}
                    disabled={!connected}
                    className="group relative px-10 py-4 bg-emerald-500 rounded-2xl text-black font-black text-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_10px_30px_rgba(16,185,129,0.25)] border border-emerald-400 flex items-center gap-3 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3 drop-shadow-sm">
                      Start Session <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`flex w-full ${m.sender === 'client' ? 'justify-start' : m.sender === 'salesperson' ? 'justify-end' : 'justify-center'}`}
                    >
                      {m.sender === 'system' ? (
                        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          <Terminal className="w-3 h-3" />
                          {m.text}
                        </div>
                      ) : (
                        <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 md:gap-4 ${m.sender === 'salesperson' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`mt-auto w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${m.sender === 'client'
                            ? 'bg-gradient-to-br from-cyan-600 to-blue-800 border-cyan-400/30 text-white'
                            : 'bg-emerald-500 border-emerald-400/50 text-black'
                            }`}>
                            {m.sender === 'client' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>

                          <div className={`flex flex-col gap-2 ${m.sender === 'salesperson' ? 'items-end' : 'items-start'}`}>
                            <div className={`relative px-5 py-3 md:px-6 md:py-4 rounded-3xl shadow-xl backdrop-blur-md ${m.sender === 'client'
                              ? 'bg-slate-900/80 text-slate-100 rounded-bl-sm border border-white/10'
                              : 'bg-emerald-600/90 text-white rounded-br-sm border border-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.15)]'
                              }`}>
                              <p className="text-[14px] md:text-[15px] leading-relaxed font-medium">{m.text}</p>
                            </div>

                            <div className={`flex items-center gap-2 ${m.sender === 'salesperson' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-[10px] font-medium text-slate-500/70">
                                {getRelativeTime(m.timestamp)}
                              </span>

                              {/* FEEDBACK PILLS */}
                              {m.sender === 'salesperson' && m.score !== undefined && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-sm border border-white/5 pl-2 pr-3 py-1 rounded-full"
                                >
                                  <div className={`w-2 h-2 rounded-full ${m.sentiment === 'Positive' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : m.sentiment === 'Negative' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                                    }`} />
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
                                    {m.score}%
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* TYPING INDICATOR */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex w-full justify-start"
                    >
                      <div className="flex max-w-[85%] gap-4 flex-row">
                        <div className="mt-auto w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg border bg-gradient-to-br from-cyan-600 to-blue-800 border-cyan-400/30 text-white">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="relative px-5 py-4 md:px-6 rounded-3xl shadow-xl backdrop-blur-md bg-slate-900/80 rounded-bl-sm border border-white/10 flex items-center gap-1.5 h-[52px]">
                          <div className="w-2 h-2 rounded-full bg-cyan-400/60 animate-typing" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-cyan-400/60 animate-typing" style={{ animationDelay: '200ms' }} />
                          <div className="w-2 h-2 rounded-full bg-cyan-400/60 animate-typing" style={{ animationDelay: '400ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={chatEndRef} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* SUMMARY OVERLAY & SKELETON */}
            <AnimatePresence>
              {sessionStatus === "ending" && !rating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl px-4 md:px-6"
                >
                  <div className="flex flex-col items-center gap-8 w-full max-w-lg">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Terminal className="w-8 h-8 text-emerald-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-black text-white mb-2">Analyzing Performance</h3>
                      <p className="text-slate-400 font-medium">Synthesizing AI metrics and qualitative feedback...</p>
                    </div>

                    {/* SKELETON LOADER FOR METRICS */}
                    <div className="w-full space-y-4 mt-4 animate-pulse">
                      <div className="h-28 bg-white/5 rounded-2xl border border-white/5 w-full"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-32 bg-white/5 rounded-2xl border border-white/5"></div>
                        <div className="h-32 bg-white/5 rounded-2xl border border-white/5"></div>
                      </div>
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
                className="mt-4 space-y-6 md:space-y-8 pb-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* METRIC CARDS */}
                  <div className="bg-gradient-to-br from-emerald-500/15 to-slate-900/80 backdrop-blur-md p-6 rounded-[2rem] border border-emerald-500/30 relative overflow-hidden group shadow-[0_10px_30px_rgba(16,185,129,0.1)]">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                      <Award className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-4 drop-shadow-sm">Mastery Score</div>
                    <div className="text-5xl font-black text-white">{rating.overall_score}<span className="text-xl text-emerald-500/50">/10</span></div>
                  </div>

                  {summaryMetrics && (
                    <>
                      <div className="bg-gradient-to-br from-cyan-500/15 to-slate-900/80 backdrop-blur-md p-6 rounded-[2rem] border border-cyan-500/30 relative overflow-hidden group shadow-[0_10px_30px_rgba(6,182,212,0.1)]">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                          <AnalyzeIcon className="w-24 h-24 text-cyan-500" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-4 drop-shadow-sm">Precision</div>
                        <div className="text-5xl font-black text-white">{summaryMetrics.accuracy_percentage}<span className="text-xl text-cyan-500/50">%</span></div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/15 to-slate-900/80 backdrop-blur-md p-6 rounded-[2rem] border border-purple-500/30 relative overflow-hidden group shadow-[0_10px_30px_rgba(168,85,247,0.1)]">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                          <Target className="w-24 h-24 text-purple-500" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-4 drop-shadow-sm">Avg. Quality</div>
                        <div className="text-5xl font-black text-white">{summaryMetrics.avg_score}<span className="text-xl text-purple-500/50">%</span></div>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  {/* STRENGTHS */}
                  <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl">
                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      Tactical Strengths
                    </h4>
                    <div className="space-y-4">
                      {rating.strengths.length > 0 ? rating.strengths.map((s, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden shrink-0 mt-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                            <div className="w-full h-1/2 bg-emerald-500 group-hover:h-full transition-all duration-500" />
                          </div>
                          <p className="text-slate-300 font-medium leading-relaxed">{s}</p>
                        </div>
                      )) : <p className="text-slate-500 italic">No specific strengths identified.</p>}
                    </div>
                  </div>

                  {/* IMPROVEMENTS */}
                  <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl">
                    <h4 className="text-sm font-black uppercase tracking-widest text-amber-400 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      </div>
                      Strategic Gaps
                    </h4>
                    <div className="space-y-4">
                      {rating.improvements.length > 0 ? rating.improvements.map((s, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden shrink-0 mt-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                            <div className="w-full h-1/4 bg-amber-500 group-hover:h-full transition-all duration-500" />
                          </div>
                          <p className="text-slate-300 font-medium leading-relaxed">{s}</p>
                        </div>
                      )) : <p className="text-slate-500 italic">No specific improvements identified.</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6 relative z-10">Expert Debrief</h4>
                  <p className="text-lg md:text-xl font-medium text-slate-200 leading-relaxed italic border-l-4 border-emerald-500/40 pl-6 md:pl-8 relative z-10">
                    "{rating.detailed_feedback}"
                  </p>

                  <div className="mt-10 flex justify-start md:justify-center relative z-10">
                    <button
                      onClick={startTrainingSession}
                      className="px-8 md:px-12 py-4 md:py-5 bg-white text-black font-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.15)] flex items-center gap-3"
                    >
                      Initialize New Simulation <Target className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* INPUT FOOTER */}
        <footer className="h-24 md:h-28 flex items-center bg-transparent px-4 md:px-8 pb-4 md:pb-8 pt-2 absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
          <div className="max-w-4xl w-full mx-auto relative group pointer-events-auto">
            <form onSubmit={handleSendResponse} className="relative shadow-2xl rounded-[2rem]">
              <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" />
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={sessionStatus !== "active"}
                placeholder={sessionStatus === "active" ? "Engage with the trainee..." : rating ? "Session completed" : "Start simulation to begin engagement"}
                className="w-full h-14 md:h-16 bg-transparent relative z-10 rounded-[2rem] px-6 md:px-8 pr-16 md:pr-20 text-base md:text-lg font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all disabled:opacity-50 cursor-text"
                autoComplete="off"
              />
              <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-20">
                <button
                  type="submit"
                  disabled={sessionStatus !== "active" || !transcript.trim()}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-[1.2rem] bg-emerald-500 flex items-center justify-center text-black font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-0 disabled:scale-50 shadow-lg shadow-emerald-500/30"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />
                </button>
              </div>
            </form>
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
