import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./state/authStore";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, RefreshCw, LogIn } from "lucide-react";

// ─── Session-expired modal ─────────────────────────────────────────────────────
function SessionExpiredModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
         style={{ background: "rgba(6,9,26,0.85)", backdropFilter: "blur(18px)" }}>
      {/* Background glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-violet-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] bg-red-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full max-w-sm bg-[#0D1130]/90 border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(124,58,237,0.2)] overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500" />

        <div className="px-8 py-8 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-violet-500/20 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)]">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>

          {/* Text */}
          <div>
            <p className="text-[10px] font-black tracking-[0.25em] text-violet-400 uppercase mb-2">
              Reflex OS · Security
            </p>
            <h2 className="text-xl font-black text-white leading-tight mb-3">
              Session Expired
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your admin session has timed out. Please sign in again to continue
              accessing the command centre.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/5" />

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onDismiss}
              className="group w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-black text-sm tracking-wide transition-all duration-200 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] active:scale-95"
            >
              <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              Sign In Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs tracking-wide transition-all duration-200 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Page
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Inner app (needs AuthContext) ─────────────────────────────────────────────
function AppInner() {
  const { token, setToken } = useAuth();
  const [sessionExpired, setSessionExpired] = useState(false);

  // Listen for 401s fired by the api.ts wrapper
  const handleExpiry = useCallback(() => {
    if (token) setSessionExpired(true);   // only show if we're actually logged in
  }, [token]);

  useEffect(() => {
    window.addEventListener("sessionExpired", handleExpiry);
    return () => window.removeEventListener("sessionExpired", handleExpiry);
  }, [handleExpiry]);

  const handleDismiss = useCallback(() => {
    setSessionExpired(false);
    setToken(null);         // clear token → go back to login
  }, [setToken]);

  return (
    <>
      {token ? <DashboardPage /> : <LoginPage />}

      <AnimatePresence>
        {sessionExpired && (
          <SessionExpiredModal onDismiss={handleDismiss} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
