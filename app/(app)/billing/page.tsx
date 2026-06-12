"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Input from "@/components/ui/Input";
import DateInput from "@/components/ui/DateInput";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/dateUtils";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import CustomerForm from "@/components/forms/CustomerForm";
import BillStatement, { type BillLine } from "@/components/bills/BillStatement";
import { withTimeout } from "@/lib/withTimeout";
import { useI18n } from "@/components/i18n/LanguageProvider";
import Combobox from "@/components/ui/Combobox";

const FETCH_MS = 18_000;

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
}

interface DairyProfile {
  dairy_name: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  gst?: string | null;
}

const BillingPage = () => {
  const { t, lang } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  interface SelectedCustomer {
    id: string;
    startDate: string;
    endDate: string;
  }
  const [selectedCustomers, setSelectedCustomers] = useState<SelectedCustomer[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [profile, setProfile] = useState<DairyProfile | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [generatedBills, setGeneratedBills] = useState<{
    customerId: string;
    customerName: string;
    customerPhone?: string | null;
    customerAddress?: string | null;
    lines: BillLine[];
    openingBalance: number;
    totalSales: number;
    totalPaid: number;
    finalBalance: number;
    periodLabel: string;
  }[]>([]);
  const [isBillGenerated, setIsBillGenerated] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchCustomers = useCallback(async () => {
    const { data: cust, error: cErr } = await withTimeout(
      supabaseClient.from("daily_customers" as any).select("id, name, phone, address"),
      FETCH_MS
    );
    if (cErr) {
      setBootstrapError(cErr.message);
      setCustomers([]);
      return false;
    }
    setCustomers((cust as any) || []);
    return true;
  }, []);

  useEffect(() => {
    const load = async () => {
      setBootstrapError(null);
      try {
        await fetchCustomers();
        const res = await withTimeout(
          fetch("/api/dairy-profile", { credentials: "include", cache: "no-store" }),
          FETCH_MS
        );
        if (res.ok) {
          const prof = await res.json();
          setProfile(prof);
        } else {
          // Fallback to supabaseClient direct select
          const { data: prof } = await supabaseClient.from("daily_profile").select("*").maybeSingle();
          if (prof) setProfile(prof);
        }
      } catch (e) {
        setBootstrapError(e instanceof Error ? e.message : "Could not load billing data");
      }
    };
    void load();
  }, [fetchCustomers]);

  const handleSelectCustomer = (id: string) => {
    if (!id) return;
    if (selectedCustomers.some((c) => c.id === id)) return;
    if (selectedCustomers.length >= 4) {
      setUiError(lang === "hi" ? "आप प्रिंट के लिए अधिकतम 4 ग्राहक चुन सकते हैं।" : "You can select up to 4 customers for print.");
      return;
    }
    setSelectedCustomers([
      ...selectedCustomers,
      {
        id,
        startDate: startDate || "",
        endDate: endDate || "",
      },
    ]);
    setUiError(null);
  };

  const handleRemoveCustomer = (id: string) => {
    setSelectedCustomers(selectedCustomers.filter((c) => c.id !== id));
    setIsBillGenerated(false);
  };

  const handleCustomerDateChange = (id: string, field: "startDate" | "endDate", value: string) => {
    setSelectedCustomers(
      selectedCustomers.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    setIsBillGenerated(false);
  };

  const handleGlobalStartDateChange = (val: string) => {
    setStartDate(val);
    setSelectedCustomers(selectedCustomers.map((c) => ({ ...c, startDate: val })));
    setIsBillGenerated(false);
  };

  const handleGlobalEndDateChange = (val: string) => {
    setEndDate(val);
    setSelectedCustomers(selectedCustomers.map((c) => ({ ...c, endDate: val })));
    setIsBillGenerated(false);
  };

  const handleNewCustomerSaved = async (result?: { id: string }) => {
    setIsAddCustomerOpen(false);
    const ok = await fetchCustomers();
    if (ok && result?.id) {
      handleSelectCustomer(result.id);
    }
  };

  const customerName = useMemo(() => {
    if (selectedCustomers.length === 0) return "";
    if (selectedCustomers.length === 1) {
      return customers.find((c) => c.id === selectedCustomers[0].id)?.name ?? "";
    }
    return selectedCustomers
      .map((item) => customers.find((c) => c.id === item.id)?.name ?? "")
      .filter(Boolean)
      .join(", ");
  }, [customers, selectedCustomers]);

  const bucketName = process.env.NEXT_PUBLIC_BILLS_BUCKET || "bills";
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.phone ? `${c.name} (${c.phone})` : c.name,
    keywords: `${c.name} ${c.phone ?? ""}`,
  }));

  const handleGenerateBill = async () => {
    if (selectedCustomers.length === 0) {
      setUiError("Please select at least one customer.");
      setUiMessage(null);
      return;
    }
    for (const item of selectedCustomers) {
      if (!item.startDate || !item.endDate) {
        setUiError(lang === "hi" ? "कृपया सभी चयनित ग्राहकों के लिए शुरू और अंतिम तारीखें चुनें।" : "Please select start and end dates for all selected customers.");
        setUiMessage(null);
        return;
      }
    }
    setLoading(true);
    setShareUrl(null);
    setUiError(null);
    setUiMessage(null);
    setIsBillGenerated(false);

    try {
      const billsResults = await Promise.all(
        selectedCustomers.map(async (item) => {
          const custId = item.id;
          const startDate = item.startDate;
          const endDate = item.endDate;
          const customer = customers.find((c) => c.id === custId);
          if (!customer) return null;

          // Fetch all database dependencies concurrently (Atomic Snapshot/Read Consistency)
          const [
            prevEntriesRes,
            prevTransactionsRes,
            entriesRes,
            transactionsRes
          ] = await Promise.all([
            supabaseClient
              .from("daily_entries" as any)
              .select("total_amount")
              .eq("customer_id", custId)
              .lt("date", startDate) as any,
            supabaseClient
              .from("daily_transactions" as any)
              .select("amount, type")
              .eq("customer_id", custId)
              .lt("date", startDate) as any,
            supabaseClient
              .from("daily_entries" as any)
              .select("date, shift, quantity, price_per_unit, total_amount, daily_products(name, unit)")
              .eq("customer_id", custId)
              .gte("date", startDate)
              .lte("date", endDate) as any,
            supabaseClient
              .from("daily_transactions" as any)
              .select("date, type, amount, payment_mode, note")
              .eq("customer_id", custId)
              .gte("date", startDate)
              .lte("date", endDate) as any
          ]);

          const prevEntries = prevEntriesRes.data;
          const prevTransactions = prevTransactionsRes.data;
          const entries = entriesRes.data;
          const transactions = transactionsRes.data;

          const billLines: BillLine[] = [];

          // Group entries and transactions by date
          const entriesByDate: Record<string, any[]> = {};
          for (const e of entries || []) {
            const d = String(e.date);
            if (!entriesByDate[d]) entriesByDate[d] = [];
            entriesByDate[d].push(e);
          }

          const transactionsByDate: Record<string, any[]> = {};
          for (const t of transactions || []) {
            const d = String(t.date);
            if (!transactionsByDate[d]) transactionsByDate[d] = [];
            transactionsByDate[d].push(t);
          }

          // Generate all dates in the range
          const dates: string[] = [];
          if (startDate && endDate) {
            const currTime = new Date(startDate + "T12:00:00");
            const endTime = new Date(endDate + "T12:00:00");
            while (currTime <= endTime) {
              dates.push(currTime.toISOString().slice(0, 10));
              currTime.setDate(currTime.getDate() + 1);
            }
          }

          // Populate lines day by day to show active purchases or "X" for empty days
          for (const date of dates) {
            const dayEntries = entriesByDate[date] || [];
            const dayTransactions = transactionsByDate[date] || [];

            if (dayEntries.length > 0) {
              for (const e of dayEntries) {
                const p = e.daily_products as { name?: string; unit?: string } | null;
                const name = p?.name ?? "product";
                const unit = p?.unit ?? "";
                billLines.push({
                  date: date,
                  kind: "sale",
                  detail: `${e.shift} · ${Number(e.quantity)} ${name} @ ₹${Number(e.price_per_unit).toFixed(2)}`,
                  debit: Number(e.total_amount),
                  credit: 0,
                  quantity: Number(e.quantity),
                  shift: e.shift === "evening" ? "evening" : "morning",
                  productName: name,
                  productUnit: unit,
                  pricePerUnit: Number(e.price_per_unit),
                });
              }
            } else {
              // No milk purchase on this day, add a cut line
              billLines.push({
                date: date,
                kind: "sale",
                detail: "X",
                debit: 0,
                credit: 0,
              });
            }

            // Add any transactions for this day (excluding 'due' type transactions to avoid double-counting in table/summary)
            for (const t of dayTransactions) {
              if (t.type === "due") continue;
              billLines.push({
                date: date,
                kind: String(t.type),
                detail: `${t.payment_mode}${t.note ? ` · ${t.note}` : ""}`,
                debit: 0,
                credit: Number(t.amount),
              });
            }
          }

          let totalSales = 0;
          let totalPaid = 0;
          let prevSales = 0;
          let prevPaid = 0;
          let periodDues = 0;

          for (const e of prevEntries || []) {
            prevSales += Number(e.total_amount || 0);
          }
          for (const t of prevTransactions || []) {
            if (t.type === "due") {
              prevSales += Number(t.amount || 0);
            } else {
              prevPaid += Number(t.amount || 0);
            }
          }
          for (const e of entries || []) {
            totalSales += Number(e.total_amount || 0);
          }
          for (const t of transactions || []) {
            if (t.type === "due") {
              periodDues += Number(t.amount || 0);
            } else {
              totalPaid += Number(t.amount || 0);
            }
          }

          const openingBalance = (prevSales - prevPaid) + periodDues;
          const finalBalance = openingBalance + totalSales - totalPaid;

          const periodLabel = `${formatDate(startDate)} → ${formatDate(endDate)}`;
          return {
            customerId: custId,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerAddress: customer.address,
            lines: billLines,
            openingBalance,
            totalSales,
            totalPaid,
            finalBalance,
            periodLabel,
          };
        })
      );

      const nextGeneratedBills = billsResults.filter(Boolean) as any[];

      setGeneratedBills(nextGeneratedBills);
      setIsBillGenerated(true);
      setUiMessage(`Bill generated for ${nextGeneratedBills.length} customer(s).`);
    } catch (err) {
      setUiError(err instanceof Error ? err.message : "Error generating bills.");
    } finally {
      setLoading(false);
    }
  };

  const handleSharePdf = async () => {
    if (selectedCustomers.length === 0) return;
    for (const item of selectedCustomers) {
      if (!item.startDate || !item.endDate) return;
    }
    setShareLoading(true);
    setShareUrl(null);
    try {
      const res = await fetch("/api/bills/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customers_config: selectedCustomers.map((c) => ({
            id: c.id,
            start_date: c.startDate,
            end_date: c.endDate,
          })),
          view_mode: viewMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      
      const urlToShare = json.shortUrl || json.signedUrl;

      setShareUrl(urlToShare);
      setUiMessage(`PDF uploaded to bucket "${json.bucket || bucketName}". Share link ready.`);
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Could not create share link");
    }
    setShareLoading(false);
  };

  const handlePrint = () => window.print();

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setUiMessage("Link copied to clipboard.");
  };

  const customerPhone = useMemo(
    () => (selectedCustomers.length > 0 ? customers.find((c) => c.id === selectedCustomers[0].id)?.phone ?? "" : ""),
    [customers, selectedCustomers]
  );

  const customerAddress = useMemo(
    () => (selectedCustomers.length > 0 ? customers.find((c) => c.id === selectedCustomers[0].id)?.address ?? "" : ""),
    [customers, selectedCustomers]
  );

  const finalSummary = useMemo(() => {
    let openingBalance = 0;
    let totalSales = 0;
    let totalPaid = 0;
    let finalBalance = 0;
    for (const b of generatedBills) {
      openingBalance += b.openingBalance;
      totalSales += b.totalSales;
      totalPaid += b.totalPaid;
      finalBalance += b.finalBalance;
    }
    return { openingBalance, totalSales, totalPaid, finalBalance };
  }, [generatedBills]);

  const handleShareWhatsApp = () => {
    if (!shareUrl) return;
    const sharePeriodLabel = selectedCustomers.length === 1 
      ? `${formatDate(selectedCustomers[0].startDate)} → ${formatDate(selectedCustomers[0].endDate)}`
      : startDate && endDate ? `${formatDate(startDate)} → ${formatDate(endDate)}` : "—";

    const text = selectedCustomers.length === 1 
      ? `Dear ${customerName},\n\nGreetings from *${profile?.dairy_name || "Dairy"}*!\n\nPlease find your bill for the period ${sharePeriodLabel} linked below.\n\nYour net payable amount is: *₹${finalSummary.finalBalance.toFixed(2)}*\n\n*Download your bill here:*\n${shareUrl}\n\nThank you for choosing us!`
      : `Greetings from *${profile?.dairy_name || "Dairy"}*!\n\nPlease find the combined bills for ${customerName} for the period ${sharePeriodLabel} linked below.\n\n*Download the bills here:*\n${shareUrl}\n\nThank you!`;
    
    // Clean phone number (remove spaces, dashes, etc.)
    let phoneStr = customerPhone.replace(/\D/g, "");
    // If it's a 10 digit Indian number, prefix with 91 automatically
    if (phoneStr && phoneStr.length === 10) {
      phoneStr = "91" + phoneStr;
    }

    const wa = phoneStr 
      ? `https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
      
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  const periodLabel = startDate && endDate ? `${formatDate(startDate)} → ${formatDate(endDate)}` : "—";

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title={t("billing.addNewCustomer")}
      >
        <CustomerForm customer={null} onSuccess={handleNewCustomerSaved} />
      </Modal>

      <h1 className="text-3xl font-bold text-foreground print:hidden">{t("billing.title")}</h1>
      {isBillGenerated && customerName ? (
        <div className="rounded-xl border border-border bg-white/90 px-4 py-3 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "hi" ? "ग्राहक" : "Customer"}
              </p>
              <p className="font-semibold text-sm">{customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "hi" ? "अवधि" : "Period"}
              </p>
              <p className="text-sm">{periodLabel}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:text-right">
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "hi" ? "पहले का बैलेंस" : "Opening"}
                </p>
                <p className="text-sm font-medium">₹{Math.abs(finalSummary.openingBalance).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "hi" ? "अंतिम बैलेंस" : "Final"}
                </p>
                <p className="text-sm font-semibold text-sm">₹{Math.abs(finalSummary.finalBalance).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {uiError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 print:hidden">
          {uiError}
        </p>
      )}
      {uiMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2 print:hidden">
          {uiMessage}
        </p>
      )}
      <Card title={lang === "hi" ? "मानदंड चुनें" : "Select criteria"} className="print:hidden" overflowVisible>
        {bootstrapError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">
            {bootstrapError}
          </p>
        )}
        {customers.length === 0 && !bootstrapError ? (
          <p className="text-muted-foreground py-2">
            No customers yet. Add customers first, then you can generate bills here.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end print:hidden">
          <div>
            <Combobox
              label={lang === "hi" ? "ग्राहक" : "Customer"}
              value=""
              onChange={handleSelectCustomer}
              options={customerOptions}
              placeholder={lang === "hi" ? "ग्राहक चुनें" : "Select Customer"}
              disabled={customers.length === 0}
            />
          </div>
          <DateInput
            label={lang === "hi" ? "डिफ़ॉल्ट शुरू तारीख" : "Default Start Date"}
            id="start-date"
            value={startDate}
            onChange={handleGlobalStartDateChange}
            required
          />
          <DateInput
            label={lang === "hi" ? "डिफ़ॉल्ट अंतिम तारीख" : "Default End Date"}
            id="end-date"
            value={endDate}
            onChange={handleGlobalEndDateChange}
            required
          />
          <Button
            type="button"
            className="min-h-[44px] touch-manipulation"
            onClick={() => void handleGenerateBill()}
            disabled={loading || selectedCustomers.length === 0}
          >
            {loading ? (lang === "hi" ? "बन रहा है…" : "Generating…") : lang === "hi" ? "बिल बनाएं" : "Generate bill"}
          </Button>
        </div>

        {/* Dynamic customer-specific dates editor list */}
        {selectedCustomers.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-6 print:hidden">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {lang === "hi" ? "चयनित ग्राहक और विशिष्ट तिथियां" : "Selected Customers & Dates"}
            </p>
            <div className="space-y-3">
              {selectedCustomers.map((item) => {
                const cust = customers.find((c) => c.id === item.id);
                if (!cust) return null;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/85 border border-slate-200/50 rounded-2xl p-4 transition-colors hover:border-slate-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{cust.name}</p>
                      {cust.phone && <p className="text-xs text-muted-foreground mt-0.5">{cust.phone}</p>}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-end md:items-center flex-[2] w-full md:w-auto">
                      <div className="w-full sm:w-auto flex-1">
                        <DateInput
                          label={lang === "hi" ? "शुरू तारीख" : "Start Date"}
                          id={`start-date-${item.id}`}
                          value={item.startDate}
                          onChange={(val) => handleCustomerDateChange(item.id, "startDate", val)}
                          required
                        />
                      </div>
                      <div className="w-full sm:w-auto flex-1">
                        <DateInput
                          label={lang === "hi" ? "अंतिम तारीख" : "End Date"}
                          id={`end-date-${item.id}`}
                          value={item.endDate}
                          onChange={(val) => handleCustomerDateChange(item.id, "endDate", val)}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomer(item.id)}
                      className="flex h-9 w-9 items-center justify-center bg-slate-200/60 hover:bg-destructive/10 hover:text-destructive text-slate-500 rounded-full transition-colors focus:outline-none shrink-0 self-end md:self-auto"
                      title={lang === "hi" ? "हटाएं" : "Remove"}
                    >
                      <span className="text-xl font-bold leading-none">&times;</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-4 print:hidden">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full touch-manipulation sm:w-auto"
            onClick={() => setIsAddCustomerOpen(true)}
          >
            {t("billing.addNewCustomer")}
          </Button>
        </div>
      </Card>

      {isBillGenerated && generatedBills.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              Print
            </Button>
            <Button onClick={handleSharePdf} disabled={shareLoading}>
              {shareLoading ? "Uploading PDF…" : "Upload & get share link"}
            </Button>
            {shareUrl && (
              <Button variant="outline" onClick={handleCopyLink}>
                Copy link
              </Button>
            )}
            {shareUrl && (
              <Button variant="outline" onClick={handleShareWhatsApp}>
                Share on WhatsApp
              </Button>
            )}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
              <Button
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                className="py-1 px-3 min-h-0 text-xs shadow-none border-0"
                onClick={() => setViewMode("grid")}
              >
                Grid View (Traditional)
              </Button>
              <Button
                variant={viewMode === "list" ? "primary" : "ghost"}
                size="sm"
                className="py-1 px-3 min-h-0 text-xs shadow-none border-0"
                onClick={() => setViewMode("list")}
              >
                List View
              </Button>
            </div>
          </div>
          {shareUrl && (
            <p className="text-sm text-muted-foreground print:hidden break-all">
              Share link (expires in 7 days): {shareUrl}
            </p>
          )}
          <p className="text-xs text-muted-foreground print:hidden">
            Supabase storage bucket should be private and named "{bucketName}".
          </p>

          <div className={generatedBills.length > 1 ? "print-grid grid grid-cols-1 md:grid-cols-2 gap-4" : "bill-print"}>
            {generatedBills.map((bill) => (
              <BillStatement
                key={bill.customerId}
                dairyName={profile?.dairy_name ?? "Dairy"}
                tagline={profile?.tagline}
                address={profile?.address}
                phone={profile?.phone}
                gst={profile?.gst}
                customerName={bill.customerName}
                customerPhone={bill.customerPhone}
                customerAddress={bill.customerAddress}
                periodLabel={bill.periodLabel}
                lines={bill.lines}
                openingBalance={bill.openingBalance}
                totalSales={bill.totalSales}
                totalPaid={bill.totalPaid}
                finalBalance={bill.finalBalance}
                viewMode={viewMode}
              />
            ))}
            {/* If there are 2 or 3 bills, we pad with empty dashed divs in print view to maintain 2x2 grid cell size */}
            {generatedBills.length > 1 && generatedBills.length < 4 && (
              Array.from({ length: 4 - generatedBills.length }).map((_, i) => (
                <div key={`pad-${i}`} className="print-pad-cell hidden print:block border border-dashed border-black/40 rounded-2xl bg-white" />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BillingPage;
