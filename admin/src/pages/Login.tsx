import React, { useState } from "react";
import { login } from "../lib/api";
import { useAuth } from "../state/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, Lock, Activity, User } from "lucide-react";

export function LoginPage() {
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      setToken(token);
    } catch {
      setError("Login failed. Check credentials and backend status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-[#0a0f1a] to-slate-950 px-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900/60 border border-white/10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-10 backdrop-blur-2xl relative z-10"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mb-6 shadow-[0_10px_30px_rgba(16,185,129,0.3)] border border-emerald-300">
            <Activity className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Reflex Admin
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium tracking-wide">
            Secure Telemetry & Analytics Access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">
                Operator ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 pl-11 pr-4 py-3.5 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">
                Access Code
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 pl-11 pr-4 py-3.5 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 overflow-hidden"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-4 text-sm font-black text-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2">
              {loading ? "Authenticating..." : "Establish Link"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </span>
          </button>

          <p className="mt-6 text-[11px] font-medium text-slate-500 text-center leading-relaxed max-w-[80%] mx-auto">
            Authorized personnel only. Access attempts are logged via <code className="text-emerald-500/70 font-mono tracking-wider">auth_service</code>.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
