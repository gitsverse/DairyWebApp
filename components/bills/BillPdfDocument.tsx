import React from "react";
import { formatDate } from "@/lib/dateUtils";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";

// Register Noto Sans Devanagari font locally to support Hindi/Devanagari characters and traditional symbols in PDFs
try {
  const isServer = typeof window === "undefined";
  const regularSrc = isServer
    ? path.join(process.cwd(), "public/fonts/NotoSansDevanagari-Regular.ttf")
    : "/fonts/NotoSansDevanagari-Regular.ttf";
  const boldSrc = isServer
    ? path.join(process.cwd(), "public/fonts/NotoSansDevanagari-Bold.ttf")
    : "/fonts/NotoSansDevanagari-Bold.ttf";

  Font.register({
    family: "NotoSansDevanagari",
    fonts: [
      { src: regularSrc, fontWeight: 400 },
      { src: boldSrc, fontWeight: 700 },
    ],
  });
} catch (err) {
  console.warn("Failed to register Noto Sans Devanagari font, using fallback:", err);
}

const styles = StyleSheet.create({
  page: {
    padding: 8,
    fontFamily: "NotoSansDevanagari",
    color: "#000000",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    height: "100%",
  },
  tile: {
    width: "50%",
    height: "50%",
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#000000",
    borderStyle: "dashed",
    flexDirection: "column",
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    paddingBottom: 4,
    marginBottom: 4,
    alignItems: "center",
  },
  invocation: {
    fontSize: 6,
    fontWeight: 700,
    textAlign: "center",
  },
  brand: { 
    fontSize: 11, 
    fontWeight: 700, 
    color: "#000000",
    marginTop: 1,
  },
  tagline: { fontSize: 7, color: "#000000", marginTop: 1, textAlign: "center" },
  meta: { fontSize: 7, color: "#000000", marginTop: 1, textAlign: "center" },
  
  // Customer Info Box matching the physical register
  customerInfoBlock: {
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    marginBottom: 4,
  },
  customerRow: {
    flexDirection: "row",
    marginTop: 1,
    alignItems: "center",
  },
  customerLabel: {
    fontSize: 7.5,
    fontWeight: 700,
  },
  customerValue: {
    fontSize: 7.5,
    fontWeight: 700,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    borderStyle: "solid",
    paddingLeft: 2,
  },
  
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#000000",
    marginTop: 6,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingVertical: 2,
  },
  cell1: { width: "22%", fontSize: 7, fontWeight: 700 },
  cell2: { width: "18%", fontSize: 7, fontWeight: 700 },
  cell3: { width: "15%", textAlign: "right", fontSize: 7, fontWeight: 700 },
  cell4: { width: "20%", textAlign: "right", fontSize: 7, fontWeight: 700 },
  th: { fontWeight: 700, color: "#000000" },
  totals: {
    marginTop: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 4,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  totalLabel: { fontWeight: 700, fontSize: 7.5, color: "#000000" },
  totalLabelSmall: { fontWeight: 700, fontSize: 7, color: "#000000" },
  totalValue: { fontSize: 7.5, fontWeight: 700, color: "#000000" },
  balanceDue: { fontSize: 8.5, color: "#000000", marginTop: 2, fontWeight: 700 },
  balanceDuePdf: { fontSize: 8.5, color: "#000000", fontWeight: 700 },

  // Grid specific styles
  pdfGridContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    width: "100%",
  },
  pdfTable: {
    width: "32%",
    borderWidth: 1.2,
    borderColor: "#000000",
  },
  pdfTableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderBottomWidth: 1.2,
    borderBottomColor: "#000000",
  },
  pdfTableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: "#000000",
  },
  pdfTableHeaderCell: {
    fontSize: 6.5,
    fontWeight: 700,
    padding: 1.5,
    textAlign: "center",
    borderRightWidth: 0.8,
    borderRightColor: "#000000",
  },
  pdfTableCell: {
    fontSize: 6.5,
    padding: 1.5,
    borderRightWidth: 0.8,
    borderRightColor: "#000000",
    fontWeight: 700,
  },
  cellDay: {
    width: "30%",
    textAlign: "center",
    fontWeight: 700,
  },
  cellQty: {
    width: "35%",
    textAlign: "center",
    fontWeight: 700,
  },
  pdfTotals: {
    marginTop: 4,
    padding: 4,
    borderWidth: 1.2,
    borderColor: "#000000",
    borderRadius: 4,
  },
  
  // Traditional Footer
  pdfFooter: {
    marginTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    borderStyle: "dashed",
    paddingTop: 3,
    alignItems: "center",
  },
  pdfFooterText: {
    fontSize: 6.5,
    fontWeight: 700,
    textAlign: "center",
  },
});

