"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const SUPERADMIN_EMAIL = "atifazmi2005@gmail.com";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (email.trim().toLowerCase() !== SUPERADMIN_EMAIL) {
      setError("Access denied. Superadmin only.");
      setLoading(false);
      return;
    }

    const { data, error: loginErr } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginErr || data.user?.email !== SUPERADMIN_EMAIL) {
      setError("Access denied. Superadmin only.");
      await supabaseClient.auth.signOut();
    } else {
      router.push("/admin/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans p-6 relative overflow-hidden">
      {/* Mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[0] bg-slate-950">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl animate-fadeUp">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-3xl text-white">🛡️</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Superadmin Login
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Authorized admin access only
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Admin Email
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 text-sm"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 text-sm mt-2"
          >
            {loading ? "Logging in..." : "Login as Superadmin"}
          </button>
        </form>
      </div>
    </div>
  );
}
