"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import DateInput from "@/components/ui/DateInput";
import Card from "@/components/ui/Card";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { formatDate, formatDateShort } from "@/lib/dateUtils";

interface AnalyticsData {
  totalSales: number;
  totalMilk: number;
  totalPaid: number;
  outstandingBalance: number;
  dailySales?: Record<string, number>;
  dailyMilk?: Record<string, number>;
  productSales?: Record<string, number>;
  topCustomers?: { name: string; total_purchase: number }[];
}

const emptyAnalytics = (): AnalyticsData => ({
  totalSales: 0,
  totalMilk: 0,
  totalPaid: 0,
  outstandingBalance: 0,
  dailySales: {},
  dailyMilk: {},
  productSales: {},
  topCustomers: [],
});

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getDateRange = (filter: string) => {
  const today = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (filter) {
    case "week": {
      const d = today.getDay();
      const mondayOffset = d === 0 ? -6 : 1 - d;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + mondayOffset);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    }
    case "month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
  }
  return {
    start: toLocalDate(startDate),
    end: toLocalDate(endDate),
  };
};

export default function AnalyticsPage() {
  const { t, lang } = useI18n();
  const [data, setData] = useState<AnalyticsData>(emptyAnalytics());
  const [filter, setFilter] = useState("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (currentFilter: string, customStart?: string, customEnd?: string) => {
    setError(null);
    setLoading(true);
    const range =
      currentFilter === "custom" && customStart && customEnd
        ? { start: customStart, end: customEnd }
        : getDateRange(currentFilter);
    try {
      const res = await fetch(
        `/api/analytics?start_date=${encodeURIComponent(range.start)}&end_date=${encodeURIComponent(range.end)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch analytics");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(emptyAnalytics());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (filter === "custom") {
      if (startDate && endDate) {
        fetchAnalytics(filter, startDate, endDate);
      }
      return;
    }
    fetchAnalytics(filter);
  }, [filter, startDate, endDate, fetchAnalytics]);

  return (
    <div className="space-y-6 animate-fadeUp pb-8">
      {/* Header and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {lang === "hi" ? "डेयरी विश्लेषण" : "Analytics"}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {lang === "hi" ? "अवधि के अनुसार उत्पादन और वित्तीय विश्लेषण" : "Financial and milk volume performance."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={filter === "week" ? "primary" : "outline"}
            onClick={() => setFilter("week")}
            className="rounded-xl px-4 py-2"
          >
            {lang === "hi" ? "यह सप्ताह" : "This Week"}
          </Button>
          <Button
            type="button"
            variant={filter === "month" ? "primary" : "outline"}
            onClick={() => setFilter("month")}
            className="rounded-xl px-4 py-2"
          >
            {lang === "hi" ? "यह महीना" : "This Month"}
          </Button>
          <Button
            type="button"
            variant={filter === "custom" ? "primary" : "outline"}
            onClick={() => setFilter("custom")}
            className="rounded-xl px-4 py-2"
          >
            {lang === "hi" ? "कस्टम अवधि" : "Custom"}
          </Button>
        </div>
      </div>

      {filter === "custom" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
          <DateInput
            id="analytics-start"
            label={lang === "hi" ? "शुरू तारीख" : "Start Date"}
            value={startDate}
            onChange={setStartDate}
            required
          />
          <DateInput
            id="analytics-end"
            label={lang === "hi" ? "अंतिम तारीख" : "End Date"}
            value={endDate}
            onChange={setEndDate}
            required
          />
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => fetchAnalytics("custom", startDate, endDate)}
              disabled={!startDate || !endDate}
              className="w-full h-11"
            >
              {lang === "hi" ? "लागू करें" : "Apply"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">{t("common.loading")}</p>
        </div>
      ) : null}

      {error && !loading ? (
        <p className="text-destructive text-center py-6">{error}</p>
      ) : null}

      {!loading && !error && (
        <div className="space-y-6">
          {/* 4 Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title={lang === "hi" ? "कुल बिक्री" : "Sales Revenue"}>
              <p className="text-2xl font-black text-slate-900">₹{data.totalSales.toFixed(2)}</p>
            </Card>
            <Card title={lang === "hi" ? "दूध की मात्रा" : "Milk Volume"}>
              <p className="text-2xl font-black text-primary">{data.totalMilk.toFixed(2)} L</p>
            </Card>
            <Card title={lang === "hi" ? "भुगतान प्राप्त" : "Collections"}>
              <p className="text-2xl font-black text-emerald-800">₹{data.totalPaid.toFixed(2)}</p>
            </Card>
            <Card title={lang === "hi" ? "बकाया बैलेंस" : "Outstanding"}>
              <p className={`text-2xl font-black ${data.outstandingBalance > 0 ? "text-red-600" : "text-emerald-700"}`}>
                ₹{Math.abs(data.outstandingBalance).toFixed(2)}
              </p>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Daily Milk Volume Trend (SVG line chart) */}
            <Card title={lang === "hi" ? "दैनिक दूध उत्पादन मात्रा" : "Daily Milk Volume Trend"}>
              {Object.keys(data.dailyMilk || {}).length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-400 font-semibold">
                  No milk entries recorded in this period.
                </div>
              ) : (
                (() => {
                  const dailyArr = Object.entries(data.dailyMilk || {}).sort(([a], [b]) => a.localeCompare(b));
                  const values = dailyArr.map(([, v]) => v);
                  const maxVal = Math.max(...values, 5);

                  const CHART_W = 600;
                  const CHART_H = 220;
                  const PAD_LEFT = 50;
                  const PAD_RIGHT = 20;
                  const PAD_TOP = 16;
                  const PAD_BOTTOM = 36;
                  const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
                  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

                  const niceMax = Math.ceil(maxVal * 1.15);
                  const Y_STEPS = 4;

                  const xOf = (i: number) =>
                    PAD_LEFT + (dailyArr.length === 1 ? plotW / 2 : (i / (dailyArr.length - 1)) * plotW);
                  const yOf = (v: number) => PAD_TOP + plotH - (v / niceMax) * plotH;

                  const pts = dailyArr.map(([, v], i) => ({ x: xOf(i), y: yOf(v) }));

                  const smoothPath = pts.reduce((acc, pt, i) => {
                    if (i === 0) return `M ${pt.x} ${pt.y}`;
                    const prev = pts[i - 1];
                    const cpX = (prev.x + pt.x) / 2;
                    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
                  }, "");

                  const areaPath = `${smoothPath} L ${pts[pts.length - 1].x} ${PAD_TOP + plotH} L ${pts[0].x} ${PAD_TOP + plotH} Z`;

                  return (
                    <div className="w-full overflow-x-auto scrollbar-hide">
                      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-[220px]" style={{ minWidth: 320 }}>
                        <defs>
                          <linearGradient id="milkVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2d7a3a" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#2d7a3a" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Y-Gridlines & Labels */}
                        {Array.from({ length: Y_STEPS + 1 }, (_, i) => {
                          const val = (niceMax / Y_STEPS) * i;
                          const y = yOf(val);
                          return (
                            <g key={i}>
                              <line
                                x1={PAD_LEFT}
                                x2={CHART_W - PAD_RIGHT}
                                y1={y}
                                y2={y}
                                stroke="#e2e8f0"
                                strokeWidth="0.8"
                                strokeDasharray="4 4"
                              />
                              <text
                                x={PAD_LEFT - 8}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="10"
                                fill="#94a3b8"
                                className="font-bold"
                              >
                                {val.toFixed(0)} L
                              </text>
                            </g>
                          );
                        })}

                        {/* Gradient Fill */}
                        <path d={areaPath} fill="url(#milkVolumeGrad)" />

                        {/* Line */}
                        <path
                          d={smoothPath}
                          fill="none"
                          stroke="#2d7a3a"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Dots & Labels */}
                        {dailyArr.map(([date, val], i) => {
                          const x = pts[i].x;
                          const y = pts[i].y;
                          const label = formatDateShort(date);
                          const showLabel = dailyArr.length < 8 || i % Math.ceil(dailyArr.length / 7) === 0 || i === dailyArr.length - 1;

                          return (
                            <g key={date}>
                              <circle cx={x} cy={y} r="4.5" fill="white" stroke="#2d7a3a" strokeWidth="2.5">
                                <title>{date}: {val.toFixed(1)} Liters</title>
                              </circle>
                              {showLabel && (
                                <text
                                  x={x}
                                  y={PAD_TOP + plotH + 20}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fill="#64748b"
                                  className="font-bold"
                                >
                                  {label}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()
              )}
            </Card>

            {/* 2. Revenue Collected vs Outstanding (SVG Column Comparison) */}
            <Card title={lang === "hi" ? "कलेक्शन बनाम बकाया तुलना" : "Revenue Collected vs Outstanding"}>
              {data.totalSales === 0 && data.totalPaid === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-400 font-semibold">
                  No sales or collections recorded in this period.
                </div>
              ) : (
                (() => {
                  const maxVal = Math.max(data.totalPaid, Math.abs(data.outstandingBalance), 100);
                  const scaleMax = maxVal * 1.15;

                  const CHART_W = 400;
                  const CHART_H = 220;
                  const PAD_LEFT = 40;
                  const PAD_TOP = 20;
                  const PAD_BOTTOM = 30;
                  const plotW = CHART_W - PAD_LEFT - 40;
                  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

                  // Bar metrics
                  const barW = 60;
                  const col1X = PAD_LEFT + plotW * 0.25 - barW / 2;
                  const col2X = PAD_LEFT + plotW * 0.75 - barW / 2;

                  const paidH = (data.totalPaid / scaleMax) * plotH;
                  const outH = (Math.max(0, data.outstandingBalance) / scaleMax) * plotH;

                  const paidY = PAD_TOP + plotH - paidH;
                  const outY = PAD_TOP + plotH - outH;

                  return (
                    <div className="flex flex-col items-center justify-center h-[220px]">
                      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full max-w-sm h-full">
                        {/* Horizontal base line */}
                        <line
                          x1={PAD_LEFT}
                          x2={CHART_W - 20}
                          y1={PAD_TOP + plotH}
                          y2={PAD_TOP + plotH}
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                        />

                        {/* Bar 1: Revenue Collected */}
                        <rect
                          x={col1X}
                          y={paidY}
                          width={barW}
                          height={paidH}
                          fill="#2d7a3a"
                          rx="8"
                          className="transition-all duration-500"
                        />
                        <text
                          x={col1X + barW / 2}
                          y={paidY - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#2d7a3a"
                          className="font-extrabold"
                        >
                          ₹{data.totalPaid.toFixed(0)}
                        </text>
                        <text
                          x={col1X + barW / 2}
                          y={PAD_TOP + plotH + 20}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#475569"
                          className="font-bold"
                        >
                          {lang === "hi" ? "प्राप्त भुगतान" : "Collected"}
                        </text>

                        {/* Bar 2: Outstanding Balance */}
                        <rect
                          x={col2X}
                          y={outY}
                          width={barW}
                          height={outH}
                          fill={data.outstandingBalance > 0 ? "#ef4444" : "#10b981"}
                          rx="8"
                          className="transition-all duration-500"
                        />
                        <text
                          x={col2X + barW / 2}
                          y={outY - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fill={data.outstandingBalance > 0 ? "#ef4444" : "#10b981"}
                          className="font-extrabold"
                        >
                          ₹{Math.abs(data.outstandingBalance).toFixed(0)}
                        </text>
                        <text
                          x={col2X + barW / 2}
                          y={PAD_TOP + plotH + 20}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#475569"
                          className="font-bold"
                        >
                          {lang === "hi" ? "बकाया राशि" : "Outstanding"}
                        </text>
                      </svg>
                    </div>
                  );
                })()
              )}
            </Card>
          </div>

          {/* Top Customers Card */}
          {data.topCustomers && data.topCustomers.length > 0 && (
            <Card title={lang === "hi" ? "शीर्ष ग्राहक (इस अवधि में)" : "Top Customers (In Selected Period)"}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3 text-right">Total Purchase Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c) => (
                      <tr key={c.name} className="border-b border-border hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">₹{c.total_purchase.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
