import React, { useState } from "react";
import { login } from "../lib/api";
import { useAuth } from "../state/authStore";

export function LoginPage() {
  const { setToken } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
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
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black px-4">
      <div className="w-full max-w-md bg-card/80 border border-zinc-800 rounded-2xl shadow-xl p-8 backdrop-blur">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-[0.25em] text-zinc-500 uppercase">
            Reflex Training
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-50">
            Admin dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in to monitor sessions and scoring in real time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-3 text-[11px] text-zinc-500">
            Demo credentials are prefilled. Change them in the backend{" "}
            <code className="bg-zinc-900/80 px-1 py-0.5 rounded text-[10px]">
              auth_service.ensure_default_admin
            </code>{" "}
            before deploying anywhere public.
          </p>
        </form>
      </div>
    </div>
  );
}
