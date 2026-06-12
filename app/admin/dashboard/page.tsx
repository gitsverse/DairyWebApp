"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon, CommandLineIcon } from "@heroicons/react/24/outline";

type UserRow = {
  user_id: string;
  email: string;
  full_name: string;
  plan_name: string;
  status: string;
  end_date: string;
  days_remaining: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustDays, setAdjustDays] = useState(0);
  const [msg, setMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient.rpc("admin_get_all_users");
    if (!error) {
      setUsers(data || []);
    } else {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function adjustDaysHandler() {
    if (!adjustUserId) {
      setMsg("Please enter a User UUID.");
      return;
    }
    setActionLoading(true);
    setMsg("");
    const { data, error } = await supabaseClient.rpc("admin_adjust_plan_days", {
      p_user_id: adjustUserId,
      p_days_delta: adjustDays,
    });

    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      setMsg(data || "Plan days updated successfully!");
      fetchUsers();
    }
    setActionLoading(false);
  }

  async function handleSignOut() {
    await supabaseClient.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <ShieldCheckIcon className="w-8 h-8 text-blue-500 shrink-0" /> Control Panel
            </h1>
            <p className="text-slate-400 text-sm mt-1">Superadmin portal for DairyWeb SaaS platform</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition duration-200 text-sm flex items-center gap-1.5"
            >
              <span>←</span> Back to Dashboard
            </button>
            <button
              onClick={handleSignOut}
              className="bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition duration-200 text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Adjust Plan Days */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 mb-10 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <CommandLineIcon className="w-5 h-5 text-blue-500 shrink-0" /> Adjust User Plan Days
          </h2>
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-slate-400 text-xs font-semibold mb-2">User UUID</label>
              <input
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={adjustUserId}
                onChange={(e) => setAdjustUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <div className="w-40">
              <label className="block text-slate-400 text-xs font-semibold mb-2">Days Delta (+/-)</label>
              <input
                type="number"
                placeholder="e.g. 30"
                value={adjustDays}
                onChange={(e) => setAdjustDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <button
              onClick={adjustDaysHandler}
              disabled={actionLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold py-3.5 px-8 rounded-2xl shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 text-sm"
            >
              {actionLoading ? "Applying..." : "Apply Days"}
            </button>
          </div>
          {msg && (
            <div className={`mt-4 p-3 rounded-2xl text-xs font-medium ${msg.startsWith("Error") ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"}`}>
              {msg}
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-6 py-5 border-b border-slate-800">
            <h3 className="text-lg font-bold text-slate-200">Registered Platform Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-xs tracking-wider font-semibold">
                <tr>
                  <th className="p-4 text-left font-medium">User / Email</th>
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Active Plan</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Expiration Date</th>
                  <th className="p-4 text-left font-medium">Days Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                      <span className="inline-block animate-pulse">Loading system tenants...</span>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                      No active users registered on the platform.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.user_id}
                      className="hover:bg-slate-800/20 transition-colors duration-150 cursor-pointer"
                      onClick={() => setAdjustUserId(u.user_id)}
                    >
                      <td className="p-4">
                        <p className="font-semibold text-white">{u.email}</p>
                        <p className="text-slate-500 text-xs font-mono mt-0.5">{u.user_id}</p>
                      </td>
                      <td className="p-4 text-slate-300 font-medium">{u.full_name || "—"}</td>
                      <td className="p-4 capitalize font-semibold">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.plan_name === "yearly" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : u.plan_name === "monthly" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-slate-800 text-slate-400"}`}>
                          {u.plan_name || "—"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.days_remaining > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                          {u.days_remaining > 0 ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-medium">{u.end_date || "—"}</td>
                      <td className="p-4">
                        <p className={`font-bold text-base ${u.days_remaining > 5 ? "text-slate-100" : u.days_remaining > 0 ? "text-amber-400 animate-pulse" : "text-slate-500"}`}>
                          {u.days_remaining ?? 0} days
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
