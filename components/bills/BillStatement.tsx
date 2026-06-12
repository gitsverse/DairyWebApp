"use client";

import React from "react";
import { formatDate } from "@/lib/dateUtils";

export type BillLine = {
  date: string;
  kind: string;
  detail: string;
  debit: number;
  credit: number;
  quantity?: number;
  shift?: "morning" | "evening";
  productName?: string;
  productUnit?: string;
  pricePerUnit?: number;
};

export type BillStatementProps = {
  dairyName: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  gst?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  periodLabel: string;
  lines: BillLine[];
  openingBalance: number;
  totalSales: number;
  totalPaid: number;
  finalBalance: number;
  viewMode?: "grid" | "list";
};

export default function BillStatement({
  dairyName,
  tagline,
  address,
  phone,
  gst,
  customerName,
  customerPhone,
  customerAddress,
  periodLabel,
  lines,
  openingBalance,
  totalSales,
  totalPaid,
  finalBalance,
  viewMode = "grid",
}: BillStatementProps) {
  // Extract all unique dates from the lines array in order
  const dates: string[] = [];
  for (const line of lines) {
    if (!dates.includes(line.date)) {
      dates.push(line.date);
    }
  }
  dates.sort();

  const grid: Record<string, { morning: number; evening: number }> = {};
  for (const dateStr of dates) {
    grid[dateStr] = { morning: 0, evening: 0 };
  }

  let totalMilkLiters = 0;
  let detectedRate = 0;

  for (const line of lines) {
    if (line.kind.toLowerCase() === "sale" && line.productName === "milk" && line.quantity) {
      if (grid[line.date] && line.shift) {
        grid[line.date][line.shift] += line.quantity;
        totalMilkLiters += line.quantity;
        if (detectedRate === 0 && line.debit) {
          detectedRate = line.debit / line.quantity;
        }
      }
    }
  }

  // Fallback to extract rate from detail if direct price extraction didn't work
  if (detectedRate === 0) {
    for (const line of lines) {
      if (line.kind.toLowerCase() === "sale" && line.detail !== "X") {
        const match = line.detail.match(/@\s*₹?\s*([0-9.]+)/);
        if (match) {
          detectedRate = parseFloat(match[1]);
          break;
        }
      }
    }
  }
  if (detectedRate === 0) {
    detectedRate = 60;
  }

  // Extract non-milk sales (other items like ghee)
  let otherItemsAmount = 0;
  const otherItemsList: string[] = [];
  const otherItemsGrouped: Record<string, { quantity: number; amount: number; unit: string; rate: number }> = {};

  for (const line of lines) {
    if (line.kind.toLowerCase() === "sale" && line.productName !== "milk" && line.debit) {
      const debitVal = typeof line.debit === "string" ? parseFloat(line.debit) : line.debit;
      if (!isNaN(debitVal) && debitVal > 0) {
        otherItemsAmount += debitVal;
        const name = line.productName || "Other";
        const qty = line.quantity || 0;
        const unit = line.productUnit || "";
        const rate = line.pricePerUnit || 0;
        if (!otherItemsGrouped[name]) {
          otherItemsGrouped[name] = { quantity: 0, amount: 0, unit: "", rate: 0 };
        }
        otherItemsGrouped[name].quantity += qty;
        otherItemsGrouped[name].amount += debitVal;
        if (unit) {
          otherItemsGrouped[name].unit = unit;
        }
        if (rate > 0) {
          otherItemsGrouped[name].rate = rate;
        }
      }
    }
  }

  for (const [name, data] of Object.entries(otherItemsGrouped)) {
    const unitStr = data.unit ? ` ${data.unit}` : "";
    const rateStr = data.rate > 0 ? ` @ ₹${data.rate}` : "";
    if (data.quantity > 0) {
      otherItemsList.push(`${name} (${data.quantity}${unitStr}${rateStr})`);
    } else {
      otherItemsList.push(name);
    }
  }
  const otherItemsLabel = otherItemsList.length > 0 ? `अन्य (${otherItemsList.join(", ")}):` : "अन्य (Other):";

  // Group dates by year-month (e.g. "2026-05")
  const groupsByMonth: Record<string, string[]> = {};
  for (const dateStr of dates) {
    const monthKey = dateStr.slice(0, 7); // "YYYY-MM"
    if (!groupsByMonth[monthKey]) {
      groupsByMonth[monthKey] = [];
    }
    groupsByMonth[monthKey].push(dateStr);
  }

  // Divide the selected dates array into 3 groups: days 1-10, 11-20, and 21-31
  const group1: (string | null)[] = [];
  const group2: (string | null)[] = [];
  const group3: (string | null)[] = [];

  let isFirstMonth = true;
  for (const monthKey of Object.keys(groupsByMonth).sort()) {
    if (!isFirstMonth) {
      // Add a gap row between months
      group1.push("gap");
      group2.push("gap");
      group3.push("gap");
    }
    isFirstMonth = false;

    const monthDates = groupsByMonth[monthKey];
    const m1: (string | null)[] = [];
    const m2: (string | null)[] = [];
    const m3: (string | null)[] = [];

    for (const dateStr of monthDates) {
      const parts = dateStr.split("-");
      const day = parseInt(parts[2], 10);
      if (day <= 10) {
        m1.push(dateStr);
      } else if (day <= 20) {
        m2.push(dateStr);
      } else {
        m3.push(dateStr);
      }
    }

    // Pad this month's columns to keep them aligned
    const monthMax = Math.max(m1.length, m2.length, m3.length);
    while (m1.length < monthMax) m1.push(null);
    while (m2.length < monthMax) m2.push(null);
    while (m3.length < monthMax) m3.push(null);

    // Append this month's columns to the global columns
    group1.push(...m1);
    group2.push(...m2);
    group3.push(...m3);
  }

  const getDayLabel = (dateStr: string, indexInGroup?: number, groupIndex?: number) => {
    const parts = dateStr.split("-");
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);

    const globalIndex = dates.indexOf(dateStr);
    let showMonth = false;
    if (globalIndex === 0) {
      showMonth = true;
    } else if (globalIndex > 0) {
      const prevParts = dates[globalIndex - 1].split("-");
      if (prevParts[1] !== parts[1]) {
        showMonth = true;
      }
    }

    if (showMonth) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = months[month - 1] || "";
      return `${day} ${monthName}`;
    }
    return `${day}`;
  };

  return (
    <div className="bill-print rounded-2xl overflow-hidden border-2 border-black bg-white print:shadow-none p-1 text-black">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: portrait;
            margin: 6mm !important; /* Forces portrait orientation and standard margins */
          }
          body {
            background: white !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bill-print {
            width: 180mm !important;
            max-width: 180mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: #000 !important;
            padding: 0 !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
          }
          /* Force compact padding for all blocks in print */
          .bill-print > div {
            padding: 4px 8px !important;
          }
          /* Reduce font sizes and margins to fit on one page */
          .bill-print h2 {
            font-size: 16px !important;
            margin: 0 !important;
          }
          .bill-print p {
            margin: 1px 0 !important;
            font-size: 10px !important;
          }
          .bill-print .text-xl {
            font-size: 14px !important;
          }
          .bill-print table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            margin-top: 4px !important;
          }
          .bill-print th, .bill-print td {
            border: 1px solid #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-weight: 900 !important;
            font-size: 10.5px !important; /* Smaller text so the table is short */
            color: #000 !important;
            background: none !important;
            padding: 1.5px 3px !important; /* Tight padding to minimize row height */
          }
          /* Summary block adjustments */
          .bill-print .mt-6 {
            margin-top: 6px !important;
            padding: 6px 10px !important;
            border-width: 1px !important;
            border-color: #000 !important;
            background: none !important;
            page-break-inside: avoid !important;
          }
          .bill-print .mt-6 * {
            font-size: 11px !important;
            margin: 0 !important;
          }
          .bill-print .mt-6 .text-base {
            font-size: 12px !important;
          }
          .bill-print .bg-slate-100, .bill-print .bg-slate-50, .bill-print .bg-primary, .bill-print .bg-emerald-50, .bill-print .bg-sky-50, .bill-print .bg-cream-100, .bill-print .bg-cream-50, .bill-print .bg-gradient-to-br, .bill-print .bg-gradient-to-r {
            background: none !important;
            background-color: #fff !important;
          }
          .bill-print * {
            color: #000 !important;
            border-color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-weight: 900 !important;
          }

          /* 4-quadrant layout grid overrides */
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 90mm) !important;
            grid-template-rows: auto auto !important;
            gap: 2mm !important;
            width: 182mm !important;
            max-width: 182mm !important;
            height: auto !important;
            max-height: 252mm !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          .print-grid .bill-print {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 90mm !important;
            max-width: 90mm !important;
            height: auto !important;
            max-height: 125mm !important;
            box-shadow: none !important;
            border: 1px dashed #000 !important;
            background: white !important;
            color: #000 !important;
            padding: 1px !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .print-grid .print-pad-cell {
            position: relative !important;
            width: 90mm !important;
            max-width: 90mm !important;
            height: auto !important;
            min-height: 100mm !important;
            max-height: 125mm !important;
            box-shadow: none !important;
            border: 1px dashed #000 !important;
            background: white !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          /* Scale down sub-elements for the 1/4th size bill */
          .print-grid .bill-print > div {
            padding: 2px 4px !important;
          }
          /* Center Header Shrinking */
          .print-grid .bill-print .text-center.py-4 {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          .print-grid .bill-print .text-center.py-4 h2 {
            font-size: 10px !important;
            margin: 0 !important;
          }
          .print-grid .bill-print .text-center.py-4 p,
          .print-grid .bill-print .text-center.py-4 div {
            font-size: 6.8px !important;
            margin-top: 0.5px !important;
            line-height: 8px !important;
          }
          /* Customer Info Area Shrinking */
          .print-grid .bill-print .px-6.py-3 {
            padding-left: 6px !important;
            padding-right: 6px !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          .print-grid .bill-print .px-6.py-3 * {
            font-size: 7px !important;
            line-height: 8.5px !important;
          }
          .print-grid .bill-print .px-6.py-3 .space-y-1 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0.5px !important;
          }
          .print-grid .bill-print .px-6.py-3 .border-t {
            margin-top: 2px !important;
            margin-bottom: 2px !important;
          }
          .print-grid .bill-print .px-6.py-3 .pt-1,
          .print-grid .bill-print .px-6.py-3 .pt-1.5 {
            padding-top: 0.5px !important;
          }
          /* Table Shrinking */
          .print-grid .bill-print th, .print-grid .bill-print td {
            font-size: 6.5px !important;
            padding: 0.5px 1px !important;
            line-height: 7.5px !important;
          }
          /* Summary Block Shrinking */
          .print-grid .bill-print .mt-6 {
            margin-top: 2px !important;
            padding: 2px 4px !important;
          }
          .print-grid .bill-print .mt-6 * {
            font-size: 7px !important;
            line-height: 8px !important;
          }
          .print-grid .bill-print .mt-6 .text-base {
            font-size: 7.5px !important;
          }
          .print-grid .bill-print .grid-cols-3 {
            gap: 3px !important;
            padding: 2px !important;
          }
          .print-grid .bill-print .space-y-2 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0.5px !important;
          }
          .print-grid .bill-print .space-y-1 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0.5px !important;
          }
          /* Footer Shrinking */
          .print-grid .bill-print .mt-6.text-center.text-xs {
            margin-top: 2px !important;
            padding-top: 2px !important;
          }
          .print-grid .bill-print .mt-6.text-center.text-xs p {
            font-size: 6.5px !important;
            line-height: 7.5px !important;
            margin-top: 0.5px !important;
          }
        }
      ` }} />

      {/* Center-aligned Traditional Header */}
      <div className="text-center py-4 border-b-2 border-black bg-white text-black font-bold">
        <p className="text-xs italic font-bold">|| श्री गणेशाय नमः ||</p>
        <h2 className="text-2xl font-black mt-1 tracking-wider text-black flex items-center justify-center gap-2">
          <span>卐</span> {dairyName} <span>卐</span>
        </h2>
        {tagline && <p className="text-xs font-bold mt-0.5">{tagline}</p>}
        {address && <p className="text-[10px] font-bold">{address}</p>}
        <div className="text-[10px] font-bold mt-1">
          {phone && `Phone: ${phone}`} {gst && ` · GST: ${gst}`}
        </div>
      </div>

      {/* Customer Info Area designed like the physical passbook header */}
      <div className="px-6 py-3 bg-white text-black font-bold border-b border-black text-xs space-y-1">
        <div className="flex justify-between items-center">
          <span className="font-extrabold text-sm">दूध का हिसाब</span>
          <span>अवधि (Period): {periodLabel}</span>
        </div>
        <div className="border-t border-dotted border-black my-1"></div>
        <div className="flex justify-between pt-1">
          <span>श्रीमान् (Customer Name): <span className="font-extrabold border-b border-dotted border-black px-2">{customerName}</span></span>
        </div>
        <div className="flex justify-between pt-1.5">
          <span>पता (Address): <span className="border-b border-dotted border-black px-2">{customerAddress || "—"}</span></span>
          <span>मो. (Mobile): <span className="border-b border-dotted border-black px-2">{customerPhone || "—"}</span></span>
        </div>
      </div>

      <div className="p-4 bg-white">
        {viewMode === "grid" ? (
          <div>
            <div className="overflow-x-auto w-full">
              <div className="grid grid-cols-3 gap-2 border-2 border-black p-2 rounded-xl bg-white min-w-[580px] md:min-w-0">
              {/* Table 1 */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-black p-1 font-bold text-center">दिनांक</th>
                    <th className="border border-black p-1 font-bold text-center">सुबह</th>
                    <th className="border border-black p-1 font-bold text-center">शाम</th>
                  </tr>
                </thead>
                <tbody>
                  {group1.map((dateStr, i) => {
                    if (dateStr === "gap") {
                      return (
                        <tr key={`g1-gap-${i}`} className="bg-slate-100 h-2">
                          <td colSpan={3} className="border border-black p-0 h-2 bg-slate-100">&nbsp;</td>
                        </tr>
                      );
                    }
                    if (dateStr) {
                      const dayLabel = getDayLabel(dateStr, i, 0);
                      return (
                        <tr key={dateStr} className="hover:bg-slate-50">
                          <td className="border border-black p-1 font-bold text-center">{dayLabel}</td>
                          <td className="border border-black p-1 text-center font-bold">{(grid[dateStr].morning || 0).toFixed(1)}</td>
                          <td className="border border-black p-1 text-center font-bold">{(grid[dateStr].evening || 0).toFixed(1)}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`g1-pad-${i}`} className="hover:bg-slate-50">
                        <td className="border border-black p-1 text-center bg-slate-50 font-bold">&nbsp;</td>
                        <td className="border border-black p-1 text-center font-bold">&nbsp;</td>
                        <td className="border border-black p-1 text-center font-bold">&nbsp;</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table 2 */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-black p-1 font-bold text-center">दिनांक</th>
                    <th className="border border-black p-1 font-bold text-center">सुबह</th>
                    <th className="border border-black p-1 font-bold text-center">शाम</th>
                  </tr>
                </thead>
                <tbody>
                  {group2.map((dateStr, i) => {
                    if (dateStr === "gap") {
                      return (
                        <tr key={`g2-gap-${i}`} className="bg-slate-100 h-2">
                          <td colSpan={3} className="border border-black p-0 h-2 bg-slate-100">&nbsp;</td>
                        </tr>
                      );
                    }
                    if (dateStr) {
                      const dayLabel = getDayLabel(dateStr, i, 1);
                      return (
                        <tr key={dateStr} className="hover:bg-slate-50">
                          <td className="border border-black p-1 font-bold text-center">{dayLabel}</td>
                          <td className="border border-black p-1 text-center font-bold">{(grid[dateStr].morning || 0).toFixed(1)}</td>
                          <td className="border border-black p-1 text-center font-bold">{(grid[dateStr].evening || 0).toFixed(1)}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`g2-pad-${i}`} className="hover:bg-slate-50">
                        <td className="border border-black p-1 text-center bg-slate-50 font-bold">&nbsp;</td>
                        <td className="border border-black p-1 text-center font-bold">&nbsp;</td>
                        <td className="border border-black p-1 text-center font-bold">&nbsp;</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table 3 */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-black p-1 font-bold text-center">दिनांक</th>
                    <th className="border border-black p-1 font-bold text-center">सुबह</th>
                    <th className="border border-black p-1 font-bold text-center">शाम</th>
                  </tr>
                </thead>
                <tbody>
                  {group3.map((dateStr, i) => {
                    if (dateStr === "gap") {
                      return (
                        <tr key={`g3-gap-${i}`} className="bg-slate-100 h-2">
                          <td colSpan={3} className="border border-black p-0 h-2 bg-slate-100">&nbsp;</td>
                        </tr>
                      );
                    }
                    if (dateStr) {
                      const dayLabel = getDayLabel(dateStr, i, 2);
                      return (
                        <tr key={dateStr} className="hover:bg-slate-50">
                          <td className="border border-black p-1 font-bold text-center">{dayLabel}</td>
                          <td className="border border-black p-1 text-center font-bold">{(grid[dateStr].morning || 0).toFixed(1)}</td>
                          <td className="border border-black p-1 text-center font-bold">{(grid[dateStr].evening || 0).toFixed(1)}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`g3-pad-${i}`} className="hover:bg-slate-50">
                        <td className="border border-black p-1 text-center bg-slate-50 font-bold">&nbsp;</td>
                        <td className="border border-black p-1 text-center font-bold">&nbsp;</td>
                        <td className="border border-black p-1 text-center font-bold">&nbsp;</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 border-2 border-black rounded-xl p-4 bg-slate-50 space-y-2 text-sm font-bold text-slate-800">
              <div className="flex justify-between border-b-2 border-black pb-2">
                <span>कुल दूध: {totalMilkLiters.toFixed(2)} लीटर</span>
                <span>दर: ₹{detectedRate.toFixed(2)}/लीटर</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">पिछला बकाया:</span>
                  <span>₹{Math.abs(openingBalance).toFixed(2)}</span>
                </div>
                {otherItemsAmount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">दूध राशि:</span>
                    <span>₹{(totalSales - otherItemsAmount).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">कुल राशि:</span>
                    <span>₹{totalSales.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">कुल भुगतान:</span>
                  <span>₹{totalPaid.toFixed(2)}</span>
                </div>
                {otherItemsAmount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">अन्य/घी:</span>
                    <span>₹{otherItemsAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <div></div>
                )}
                {otherItemsAmount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span></span>
                      <span></span>
                    </div>
                    <div className="flex justify-between border-t border-dotted border-black/45 pt-1">
                      <span className="text-slate-600 font-bold">कुल राशि:</span>
                      <span>₹{totalSales.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t-2 border-black pt-2 col-span-2">
                  <span className="text-slate-900 font-extrabold text-base">शेष (Net Due):</span>
                  <span className={`text-base font-extrabold ${finalBalance > 0 ? "text-red-600" : "text-emerald-700"}`}>
                    ₹{Math.abs(finalBalance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payments/Transactions list in Grid View */}
            {lines.filter(l => l.kind.toLowerCase() !== "sale" && l.credit > 0).length > 0 && (
              <div className="mt-4 border-2 border-black rounded-xl p-3 bg-white space-y-2 text-xs font-bold text-slate-800 page-break-inside-avoid">
                <div className="border-b-2 border-black pb-1.5 font-extrabold text-xs flex justify-between uppercase tracking-wider">
                  <span>भुगतान विवरण (Payment Transactions)</span>
                  <span>कुल (Total): ₹{totalPaid.toFixed(2)}</span>
                </div>
                <table className="w-full text-left text-[10.5px] print:text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-1">दिनांक (Date)</th>
                      <th className="py-1">प्रकार (Type)</th>
                      <th className="py-1">माध्यम/विवरण (Mode/Note)</th>
                      <th className="py-1 text-right">राशि (Amount)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines
                      .filter(l => l.kind.toLowerCase() !== "sale" && l.credit > 0)
                      .map((l, i) => (
                        <tr key={i} className="border-b border-dotted border-black/40 hover:bg-slate-50">
                          <td className="py-1">{formatDate(l.date)}</td>
                          <td className="py-1 capitalize">{l.kind === "payment" ? "भुगतान (Payment)" : l.kind === "advance" ? "एडवांस (Advance)" : l.kind}</td>
                          <td className="py-1 font-semibold">{l.detail}</td>
                          <td className="py-1 text-right font-extrabold">₹{l.credit.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-primary border-b border-border">
                    <th className="pb-2 pr-2 font-bold">Date</th>
                    <th className="pb-2 pr-2 font-bold">Type</th>
                    <th className="pb-2 pr-2 font-bold">Detail</th>
                    <th className="pb-2 pr-2 text-right font-bold">Debit</th>
                    <th className="pb-2 text-right font-bold">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground font-bold">
                        No entries in this period.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, i) => (
                      <tr
                        key={i}
                        className="border-b border-cream-200/80 hover:bg-cream-50/50 transition-colors font-bold"
                      >
                        <td className="py-2.5 pr-2 whitespace-nowrap font-bold">{formatDate(line.date)}</td>
                        <td className="py-2.5 pr-2 capitalize font-bold">{line.kind}</td>
                        <td className="py-2.5 pr-2 text-muted-foreground font-bold">{line.detail}</td>
                        <td className="py-2.5 pr-2 text-right font-bold text-foreground">
                          {line.debit > 0 ? `₹${line.debit.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 text-right font-bold text-primary-muted">
                          {line.credit > 0 ? `₹${line.credit.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-sky-50/90 border border-sky-200/70 p-4 text-center">
                <p className="text-xs text-sky-900/70 uppercase tracking-wide font-bold">
                  Previous balance
                </p>
                <p className={`text-2xl font-bold mt-1 ${openingBalance > 0 ? "text-destructive" : "text-emerald-700"}`}>
                  ₹{Math.abs(openingBalance).toFixed(2)}
                  {openingBalance > 0 ? " due" : openingBalance < 0 ? " advance" : ""}
                </p>
              </div>
              <div className="rounded-xl bg-cream-100/80 border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold">
                  Total sales
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ₹{totalSales.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50/90 border border-emerald-200/60 p-4 text-center">
                <p className="text-xs text-emerald-800/80 uppercase tracking-wide font-bold">
                  Paid
                </p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">
                  ₹{totalPaid.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/90 border border-amber-200/70 p-4 text-center">
                <p className="text-xs text-amber-900/70 uppercase tracking-wide font-bold">
                  Net payable
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    finalBalance > 0 ? "text-destructive" : "text-emerald-700"
                  }`}
                >
                  ₹{Math.abs(finalBalance).toFixed(2)}
                  {finalBalance > 0 ? " due" : finalBalance < 0 ? " advance" : ""}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Traditional Footer matching the bottom text on physical bill */}
        <div className="mt-6 text-center text-xs font-bold border-t border-dotted border-black pt-3">
          <p>शुद्ध पौष्टिक ताजा दूध हेतु सम्पर्क करें।</p>
          {phone && <p className="mt-1">सम्पर्क सूत्र:- {phone} (Phone Pe Available)</p>}
        </div>
      </div>
    </div>
  );
}