export type BillPdfLine = {
  date: string;
  kind: string;
  detail: string;
  debit: string;
  credit: string;
  quantity?: number;
  shift?: "morning" | "evening";
  productName?: string;
  productUnit?: string;
  pricePerUnit?: number;
};

export type SingleBillData = {
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  lines: BillPdfLine[];
  openingBalance: string;
  totalSales: string;
  totalPaid: string;
  finalBalance: string;
  periodLabel: string;
};

export type BillPdfProps = {
  dairyName: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  gst?: string | null;
  periodLabel: string;
  viewMode?: "grid" | "list";
  bills: SingleBillData[];
};

export type BillTileProps = {
  dairyName: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  gst?: string | null;
  periodLabel: string;
  viewMode?: "grid" | "list";
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  lines: BillPdfLine[];
  openingBalance: string;
  totalSales: string;
  totalPaid: string;
  finalBalance: string;
};

const BillTile = ({
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
}: BillTileProps) => {
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
        if (detectedRate === 0 && line.debit && line.debit !== "—") {
          const debitVal = parseFloat(line.debit);
          if (!isNaN(debitVal) && line.quantity > 0) {
            detectedRate = debitVal / line.quantity;
          }
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
    const rateStr = data.rate > 0 ? ` @ रु${data.rate}` : "";
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
    <View style={styles.tile}>
      {/* Centered Traditional Header */}
      <View style={styles.header}>
        <Text style={styles.invocation}>|| श्री गणेशाय नमः ||</Text>
        <Text style={styles.brand}>{dairyName}</Text>
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
        {address ? <Text style={styles.meta}>{address}</Text> : null}
        <Text style={styles.meta}>
          {[phone && `Ph: ${phone}`, gst && `GST: ${gst}`]
            .filter(Boolean)
            .join("  -  ")}
        </Text>
      </View>

      {/* Customer details in register format */}
      <View style={styles.customerInfoBlock}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700 }}>दूध का हिसाब</Text>
          <Text style={{ fontSize: 7, fontWeight: 700 }}>अवधि (Period): {periodLabel}</Text>
        </View>
        <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#000000", borderStyle: "dashed", marginVertical: 2 }} />
        <View style={styles.customerRow}>
          <Text style={styles.customerLabel}>श्रीमान् (Customer): </Text>
          <Text style={[styles.customerValue, { flex: 1 }]}>{customerName}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
          <View style={{ flexDirection: "row", width: "60%" }}>
            <Text style={styles.customerLabel}>पता (Address): </Text>
            <Text style={[styles.customerValue, { flex: 1 }]}>{customerAddress || "-"}</Text>
          </View>
          <View style={{ flexDirection: "row", width: "38%" }}>
            <Text style={styles.customerLabel}>मो. (Mobile): </Text>
            <Text style={[styles.customerValue, { flex: 1 }]}>{customerPhone || "-"}</Text>
          </View>
        </View>
      </View>

      {viewMode === "grid" ? (
        <View style={{ flex: 1 }}>
          <View style={styles.pdfGridContainer}>
            {/* Table 1 */}
            <View style={styles.pdfTable}>
              <View style={styles.pdfTableHeader}>
                <Text style={[styles.pdfTableHeaderCell, styles.cellDay]}>दिनांक</Text>
                <Text style={[styles.pdfTableHeaderCell, styles.cellQty]}>सुबह</Text>
                <Text style={[styles.pdfTableHeaderCell, styles.cellQty, { borderRightWidth: 0 }]}>शाम</Text>
              </View>
              {group1.map((dateStr, i) => {
                const isLastRow = i === group1.length - 1;
                if (dateStr === "gap") {
                  return (
                    <View key={`g1-gap-${i}`} style={[styles.pdfTableRow, { backgroundColor: "#f1f5f9", height: 4 }, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                      <View style={{ width: "100%" }} />
                    </View>
                  );
                }
                if (dateStr) {
                  const dayLabel = getDayLabel(dateStr, i, 0);
                  return (
                    <View key={dateStr} style={[styles.pdfTableRow, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                      <Text style={[styles.pdfTableCell, styles.cellDay]}>{dayLabel}</Text>
                      <Text style={[styles.pdfTableCell, styles.cellQty]}>{(grid[dateStr].morning || 0).toFixed(1)}</Text>
                      <Text style={[styles.pdfTableCell, styles.cellQty, { borderRightWidth: 0 }]}>{(grid[dateStr].evening || 0).toFixed(1)}</Text>
                    </View>
                  );
                }
                return (
                  <View key={`g1-pad-${i}`} style={[styles.pdfTableRow, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                    <Text style={[styles.pdfTableCell, styles.cellDay]}> </Text>
                    <Text style={[styles.pdfTableCell, styles.cellQty]}> </Text>
                    <Text style={[styles.pdfTableCell, styles.cellQty, { borderRightWidth: 0 }]}> </Text>
                  </View>
                );
              })}
            </View>

            {/* Table 2 */}
            <View style={styles.pdfTable}>
              <View style={styles.pdfTableHeader}>
                <Text style={[styles.pdfTableHeaderCell, styles.cellDay]}>दिनांक</Text>
                <Text style={[styles.pdfTableHeaderCell, styles.cellQty]}>सुबह</Text>
                <Text style={[styles.pdfTableHeaderCell, styles.cellQty, { borderRightWidth: 0 }]}>शाम</Text>
              </View>
              {group2.map((dateStr, i) => {
                const isLastRow = i === group2.length - 1;
                if (dateStr === "gap") {
                  return (
                    <View key={`g2-gap-${i}`} style={[styles.pdfTableRow, { backgroundColor: "#f1f5f9", height: 4 }, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                      <View style={{ width: "100%" }} />
                    </View>
                  );
                }
                if (dateStr) {
                  const dayLabel = getDayLabel(dateStr, i, 1);
                  return (
                    <View key={dateStr} style={[styles.pdfTableRow, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                      <Text style={[styles.pdfTableCell, styles.cellDay]}>{dayLabel}</Text>
                      <Text style={[styles.pdfTableCell, styles.cellQty]}>{(grid[dateStr].morning || 0).toFixed(1)}</Text>
                      <Text style={[styles.pdfTableCell, styles.cellQty, { borderRightWidth: 0 }]}>{(grid[dateStr].evening || 0).toFixed(1)}</Text>
                    </View>
                  );
                }
                return (
                  <View key={`g2-pad-${i}`} style={[styles.pdfTableRow, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                    <Text style={[styles.pdfTableCell, styles.cellDay]}> </Text>
                    <Text style={[styles.pdfTableCell, styles.cellQty]}> </Text>
                    <Text style={[styles.pdfTableCell, styles.cellQty, { borderRightWidth: 0 }]}> </Text>
                  </View>
                );
              })}
            </View>

            {/* Table 3 */}
            <View style={styles.pdfTable}>
              <View style={styles.pdfTableHeader}>
                <Text style={[styles.pdfTableHeaderCell, styles.cellDay]}>दिनांक</Text>
                <Text style={[styles.pdfTableHeaderCell, styles.cellQty]}>सुबह</Text>
                <Text style={[styles.pdfTableHeaderCell, styles.cellQty, { borderRightWidth: 0 }]}>शाम</Text>
              </View>
              {group3.map((dateStr, i) => {
                const isLastRow = i === group3.length - 1;
                if (dateStr === "gap") {
                  return (
                    <View key={`g3-gap-${i}`} style={[styles.pdfTableRow, { backgroundColor: "#f1f5f9", height: 4 }, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                      <View style={{ width: "100%" }} />
                    </View>
                  );
                }
                if (dateStr) {
                  const dayLabel = getDayLabel(dateStr, i, 2);
                  return (
                    <View key={dateStr} style={[styles.pdfTableRow, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                      <Text style={[styles.pdfTableCell, styles.cellDay]}>{dayLabel}</Text>
                      <Text style={[styles.pdfTableCell, styles.cellQty]}>{(grid[dateStr].morning || 0).toFixed(1)}</Text>
                      <Text style={[styles.pdfTableCell, styles.cellQty, { borderRightWidth: 0 }]}>{(grid[dateStr].evening || 0).toFixed(1)}</Text>
                    </View>
                  );
                }
                return (
                  <View key={`g3-pad-${i}`} style={[styles.pdfTableRow, isLastRow ? { borderBottomWidth: 0 } : {}]}>
                    <Text style={[styles.pdfTableCell, styles.cellDay]}> </Text>
                    <Text style={[styles.pdfTableCell, styles.cellQty]}> </Text>
                    <Text style={[styles.pdfTableCell, styles.cellQty, { borderRightWidth: 0 }]}> </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.pdfTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>कुल दूध: {totalMilkLiters.toFixed(2)} लीटर</Text>
              <Text style={styles.totalLabel}>दर: रु{detectedRate.toFixed(2)}/लीटर</Text>
            </View>
            <View style={[styles.totalRow, { marginTop: 4 }]}>
              <Text style={styles.totalLabelSmall}>पिछला बकाया: रु{openingBalance}</Text>
              {otherItemsAmount > 0 ? (
                <Text style={styles.totalLabelSmall}>दूध राशि: रु{(parseFloat(totalSales) - otherItemsAmount).toFixed(2)}</Text>
              ) : (
                <Text style={styles.totalLabelSmall}>कुल राशि: रु{totalSales}</Text>
              )}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelSmall}>कुल भुगतान: रु{totalPaid}</Text>
              {otherItemsAmount > 0 ? (
                <Text style={styles.totalLabelSmall}>अन्य/घी: रु{otherItemsAmount.toFixed(2)}</Text>
              ) : (
                <Text style={styles.totalLabelSmall}> </Text>
              )}
            </View>
            {otherItemsAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelSmall}> </Text>
                <Text style={[styles.totalLabelSmall, { borderTopWidth: 0.5, borderTopColor: "#000000", borderStyle: "dotted", paddingTop: 1 }]}>
                  कुल राशि: रु{totalSales}
                </Text>
              </View>
            )}
            <View style={[styles.totalRow, { borderTopWidth: 0.5, borderTopColor: "#000000", paddingTop: 2, marginTop: 2 }]}>
              <Text style={styles.totalLabelSmall}> </Text>
              <Text style={styles.balanceDuePdf}>शेष (Net Due): रु{finalBalance}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Statement</Text>
          <View style={styles.row}>
            <Text style={[styles.cell1, styles.th]}>Date</Text>
            <Text style={[styles.cell2, styles.th]}>Type</Text>
            <Text style={[styles.cell1, styles.th]}>Detail</Text>
            <Text style={[styles.cell3, styles.th]}>Debit</Text>
            <Text style={[styles.cell4, styles.th]}>Credit</Text>
          </View>
          {lines.slice(0, 15).map((line, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cell1}>{formatDate(line.date)}</Text>
              <Text style={styles.cell2}>{line.kind}</Text>
              <Text style={styles.cell1}>{line.detail}</Text>
              <Text style={styles.cell3}>{line.debit}</Text>
              <Text style={styles.cell4}>{line.credit}</Text>
            </View>
          ))}

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Prev balance</Text>
              <Text style={styles.totalValue}>Rs. {openingBalance}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sales (period)</Text>
              <Text style={styles.totalValue}>Rs. {totalSales}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Paid (period)</Text>
              <Text style={styles.totalValue}>Rs. {totalPaid}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Net payable</Text>
              <Text style={styles.balanceDue}>Rs. {finalBalance}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Traditional Footer */}
      <View style={styles.pdfFooter}>
        <Text style={styles.pdfFooterText}>शुद्ध पौष्टिक ताजा दूध हेतु सम्पर्क करें।</Text>
        {phone ? (
          <Text style={[styles.pdfFooterText, { marginTop: 1 }]}>
            सम्पर्क सूत्र:- {phone} (Phone Pe Available)
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export function BillPdfDocument({ bills, ...commonProps }: BillPdfProps) {
  const paddedBills: (SingleBillData | null)[] = [...bills];
  while (paddedBills.length < 4) {
    paddedBills.push(null);
  }

  return (
    <Document title={`Bills \u2014 ${bills.map((b) => b.customerName).join(", ")}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.grid}>
          {paddedBills.slice(0, 4).map((bill, index) => {
            if (!bill) {
              return <View key={index} style={[styles.tile, { borderWidth: 0 }]} />;
            }
            return (
              <BillTile
                key={index}
                {...commonProps}
                customerName={bill.customerName}
                customerPhone={bill.customerPhone}
                customerAddress={bill.customerAddress}
                periodLabel={bill.periodLabel || commonProps.periodLabel}
                lines={bill.lines}
                openingBalance={bill.openingBalance}
                totalSales={bill.totalSales}
                totalPaid={bill.totalPaid}
                finalBalance={bill.finalBalance}
              />
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
