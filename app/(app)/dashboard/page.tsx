"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { formatDate } from "@/lib/dateUtils";
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  WalletIcon,
  PlusIcon,
  UserPlusIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface DashboardData {
  totalCustomers: number;
  todaysMilk: number;
  totalCollections: number;
  outstandingBalance: number;
  recentEntries: {
    id: string;
    date: string;
    customerName: string;
    productName: string;
    quantity: number;
    rate: number;
    amount: number;
    shift: string;
  }[];
}

const emptyDashboardData = (): DashboardData => ({
  totalCustomers: 0,
  todaysMilk: 0,
  totalCollections: 0,
  outstandingBalance: 0,
  recentEntries: [],
});

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const [data, setData] = useState<DashboardData>(emptyDashboardData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/dashboard?today=${todayStr}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-4 my-8">
        <p className="text-red-700 font-bold text-lg">Error loading dashboard</p>
        <p className="text-red-600 text-sm">{error}</p>
        <Button onClick={fetchDashboard} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeUp pb-8">
      {/* Welcome Message Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight sm:text-4xl">
            {lang === "hi" ? "नमस्ते! डेयरी प्रो में आपका स्वागत है" : "Welcome to DairyPro"}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {lang === "hi" ? "आज की स्थिति और त्वरित गतिविधियां" : "Here's today's overview and quick actions."}
          </p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" className="self-start sm:self-center">
          {lang === "hi" ? "ताज़ा करें" : "Refresh"}
        </Button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Customers */}
        <div className="bg-white rounded-[24px] border border-slate-200/60 p-5 shadow-card hover:shadow-lift transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {lang === "hi" ? "कुल ग्राहक" : "Total Customers"}
            </span>
            <UserGroupIcon className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-primary transition-colors">
            {data.totalCustomers}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-semibold">Registered customers</div>
        </div>

        {/* Today's Milk */}
        <div className="bg-white rounded-[24px] border border-slate-200/60 p-5 shadow-card hover:shadow-lift transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {lang === "hi" ? "आज का दूध" : "Today's Milk"}
            </span>
            <ClipboardDocumentListIcon className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-primary transition-colors">
            {data.todaysMilk.toFixed(1)} <span className="text-xs sm:text-sm font-bold text-slate-400">Liters</span>
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-semibold">Recorded entries for today</div>
        </div>

        {/* Total Collections */}
        <div className="bg-white rounded-[24px] border border-slate-200/60 p-5 shadow-card hover:shadow-lift transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {lang === "hi" ? "कुल कलेक्शन" : "Total Collections"}
            </span>
            <BanknotesIcon className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-800">
            ₹{data.totalCollections.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-semibold">Total payments collected</div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-[24px] border border-slate-200/60 p-5 shadow-card hover:shadow-lift transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {lang === "hi" ? "बकाया राशि" : "Outstanding Balance"}
            </span>
            <WalletIcon className="w-5 h-5 text-slate-400" />
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${data.outstandingBalance > 0 ? "text-red-600" : "text-emerald-700"}`}>
            ₹{Math.abs(data.outstandingBalance).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-semibold">
            {data.outstandingBalance >= 0 ? "Owed by customers" : "Advance holding"}
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <Card title={lang === "hi" ? "त्वरित गतिविधियां" : "Quick Actions"}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 py-2">
          <Link href="/entries">
            <button className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary to-green-600 text-white font-bold py-3 px-6 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-md duration-200">
              <PlusIcon className="w-4 h-4 shrink-0" />
              <span>{lang === "hi" ? "एंट्री जोड़ें" : "Add Entry"}</span>
            </button>
          </Link>
          <Link href="/customers?add=true">
            <button className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl active:scale-95 transition-all shadow-sm duration-200">
              <UserPlusIcon className="w-4 h-4 shrink-0 text-slate-500" />
              <span>{lang === "hi" ? "नया ग्राहक" : "Add Customer"}</span>
            </button>
          </Link>
          <Link href="/billing">
            <button className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl active:scale-95 transition-all shadow-sm duration-200">
              <DocumentTextIcon className="w-4 h-4 shrink-0 text-slate-500" />
              <span>{lang === "hi" ? "बिल बनाएं" : "Generate Bill"}</span>
            </button>
          </Link>
        </div>
      </Card>

      {/* Recent Entries */}
      <Card title={lang === "hi" ? "हाल की दूध प्रविष्टियां" : "Recent Milk Entries"}>
        {data.recentEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-semibold">
            No entries found. Go ahead and add some entries to get started.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Shift</th>
                    <th className="px-4 py-3 text-right">Quantity (Liters)</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEntries.map((e) => (
                    <tr key={e.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3.5 font-medium">{formatDate(e.date)}</td>
                      <td className="px-4 py-3.5 font-bold text-primary">{e.customerName}</td>
                      <td className="px-4 py-3.5 capitalize text-slate-600">{e.shift}</td>
                      <td className="px-4 py-3.5 text-right font-medium">{e.quantity.toFixed(1)} L</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">₹{e.rate.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">₹{e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {data.recentEntries.map((e) => (
                <div key={`mob-${e.id}`} className="border border-border rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-primary">{e.customerName}</p>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        {formatDate(e.date)} • <span className="capitalize">{e.shift}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-extrabold text-[9px]">Total</p>
                      <p className="font-bold text-slate-950">₹{e.amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-100 pt-2 font-medium">
                    <p className="text-slate-500">
                      Quantity: <span className="text-slate-950 font-bold">{e.quantity.toFixed(1)} L</span>
                    </p>
                    <p className="text-slate-500">
                      Rate: <span className="text-slate-950 font-bold">₹{e.rate.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
