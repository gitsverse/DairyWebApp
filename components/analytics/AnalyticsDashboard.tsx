import React from "react";
import Card from "@/components/ui/Card";
import { formatDateShort } from "@/lib/dateUtils";

export interface AnalyticsDashboardData {
  totalSales: number;
  totalMilk: number;
  totalPaid: number;
  outstandingBalance: number;
  productSales?: Record<string, number>;
  dailySales?: Record<string, number>;
  topCustomers?: { name: string; total_purchase: number }[];
}

interface Props {
  data: AnalyticsDashboardData;
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card title={title}>
      <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
    </Card>
  );
}

const AnalyticsDashboard: React.FC<Props> = ({ data }) => {
  const daily = data.dailySales
    ? Object.entries(data.dailySales).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const maxDay = Math.max(1, ...daily.map(([, v]) => v));

  const productEntries = data.productSales ? Object.entries(data.productSales) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <StatCard title="Total sales" value={`₹${data.totalSales.toFixed(2)}`} />
        <StatCard
          title="Milk (liters)"
          value={data.totalMilk.toFixed(2)}
        />
        <StatCard
          title="Payments received"
          value={`₹${data.totalPaid.toFixed(2)}`}
        />
        <StatCard
          title="Outstanding"
          value={`₹${data.outstandingBalance.toFixed(2)}`}
        />
      </div>

      {productEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {productEntries.map(([name, amount]) => (
            <Card key={name} title={`Sales — ${name.charAt(0).toUpperCase() + name.slice(1)}`}>
              <p className="text-xl font-semibold text-primary">
                ₹{amount.toFixed(2)}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {daily.length > 0 && (() => {
        const CHART_W = 700;
        const CHART_H = 220;
        const PAD_LEFT = 72;
        const PAD_RIGHT = 20;
        const PAD_TOP = 16;
        const PAD_BOTTOM = 36;
        const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
        const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

        const values = daily.map(([, v]) => v);
        const maxVal = Math.max(...values, 1);

        const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
        const niceMax = Math.ceil((maxVal * 1.2) / magnitude) * magnitude;
        const Y_STEPS = 4;

        const xOf = (i: number) =>
          PAD_LEFT + (daily.length === 1 ? plotW / 2 : (i / (daily.length - 1)) * plotW);
        const yOf = (v: number) => PAD_TOP + plotH - (v / niceMax) * plotH;

        const pts = daily.map(([, v], i) => ({ x: xOf(i), y: yOf(v) }));

        const smoothPath = pts.reduce((acc, pt, i) => {
          if (i === 0) return `M ${pt.x} ${pt.y}`;
          const prev = pts[i - 1];
          const cpX = (prev.x + pt.x) / 2;
          return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
        }, "");

        const areaPath = `${smoothPath} L ${pts[pts.length - 1].x} ${PAD_TOP + plotH} L ${pts[0].x} ${PAD_TOP + plotH} Z`;

        const fmtY = (v: number) =>
          v >= 100000 ? `₹${(v / 100000).toFixed(1)}L`
          : v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
          : `₹${v.toFixed(0)}`;

        return (
          <Card title="Daily sales trend">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                className="w-full h-[200px] lg:h-[300px]"
                style={{ minWidth: 280 }}
                aria-label="Daily sales trend"
              >
                <defs>
                  <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Background */}
                <rect
                  x={PAD_LEFT} y={PAD_TOP}
                  width={plotW} height={plotH}
                  fill="#f8fafc" rx="4"
                />

                {/* Horizontal dashed grid lines + Y labels */}
                {Array.from({ length: Y_STEPS + 1 }, (_, i) => {
                  const val = (niceMax / Y_STEPS) * i;
                  const y = yOf(val);
                  return (
                    <g key={i}>
                      <line
                        x1={PAD_LEFT} x2={PAD_LEFT + plotW}
                        y1={y} y2={y}
                        stroke={i === 0 ? "#cbd5e1" : "#e2e8f0"}
                        strokeWidth={i === 0 ? 1 : 0.8}
                        strokeDasharray={i === 0 ? "0" : "4 3"}
                      />
                      <text
                        x={PAD_LEFT - 8} y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                        fontFamily="system-ui, sans-serif"
                      >
                        {fmtY(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Gradient fill */}
                <path d={areaPath} fill="url(#lineAreaGrad)" />

                {/* Smooth line */}
                <path
                  d={smoothPath}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dots + X labels */}
                {daily.map(([date, val], i) => {
                  const x = pts[i].x;
                  const y = pts[i].y;
                  const xLabel = formatDateShort(date);
                  
                  // Dynamically step label rendering to prevent overlapping
                  const labelStep = Math.max(1, Math.ceil(daily.length / 8));
                  const showLabel = i % labelStep === 0 || i === daily.length - 1;
                  
                  // Prevent the last label from overlapping if it is too close to the previous one
                  const isLastOverlap =
                    i === daily.length - 1 &&
                    (daily.length - 1) % labelStep !== 0 &&
                    ((daily.length - 1) % labelStep) < (labelStep / 1.5);
                  
                  return (
                    <g key={date}>
                      <circle cx={x} cy={y} r="4.5" fill="white" stroke="#3b82f6" strokeWidth="2">
                        <title>{xLabel}: {fmtY(val)}</title>
                      </circle>
                      {showLabel && !isLastOverlap && (
                        <text
                          x={x} y={PAD_TOP + plotH + 22}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#64748b"
                          fontFamily="system-ui, sans-serif"
                        >
                          {xLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </Card>
        );
      })()}

      {data.topCustomers && data.topCustomers.length > 0 && (
        <Card title="Top customers (period)">
          <ul className="space-y-2">
            {data.topCustomers.map((c) => (
              <li
                key={c.name}
                className="flex justify-between items-center border-b border-border/60 pb-2 last:border-0"
              >
                <span className="text-foreground">{c.name}</span>
                <span className="font-semibold text-primary">
                  ₹{c.total_purchase.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
    </div>
  );
};

export default AnalyticsDashboard;
