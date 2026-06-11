"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import SupplierTransactionForm from "@/components/forms/SupplierTransactionForm";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { withTimeout } from "@/lib/withTimeout";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { formatDate, startOfLocalMonthISO } from "@/lib/dateUtils";

const FETCH_MS = 18_000;

function signedBalanceClass(balance: number) {
  if (balance > 0) return "text-destructive";
  if (balance < 0) return "text-emerald-700";
  return "text-muted-foreground";
}

interface LedgerItem {
  id: string;
  type: "entry" | "transaction";
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  original_item: Record<string, unknown>;
}

const SupplierLedgerPage = () => {
  const { t, lang } = useI18n();
  const params = useParams();
  const supplierId = params.supplierId as string;

  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(
    null
  );
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState({
    totalSales: 0, // purchases
    totalPaid: 0,
    finalBalance: 0,
    openingBalance: 0,
    periodSales: 0, // period purchases
    periodPaid: 0,
    periodNetChange: 0,
    periodClosingBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Record<string, unknown> | null>(
    null
  );
  const [editingTransaction, setEditingTransaction] = useState<Record<string, unknown> | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchLedgerData = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setActionError(null);

    try {
      const { data: supplierData, error: supErr } = await withTimeout(
        supabaseClient.from("daily_suppliers").select("id, name").eq("id", supplierId).maybeSingle(),
        FETCH_MS
      );

      if (supErr || !supplierData) {
        setSupplier(null);
        setLedgerItems([]);
        setSummary({
          totalSales: 0,
          totalPaid: 0,
          finalBalance: 0,
          openingBalance: 0,
          periodSales: 0,
          periodPaid: 0,
          periodNetChange: 0,
          periodClosingBalance: 0,
        });
        return;
      }

      setSupplier(supplierData);

      const { data: entries, error: entErr } = await withTimeout(
        supabaseClient
          .from("daily_supplier_entries" as any)
          .select("*, daily_products(name)")
          .eq("supplier_id", supplierId),
        FETCH_MS
      ) as { data: any[] | null; error: any };

      const { data: transactions, error: txErr } = await withTimeout(
        supabaseClient.from("daily_supplier_transactions" as any).select("*").eq("supplier_id", supplierId),
        FETCH_MS
      ) as { data: any[] | null; error: any };

      if (entErr || txErr) {
        setActionError(entErr?.message ?? txErr?.message ?? "Could not load ledger");
        setLedgerItems([]);
        setSummary({
          totalSales: 0,
          totalPaid: 0,
          finalBalance: 0,
          openingBalance: 0,
          periodSales: 0,
          periodPaid: 0,
          periodNetChange: 0,
          periodClosingBalance: 0,
        });
        return;
      }

      type EntryRow = {
        id: string;
        date: string;
        quantity: number;
        price_per_unit: number;
        total_amount: number;
        daily_products: { name: string } | null;
      };
      type TxRow = {
        id: string;
        date: string;
        type: string;
        amount: number;
        note?: string | null;
      };

      const combined = [
        ...(entries || []).map((e: EntryRow) => ({
          id: e.id,
          type: "entry" as const,
          date: e.date,
          description: `${e.quantity} ${e.daily_products?.name ?? "product"} @ रु${Number(e.price_per_unit).toFixed(2)}`,
          debit: Number(e.total_amount),
          credit: 0,
          original_item: e as unknown as Record<string, unknown>,
        })),
        ...(transactions || []).map((t: TxRow) => ({
          id: t.id,
          type: "transaction" as const,
          date: t.date,
          description:
            t.type === "advance"
              ? "Advance"
              : t.type === "adjustment"
                ? "Adjustment"
                : t.type === "due"
                  ? "Remaining Due"
                  : "Payment",
          debit: t.type === "due" ? Number(t.amount) : 0,
          credit: t.type !== "due" ? Number(t.amount) : 0,
          original_item: t as unknown as Record<string, unknown>,
        })),
      ].sort((a, b) => {
        const ta = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (ta !== 0) return ta;
        if (a.type !== b.type) return a.type === "entry" ? -1 : 1;
        return a.id.localeCompare(b.id);
      });

      let runningBalance = 0;
      const processedItems = combined.map((item) => {
        runningBalance += item.debit - item.credit;
        return { ...item, balance: runningBalance };
      });

      const totalSales = processedItems.reduce(
        (sum, item) => sum + item.debit,
        0
      );
      const totalPaid = processedItems.reduce(
        (sum, item) => sum + (item.type === "transaction" && (item.original_item as any).type !== "due" ? item.credit : 0),
        0
      );

      const startOfMonthStr = startOfLocalMonthISO();
      let openingBalance = 0;
      let periodSales = 0;
      let periodPaid = 0;

      for (const item of processedItems) {
        if (item.date < startOfMonthStr) {
          openingBalance += item.debit - item.credit;
        } else {
          if (item.type === "transaction" && (item.original_item as any).type === "due") {
            openingBalance += item.debit;
          } else {
            periodSales += item.debit;
            periodPaid += item.credit;
          }
        }
      }
      const periodNetChange = periodSales - periodPaid;
      const periodClosingBalance = openingBalance + periodNetChange;

      setLedgerItems(processedItems);
      setSummary({
        totalSales,
        totalPaid,
        finalBalance: runningBalance,
        openingBalance,
        periodSales,
        periodPaid,
        periodNetChange,
        periodClosingBalance,
      });
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : "Failed to load ledger");
      setLedgerItems([]);
      setSummary({
        totalSales: 0,
        totalPaid: 0,
        finalBalance: 0,
        openingBalance: 0,
        periodSales: 0,
        periodPaid: 0,
        periodNetChange: 0,
        periodClosingBalance: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  const handleSuccess = () => {
    setIsPaymentModalOpen(false);
    setEditingEntry(null);
    setEditingTransaction(null);
    fetchLedgerData();
  };

  const openEditEntryModal = (entry: Record<string, unknown>) => {
    setEditingEntry(entry);
  };

  const openEditTransactionModal = (tx: Record<string, unknown>) => {
    setEditingTransaction(tx);
  };

  const handleDelete = async (item: LedgerItem) => {
    const tableName = item.type === "entry" ? "daily_supplier_entries" : "daily_supplier_transactions";
    if (confirm(lang === "hi" ? `क्या आप वाकई इस ${item.type === "entry" ? "एंट्री" : "लेनदेन"} को हटाना चाहते हैं?` : `Are you sure you want to delete this ${item.type}?`)) {
      const { error } = await supabaseClient.from(tableName).delete().eq("id", item.id);
      if (error) {
        setActionError(error.message);
        setActionMessage(null);
      } else {
        setActionMessage(lang === "hi" ? "सफलतापूर्वक हटाया गया।" : `${item.type === "entry" ? "Entry" : "Transaction"} deleted.`);
        setActionError(null);
        fetchLedgerData();
      }
    }
  };

  if (!loading && !supplier) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-destructive font-medium">Supplier not found.</p>
        <p className="text-sm text-muted-foreground">
          Check the link or add the supplier from the Suppliers page.
        </p>
      </div>
    );
  }

  if (!supplier) {
    return <div className="p-6 min-h-[40vh]" aria-busy="true" />;
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={lang === "hi" ? "भुगतान / एडवांस जोड़ें" : "Add Payment / Advance"}
      >
        <SupplierTransactionForm
          supplierId={supplierId}
          onSuccess={handleSuccess}
          defaultType={summary.finalBalance > 0 ? "payment" : "advance"}
        />
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title={lang === "hi" ? "एंट्री संपादित करें" : "Edit Entry"}
      >
        {editingEntry && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const qty = Number((form.querySelector('#edit-qty') as HTMLInputElement)?.value);
              const rate = Number((form.querySelector('#edit-rate') as HTMLInputElement)?.value);
              if (!qty || !rate) return;
              const { error } = await supabaseClient
                .from("daily_supplier_entries" as any)
                .update({ quantity: qty, price_per_unit: rate })
                .eq("id", editingEntry.id as string);
              if (error) {
                setActionError(error.message);
                return;
              }
              setActionMessage(lang === "hi" ? "एंट्री संपादित हो गई।" : "Entry updated.");
              setEditingEntry(null);
              fetchLedgerData();
            }}
          >
            <Input
              id="edit-qty"
              label={lang === "hi" ? "मात्रा" : "Quantity"}
              type="number"
              step="0.1"
              defaultValue={String(editingEntry.quantity ?? "")}
              required
            />
            <Input
              id="edit-rate"
              label={lang === "hi" ? "दर (रु)" : "Rate (Rs.)"}
              type="number"
              step="0.01"
              defaultValue={String(editingEntry.price_per_unit ?? "")}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>
                {lang === "hi" ? "रद्द करें" : "Cancel"}
              </Button>
              <Button type="submit">
                {lang === "hi" ? "सेव करें" : "Save"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        title={lang === "hi" ? "लेनदेन संपादित करें" : "Edit Transaction"}
      >
        {editingTransaction && (
          <SupplierTransactionForm
            supplierId={supplierId}
            onSuccess={handleSuccess}
            defaultType={editingTransaction.type as any}
            lockType
            transaction={editingTransaction}
          />
        )}
      </Modal>

      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-foreground">Ledger for {supplier.name}</h1>
        <Button type="button" onClick={() => setIsPaymentModalOpen(true)}>
          {lang === "hi" ? "भुगतान जोड़ें" : "Add Payment"}
        </Button>
      </div>
      {actionError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
          {actionMessage}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Previous Balance">
          <p className={`text-2xl font-semibold ${signedBalanceClass(summary.openingBalance)}`}>
            रु{Math.abs(summary.openingBalance).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Before this month
          </p>
        </Card>
        <Card title="This Month Purchases">
          <p className="text-2xl font-semibold">रु{summary.periodSales.toFixed(2)}</p>
        </Card>
        <Card title="This Month Paid/Advance">
          <p className="text-2xl font-semibold text-emerald-700">
            रु{summary.periodPaid.toFixed(2)}
          </p>
        </Card>
        <Card title={lang === "hi" ? "शेष बैलेंस" : "Remaining Balance"}>
          <p
            className={`text-2xl font-semibold ${signedBalanceClass(summary.periodClosingBalance)}`}
          >
            रु{Math.abs(summary.periodClosingBalance).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "hi"
              ? "पिछला बैलेंस + इस महीने की खरीद - भुगतान"
              : "Previous balance + this month purchases − paid"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total Purchases (All Time)">
          <p className="text-2xl font-semibold">रु{summary.totalSales.toFixed(2)}</p>
        </Card>
        <Card title="Total Paid (All Time)">
          <p className="text-2xl font-semibold text-emerald-700">
            रु{summary.totalPaid.toFixed(2)}
          </p>
        </Card>
        <Card title="Final Balance (All Time)">
          <p className={`text-2xl font-semibold ${signedBalanceClass(summary.finalBalance)}`}>
            रु{Math.abs(summary.finalBalance).toFixed(2)}
          </p>
        </Card>
      </div>

      <Card title="Transaction History">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit (Purchase)</th>
              <th className="px-4 py-3 text-right">Credit (Paid)</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledgerItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No entries or payments yet for this supplier.
                </td>
              </tr>
            ) : null}
            {ledgerItems.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-secondary/40">
                <td className="px-4 py-2 font-medium">
                  {formatDate(item.date)}
                </td>
                <td className="px-4 py-2">{item.description}</td>
                <td className="px-4 py-2 text-right text-destructive/90">
                  {item.debit > 0 ? `रु${item.debit.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2 text-right text-emerald-700">
                  {item.credit > 0 ? `रु${item.credit.toFixed(2)}` : "—"}
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium ${signedBalanceClass(item.balance)}`}
                >
                  रु{Math.abs(item.balance).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {item.type === "entry" ? (
                      <Button
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        onClick={() => openEditEntryModal(item.original_item)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        onClick={() => openEditTransactionModal(item.original_item)}
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      className="px-2 py-1 text-xs"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default SupplierLedgerPage;
