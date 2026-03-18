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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Activity,
} from "lucide-react";
import { createTrainingSocket } from "./lib/ws";
import { PersonaSelector, PersonaId } from "./components/PersonaSelector";
import { useVoice } from "./lib/useVoice";
 
const formatLabel = (label: string) => {
  if (typeof label !== 'string') return label;
  return label
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
  strengths: (string | { description: string; score?: number })[];
  improvements: (string | { description: string; score?: number })[];
  detailed_feedback: {
    customer_engagement?: string;
    needs_assessment_and_pitch?: string;
    objection_handling_and_closing?: string;
    areas_for_improvement?: string[];
    error?: string;
  };
  performance_debrief?: string;
};

const MarkdownText = ({ content }: { content: string }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-4 text-slate-300 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return <h4 key={i} className="text-violet-400 font-black uppercase tracking-widest text-[11px] mt-8 mb-4 border-b border-white/10 pb-2">{trimmed.replace(/^###\s+/, '')}</h4>;
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const parts = trimmed.replace(/^[\*\-]\s+/, '').split('**');
          return (
            <div key={i} className="flex gap-3 items-start pl-4">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0" />
              <p className="text-sm">{parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-white font-bold">{part}</strong> : part)}</p>
            </div>
          );
        }
        if (trimmed === '') return <div key={i} className="h-2" />;
        const parts = line.split('**');
        return <p key={i} className="text-sm">{parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-white font-bold">{part}</strong> : part)}</p>;
      })}
    </div>
  );
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
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>("elena");
  const { isListening, isTtsEnabled, startListening, stopListening, speak, toggleTts, supported: voiceSupported } = useVoice();

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
              text: "Session started. The AI customer persona will greet you shortly.",
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
            
            // Speak the incoming message
            if (data.text) {
              speak(data.text);
            }

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
              performance_debrief: data.performance_debrief,
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
      source: "app",
      persona_id: selectedPersonaId
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
    
    // Stop listening after sending if it was listening
    if (isListening) {
      stopListening();
    }
  }

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text, isFinal) => {
        setTranscript(text);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRelativeTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-[#06091A] via-[#0a0f1e] to-[#060714] text-slate-200 font-sans selection:bg-violet-500/30">

      {/* Premium Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative w-full max-w-[100vw] z-10">

        {/* TOP BAR */}
        <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-3 md:px-8 bg-[#06091A]/60 backdrop-blur-2xl z-20 shrink-0">
          <div className="flex items-center gap-2 md:gap-6 min-w-0">
            <div className="flex flex-col min-w-0">
              <h2 className="text-sm md:text-base font-black text-white truncate tracking-tight uppercase">Reflex Training OS</h2>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500 animate-pulse"}`} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {connected ? "Neural Link Established" : reconnecting ? "Signal Search..." : "Link Severed"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <AnimatePresence>
              {sessionStatus === "active" && timeRemaining !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl pl-4 pr-1.5 py-1.5 shadow-2xl"
                >
                  <span className={`text-xs font-mono font-black ${timeRemaining < 30 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                  <button
                    onClick={endTrainingSession}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                    title="End Session"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-10 h-10 rounded-xl border border-white/10 p-0.5 bg-white/5 backdrop-blur-sm hidden md:block group relative">
              <div className="w-full h-full rounded-xl bg-black/50 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={toggleTts}>
                {isTtsEnabled ? <Volume2 className="w-5 h-5 text-violet-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl border border-white/10 p-0.5 bg-white/5 backdrop-blur-sm hidden md:block">
              <div className="w-full h-full rounded-xl bg-black/50 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          </div>
        </header>

        {/* CHAT CONTAINER */}
        <div className="flex-1 overflow-y-auto px-2 py-4 md:px-4 md:py-8 relative scroll-smooth bg-transparent h-full custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 w-full pb-32 md:pb-40">

            <AnimatePresence mode="popLayout">
              {!sessionId && !rating && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] text-center px-4"
                >
                  <div className="relative mb-10">
                    <div className="w-24 h-24 rounded-[2rem] bg-violet-600/10 backdrop-blur-md flex items-center justify-center border border-violet-500/20 shadow-[0_0_30px_rgba(124,58,237,0.15)] overflow-hidden">
                      <Bot className="w-12 h-12 text-violet-400" />
                    </div>
                  </div>

                  <h3 className="text-2xl md:text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Neural Sync Initialization</h3>
                  <p className="max-w-md text-slate-400 text-base md:text-lg leading-relaxed mb-10 font-medium tracking-tight">
                    Practice elite sales maneuvers with advanced AI personas in a controlled high-fidelity simulation.
                  </p>

                  <PersonaSelector 
                    selectedId={selectedPersonaId} 
                    onSelect={setSelectedPersonaId} 
                    disabled={!connected}
                  />

                  <button
                    onClick={startTrainingSession}
                    disabled={!connected}
                    className="group relative px-10 py-5 bg-violet-600 rounded-[2rem] text-white font-black text-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-30 shadow-2xl shadow-violet-600/20 border border-violet-400/30 flex items-center gap-3 w-full max-w-[320px] justify-center overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      ENGAGE SIMULATION <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </motion.div>
              )}

              {/* MESSAGE LOG */}
              {messages.length > 0 && (
                <motion.div className="space-y-8 w-full">
                  {messages.map((m, idx) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`flex w-full ${m.sender === 'client' ? 'justify-start' : m.sender === 'salesperson' ? 'justify-end' : 'justify-center'}`}
                    >
                      {m.sender === 'system' ? (
                        <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-md border border-white/5 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-violet-400/80 shadow-2xl">
                          <Terminal className="w-3.5 h-3.5 shrink-0" />
                          <span>{m.text}</span>
                        </div>
                      ) : (
                        <div className={`flex max-w-[95%] md:max-w-[80%] gap-4 ${m.sender === 'salesperson' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`mt-auto w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl border transition-all duration-500 ${m.sender === 'client'
                            ? 'bg-violet-600/20 border-violet-500/20 text-violet-400 shadow-[0_0_20px_rgba(124,58,237,0.1)]'
                            : 'bg-white/5 border-white/10 text-slate-300'
                            }`}>
                            {m.sender === 'client' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>

                          <div className={`flex flex-col gap-2 ${m.sender === 'salesperson' ? 'items-end' : 'items-start'}`}>
                            <div className={`relative px-6 py-4 rounded-[2rem] shadow-2xl backdrop-blur-3xl border transition-all duration-300 ${m.sender === 'client'
                              ? 'bg-white/[0.03] text-slate-100 rounded-bl-none border-white/5'
                              : 'bg-violet-600/10 text-white rounded-br-none border-violet-500/20 shadow-[0_0_30px_rgba(124,58,237,0.05)]'
                              }`}>
                              <p className="text-[15px] leading-relaxed font-medium">{m.text}</p>
                            </div>

                            <div className={`flex items-center gap-3 ${m.sender === 'salesperson' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                {getRelativeTime(m.timestamp)}
                              </span>

                              {m.sender === 'salesperson' && m.score !== undefined && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1 rounded-lg"
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${m.score >= 80 ? 'bg-violet-400 shadow-[0_0_8px_rgba(124,58,237,0.6)]' : m.score >= 60 ? 'bg-amber-400' : 'bg-red-500'}`} />
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {m.score}% ACCURACY
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
                      <div className="flex max-w-[95%] md:max-w-[85%] gap-4 flex-row">
                        <div className="mt-auto w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border bg-violet-600/20 border-violet-500/20 text-violet-400">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="px-6 py-5 rounded-[2rem] shadow-xl backdrop-blur-3xl bg-white/[0.03] rounded-bl-none border border-white/5 flex items-center gap-1.5 h-[56px]">
                          <div className="w-2 h-2 rounded-full bg-violet-400/40 animate-typing" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-violet-400/40 animate-typing" style={{ animationDelay: '200ms' }} />
                          <div className="w-2 h-2 rounded-full bg-violet-400/40 animate-typing" style={{ animationDelay: '400ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

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
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#06091A]/90 backdrop-blur-2xl px-6"
                >
                  <div className="flex flex-col items-center gap-8 w-full max-w-lg">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-4 border-white/5 rounded-[2rem]" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-[2rem] shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="w-8 h-8 text-violet-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Data Synchronization</h3>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Aggregating behavioral metrics and neural feedback...</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FINAL METRICS REPORT */}
            {rating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 space-y-10 pb-20"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[2.5rem] border border-violet-500/20 relative overflow-hidden group shadow-2xl">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 mb-6 font-mono">Behavioral Match</div>
                    <div className="text-6xl font-black text-white tracking-tighter">{rating.overall_score}<span className="text-xl text-violet-500/30">/10</span></div>
                  </div>

                  {summaryMetrics && (
                    <>
                      <div className="bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[2.5rem] border border-cyan-500/20 relative overflow-hidden group shadow-2xl">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-6 font-mono">Precision Log</div>
                        <div className="text-6xl font-black text-white tracking-tighter">{summaryMetrics.accuracy_percentage}<span className="text-xl text-cyan-500/30">%</span></div>
                      </div>
                      <div className="bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[2.5rem] border border-amber-500/20 relative overflow-hidden group shadow-2xl">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 mb-6 font-mono">Signal Quality</div>
                        <div className="text-6xl font-black text-white tracking-tighter">{summaryMetrics.avg_score}<span className="text-xl text-amber-500/30">%</span></div>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 mb-8 flex items-center gap-3">
                       Elite Performance
                    </h4>
                    <div className="space-y-5">
                      {rating.strengths.map((s, i) => {
                        const description = typeof s === 'string' ? s : s.description;
                        const score = typeof s === 'string' ? null : s.score;
                        return (
                          <div key={i} className="flex gap-5 group">
                            <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden shrink-0 mt-1">
                              <div 
                                className="w-full bg-emerald-500 group-hover:h-full transition-all duration-500" 
                                style={{ height: score != null ? `${score * 10}%` : '50%' }}
                              />
                            </div>
                            <div className="flex flex-col">
                              <p className="text-slate-300 font-medium leading-relaxed">{formatLabel(description)}</p>
                              {score != null && (
                                <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mt-1">
                                  Impact: {score}/10
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-amber-400 mb-8 flex items-center gap-3">
                       Strategic Friction
                    </h4>
                    <div className="space-y-5">
                      {rating.improvements.map((s, i) => {
                        const description = typeof s === 'string' ? s : s.description;
                        const score = typeof s === 'string' ? null : s.score;
                        return (
                          <div key={i} className="flex gap-5 group">
                            <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden shrink-0 mt-1">
                              <div 
                                className="w-full bg-amber-500 group-hover:h-full transition-all duration-500" 
                                style={{ height: score != null ? `${score * 10}%` : '25%' }}
                              />
                            </div>
                            <div className="flex flex-col">
                              <p className="text-slate-300 font-medium leading-relaxed">{formatLabel(description)}</p>
                              {score != null && (
                                <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest mt-1">
                                  Severity: {score}/10
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-violet-600/10 to-transparent backdrop-blur-2xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-8">
                     <h4 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-10 text-center italic">Advanced Performance Debrief</h4>
                     
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="space-y-8">
                           <div>
                             <h5 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-2">Engagement Control</h5>
                             <p className="text-sm text-slate-300 leading-relaxed font-medium">{rating.detailed_feedback.customer_engagement}</p>
                           </div>
                        </div>
                        <div className="space-y-8">
                           <div>
                             <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">Assessment & Pitch</h5>
                             <p className="text-sm text-slate-300 leading-relaxed font-medium">{rating.detailed_feedback.needs_assessment_and_pitch}</p>
                           </div>
                        </div>
                        <div className="space-y-8">
                           <div>
                             <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">Tactical Close</h5>
                             <p className="text-sm text-slate-300 leading-relaxed font-medium">{rating.detailed_feedback.objection_handling_and_closing}</p>
                           </div>
                        </div>
                     </div>

                     {rating.performance_debrief && (
                       <div className="mt-12 bg-[#0A0D1E] p-10 rounded-[3rem] border border-violet-500/20 shadow-[inset_0_0_50px_rgba(124,58,237,0.05)]">
                         <h5 className="text-[12px] font-black text-violet-400 uppercase tracking-[0.4em] mb-10 text-center">Narrative Analysis & Coaching Roadmap</h5>
                         <MarkdownText content={rating.performance_debrief} />
                       </div>
                     )}

                     <div className="mt-8">
                        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                           <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Neural Takeaways</h5>
                           <ul className="space-y-4">
                               {Array.isArray(rating.detailed_feedback.areas_for_improvement) && rating.detailed_feedback.areas_for_improvement.map((item, idx) => (
                                 <li key={idx} className="flex gap-4 text-slate-300 font-medium text-sm italic opacity-80 decoration-violet-500/50 underline-offset-4 underline">
                                   {item}
                                 </li>
                               ))}
                           </ul>
                        </div>
                     </div>

                    <div className="pt-12 flex justify-center">
                      <button
                        onClick={startTrainingSession}
                        className="px-14 py-6 bg-white text-black font-black rounded-[2rem] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10 flex items-center gap-4 text-lg"
                      >
                        RESTART SIMULATION <Target className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* INPUT FOOTER */}
        <footer className="h-24 md:h-32 flex items-center bg-transparent px-2 md:px-8 pb-6 md:pb-10 pt-2 absolute bottom-0 left-0 right-0 z-30 pointer-events-none w-full">
          <div className="max-w-4xl w-full mx-auto relative group pointer-events-auto">
            <form onSubmit={handleSendResponse} className="relative shadow-2xl rounded-[2.5rem] mx-2 md:mx-0">
              <div className="absolute inset-0 bg-[#06091A]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl" />
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={sessionStatus !== "active"}
                placeholder={sessionStatus === "active" ? "Awaiting neural input..." : "simulation idle"}
                className="w-full h-14 md:h-20 bg-transparent relative z-10 rounded-[2.5rem] px-8 md:px-10 pr-20 md:pr-24 text-base md:text-xl font-medium text-white placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-violet-600/10 transition-all disabled:opacity-30 uppercase tracking-tight"
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex gap-2">
                {voiceSupported && sessionStatus === "active" && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-[1.8rem] flex items-center justify-center transition-all bg-white/5 border border-white/10 ${
                      isListening ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'text-slate-400'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={sessionStatus !== "active" || !transcript.trim()}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-[1.8rem] bg-violet-600 flex items-center justify-center text-white font-bold transition-all hover:scale-105 active:scale-95 disabled:scale-0 shadow-lg shadow-violet-600/20"
                >
                  <Send className="w-5 h-5 md:w-6 md:h-6 fill-current" />
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
