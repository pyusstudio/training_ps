import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./state/authStore";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, RefreshCw, LogIn } from "lucide-react";

// ─── Session-expired modal ─────────────────────────────────────────────────────
function SessionExpiredModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden z-10"
      >
        <div className="px-10 py-12 flex flex-col items-center text-center gap-6">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-10 h-10 text-amber-500" />
          </div>

          {/* Text */}
          <div className="space-y-3">
            <p className="text-[10px] font-black tracking-[0.3em] text-indigo-600 uppercase">Security</p>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Session Expired
            </h2>
            <p className="text-[13px] font-medium text-slate-500 leading-relaxed max-w-[240px] mx-auto">
              Your credentials have expired. Please sign in again to restore access.
            </p>
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <button
              onClick={onDismiss}
              className="group w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all duration-200 shadow-lg active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Sign In Again
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
