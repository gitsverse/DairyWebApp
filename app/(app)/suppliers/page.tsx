"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import SupplierForm from "@/components/forms/SupplierForm";
import SupplierTransactionForm from "@/components/forms/SupplierTransactionForm";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { TrashIcon } from "@heroicons/react/24/outline";

const FETCH_MS = 18_000;

interface SupplierSummary {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  total_purchases: number;
  total_paid: number;
  balance: number;
  dairy_name?: string;
}

const SuppliersPage = () => {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<SupplierSummary | null>(
    null
  );
  const [editingSupplier, setEditingSupplier] = useState<SupplierSummary | null>(
    null
  );

  // Deletion State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierSummary | null>(null);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);

  const fetchSupplierSummaries = useCallback(async () => {
    setLoadError(null);
    try {
      const { data: rows, error: cErr } = await withTimeout(
        supabaseClient.from("daily_suppliers" as any).select("id, name, phone, address"),
        FETCH_MS
      ) as { data: any[] | null; error: any };

      if (cErr) {
        console.error(cErr);
        setLoadError(cErr.message);
        setSuppliers([]);
        return;
      }

      let entries: any[] = [];
      let entriesPage = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error: eErr } = await withTimeout(
          supabaseClient
            .from("daily_supplier_entries" as any)
            .select("supplier_id, total_amount")
            .range(entriesPage * pageSize, (entriesPage + 1) * pageSize - 1),
          FETCH_MS
        ) as { data: any[] | null; error: any };

        if (eErr) {
          setLoadError(eErr.message);
          setSuppliers([]);
          return;
        }

        if (!data || data.length === 0) break;
        entries = entries.concat(data);
        if (data.length < pageSize) break;
        entriesPage++;
      }

      let txs: any[] = [];
      let txsPage = 0;
      while (true) {
        const { data, error: tErr } = await withTimeout(
          supabaseClient
            .from("daily_supplier_transactions" as any)
            .select("supplier_id, amount, type")
            .range(txsPage * pageSize, (txsPage + 1) * pageSize - 1),
          FETCH_MS
        ) as { data: any[] | null; error: any };

        if (tErr) {
          setLoadError(tErr.message);
          setSuppliers([]);
          return;
        }

        if (!data || data.length === 0) break;
        txs = txs.concat(data);
        if (data.length < pageSize) break;
        txsPage++;
      }

      const purchasesMap = new Map<string, number>();
      const paidMap = new Map<string, number>();

      for (const e of entries) {
        const id = e.supplier_id as string;
        purchasesMap.set(id, (purchasesMap.get(id) || 0) + Number(e.total_amount || 0));
      }
      for (const t of txs) {
        const id = t.supplier_id as string;
        if (t.type === "due") {
          purchasesMap.set(id, (purchasesMap.get(id) || 0) + Number(t.amount || 0));
        } else {
          paidMap.set(id, (paidMap.get(id) || 0) + Number(t.amount || 0));
        }
      }

      const { data: profile } = await supabaseClient.from("daily_profile").select("dairy_name").maybeSingle() as { data: any | null };

      const list: SupplierSummary[] = (rows || []).map((s) => {
        const purchases = purchasesMap.get(s.id) || 0;
        const paid = paidMap.get(s.id) || 0;
        return {
          id: s.id,
          name: s.name,
          phone: s.phone,
          address: s.address,
          total_purchases: purchases,
          total_paid: paid,
          balance: purchases - paid,
          dairy_name: profile?.dairy_name || "Dairy",
        };
      });

      setSuppliers(list);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : "Failed to load suppliers");
      setSuppliers([]);
    }
  }, []);

  useEffect(() => {
    fetchSupplierSummaries();
  }, [fetchSupplierSummaries]);

  const openModalForNew = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (supplier: SupplierSummary) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchSupplierSummaries();
  };

  const handlePaymentSuccess = () => {
    setIsPaymentOpen(false);
    setPaymentSupplier(null);
    fetchSupplierSummaries();
  };

  // Open Deletion Confirmation Dialog
  const openDeleteConfirm = (supplier: SupplierSummary) => {
    setSupplierToDelete(supplier);
    setIsDeleteConfirmOpen(true);
  };

  // Delete Supplier Handler
  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setIsDeletingSupplier(true);
    try {
      const { error } = await supabaseClient
        .from("daily_suppliers" as any)
        .delete()
        .eq("id", supplierToDelete.id);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast(
        lang === "hi"
          ? "आपूर्तिकर्ता सफलतापूर्वक हटा दिया गया।"
          : "Supplier deleted successfully.",
        "success"
      );

      // Instantly filter local state list without reload
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierToDelete.id));
      setIsDeleteConfirmOpen(false);
      setSupplierToDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete supplier.", "error");
    } finally {
      setIsDeletingSupplier(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Supplier Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? (lang === "hi" ? "आपूर्तिकर्ता संपादित करें" : "Edit Supplier") : (lang === "hi" ? "नया आपूर्तिकर्ता जोड़ें" : "Add New Supplier")}
      >
        <SupplierForm
          supplier={
            editingSupplier
              ? {
                  id: editingSupplier.id,
                  name: editingSupplier.name,
                  phone: editingSupplier.phone,
                  address: editingSupplier.address,
                }
              : null
          }
          onSuccess={handleSuccess}
        />
      </Modal>

      {/* Payment / Advance Form Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={lang === "hi" ? "भुगतान / एडवांस जोड़ें" : "Add Payment / Advance"}
      >
        {paymentSupplier ? (
          <SupplierTransactionForm
            supplierId={paymentSupplier.id}
            onSuccess={handlePaymentSuccess}
            defaultType={paymentSupplier.balance > 0 ? "payment" : "advance"}
          />
        ) : null}
      </Modal>

      {/* Supplier Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setSupplierToDelete(null);
        }}
        title={lang === "hi" ? "आपूर्तिकर्ता हटाएं?" : "Delete Supplier?"}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {lang === "hi"
              ? `क्या आप वाकई "${supplierToDelete?.name}" को हटाना चाहते हैं? यह उनके सभी एंट्री और भुगतान को स्थायी रूप से हटा देगा। यह कार्रवाई वापस नहीं ली जा सकती।`
              : `Are you sure you want to delete "${supplierToDelete?.name}"? This will permanently delete all their entries and payments. This action cannot be undone.`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setSupplierToDelete(null);
              }}
            >
              {lang === "hi" ? "रद्द करें" : "Cancel"}
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-100"
              onClick={handleDeleteSupplier}
              disabled={isDeletingSupplier}
            >
              {isDeletingSupplier
                ? lang === "hi"
                  ? "हटाया जा रहा है…"
                  : "Deleting…"
                : lang === "hi"
                ? "स्थायी रूप से हटाएं"
                : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>

      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("nav.suppliers")}</h1>
      <div className="flex max-w-xl flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by supplier name or phone"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm touch-manipulation"
          aria-label="Search suppliers"
        />
        <Button
          type="button"
          onClick={openModalForNew}
          className="h-12 min-h-[48px] w-full text-base font-semibold sm:w-auto sm:self-start sm:px-8 touch-manipulation"
        >
          {lang === "hi" ? "आपूर्तिकर्ता जोड़ें" : "Add Supplier"}
        </Button>
      </div>

      <Card title={lang === "hi" ? "सभी आपूर्तिकर्ता" : "All Suppliers"}>
        {loadError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">
            {loadError}
          </p>
        )}
        {filteredSuppliers.length === 0 && !loadError ? (
          <p className="text-muted-foreground py-6 text-center">
            {suppliers.length === 0
              ? "No suppliers yet. Use \"Add Supplier\" to create one."
              : "No supplier matches your search."}
          </p>
        ) : filteredSuppliers.length === 0 ? null : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
                  <tr>
                    <th className="px-4 py-3">{lang === "hi" ? "आपूर्तिकर्ता विवरण" : "Supplier Details"}</th>
                    <th className="px-4 py-3 text-right">Total Purchases</th>
                    <th className="px-4 py-3 text-right">Total Paid</th>
                    <th className="px-4 py-3 text-right">{lang === "hi" ? "बैलेंस" : "Balance"}</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border hover:bg-secondary/40 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/supplier-ledger/${s.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {s.name}
                        </Link>
                        {s.phone && (
                          <p className="text-xs text-muted-foreground">{s.phone}</p>
                        )}
                        {s.address && (
                          <p className="text-xs text-muted-foreground">{s.address}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        रु{s.total_purchases.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-700 font-medium">
                        रु{s.total_paid.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-bold ${
                          s.balance > 0 ? "text-destructive" : "text-emerald-700"
                        }`}
                      >
                        रु{Math.abs(s.balance).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center items-center gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            className="touch-manipulation min-h-[44px]"
                            onClick={() => openModalForEdit(s)}
                          >
                            {lang === "hi" ? "संपादित करें" : "Edit"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="touch-manipulation min-h-[44px]"
                            onClick={() => {
                              setPaymentSupplier(s);
                              setIsPaymentOpen(true);
                            }}
                          >
                            {lang === "hi" ? "भुगतान दें" : "Give payment"}
                          </Button>
                          <Link href={`/supplier-ledger/${s.id}`}>
                            <Button type="button" variant="outline" className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 touch-manipulation min-h-[44px]">
                              {lang === "hi" ? "लेजर देखें" : "View Ledger"}
                            </Button>
                          </Link>
                          {/* Red Deletion Icon Button */}
                          <button
                            onClick={() => openDeleteConfirm(s)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all inline-flex items-center touch-manipulation min-h-[44px] min-w-[44px] justify-center"
                            title={lang === "hi" ? "आपूर्तिकर्ता हटाएं" : "Delete supplier"}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredSuppliers.map((s) => (
                <div key={`mob-${s.id}`} className="border border-border rounded-xl p-4 space-y-3 bg-white shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/supplier-ledger/${s.id}`} className="font-bold text-primary text-base hover:underline">{s.name}</Link>
                      {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                      {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{lang === "hi" ? "बैलेंस" : "Balance"}</p>
                      <p className={`font-bold ${s.balance > 0 ? "text-destructive" : "text-emerald-700"}`}>
                        रु{Math.abs(s.balance).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm bg-secondary/30 rounded-lg p-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Purchases</p>
                      <p className="font-medium">रु{s.total_purchases.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Paid</p>
                      <p className="font-medium text-emerald-700">रु{s.total_paid.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      className="touch-manipulation min-h-[44px] flex-1 sm:flex-none justify-center"
                      onClick={() => {
                        setPaymentSupplier(s);
                        setIsPaymentOpen(true);
                      }}
                    >
                      {lang === "hi" ? "भुगतान दें" : "Give payment"}
                    </Button>
                    <Link href={`/supplier-ledger/${s.id}`} className="flex-1 sm:flex-none">
                      <Button type="button" variant="outline" className="w-full text-indigo-600 hover:bg-indigo-50 border-indigo-200 touch-manipulation min-h-[44px] justify-center">
                        {lang === "hi" ? "लेजर" : "Ledger"}
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      className="touch-manipulation min-h-[44px] min-w-[44px] px-0 justify-center"
                      onClick={() => openModalForEdit(s)}
                      title="Edit"
                    >
                      ✎
                    </Button>
                    <button
                      onClick={() => openDeleteConfirm(s)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all inline-flex items-center justify-center touch-manipulation min-h-[44px] min-w-[44px]"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SuppliersPage;
