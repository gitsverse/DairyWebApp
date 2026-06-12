"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import CustomerForm from "@/components/forms/CustomerForm";
import TransactionForm from "@/components/forms/TransactionForm";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { TrashIcon } from "@heroicons/react/24/outline";

const FETCH_MS = 18_000;

interface CustomerSummary {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  total_sales: number;
  total_paid: number;
  balance: number;
  dairy_name?: string;
}

const CustomersPage = () => {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<CustomerSummary | null>(
    null
  );
  const [editingCustomer, setEditingCustomer] = useState<CustomerSummary | null>(
    null
  );

  // Deletion State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerSummary | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const fetchCustomerSummaries = useCallback(async () => {
    setLoadError(null);
    try {
      const { data: rows, error: cErr } = await withTimeout(
        supabaseClient.from("daily_customers" as any).select("id, name, phone, address"),
        FETCH_MS
      ) as { data: any[] | null; error: any };

      if (cErr) {
        console.error(cErr);
        setLoadError(cErr.message);
        setCustomers([]);
        return;
      }

      let entries: any[] = [];
      let entriesPage = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error: eErr } = await withTimeout(
          supabaseClient
            .from("daily_entries" as any)
            .select("customer_id, total_amount")
            .range(entriesPage * pageSize, (entriesPage + 1) * pageSize - 1),
          FETCH_MS
        ) as { data: any[] | null; error: any };

        if (eErr) {
          setLoadError(eErr.message);
          setCustomers([]);
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
            .from("daily_transactions" as any)
            .select("customer_id, amount, type")
            .range(txsPage * pageSize, (txsPage + 1) * pageSize - 1),
          FETCH_MS
        ) as { data: any[] | null; error: any };

        if (tErr) {
          setLoadError(tErr.message);
          setCustomers([]);
          return;
        }

        if (!data || data.length === 0) break;
        txs = txs.concat(data);
        if (data.length < pageSize) break;
        txsPage++;
      }

      const salesMap = new Map<string, number>();
      const paidMap = new Map<string, number>();

      for (const e of entries) {
        const id = e.customer_id as string;
        salesMap.set(id, (salesMap.get(id) || 0) + Number(e.total_amount || 0));
      }
      for (const t of txs) {
        const id = t.customer_id as string;
        if (t.type === "due") {
          salesMap.set(id, (salesMap.get(id) || 0) + Number(t.amount || 0));
        } else {
          paidMap.set(id, (paidMap.get(id) || 0) + Number(t.amount || 0));
        }
      }

      const { data: profile } = await supabaseClient.from("daily_profile").select("dairy_name").maybeSingle() as { data: any | null };

      const list: CustomerSummary[] = (rows || []).map((c) => {
        const sales = salesMap.get(c.id) || 0;
        const paid = paidMap.get(c.id) || 0;
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          total_sales: sales,
          total_paid: paid,
          balance: sales - paid,
          dairy_name: profile?.dairy_name || "Dairy",
        };
      });

      setCustomers(list);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : "Failed to load customers");
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    fetchCustomerSummaries();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("add") === "true") {
        setIsModalOpen(true);
      }
    }
  }, [fetchCustomerSummaries]);

  const openModalForNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (customer: CustomerSummary) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchCustomerSummaries();
  };

  const handlePaymentSuccess = () => {
    setIsPaymentOpen(false);
    setPaymentCustomer(null);
    fetchCustomerSummaries();
  };

  // Open Deletion Confirmation Dialog
  const openDeleteConfirm = (customer: CustomerSummary) => {
    setCustomerToDelete(customer);
    setIsDeleteConfirmOpen(true);
  };

  // Delete Customer Handler
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      const { error } = await supabaseClient
        .from("daily_customers" as any)
        .delete()
        .eq("id", customerToDelete.id);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast(
        lang === "hi"
          ? "ग्राहक सफलतापूर्वक हटा दिया गया।"
          : "Customer deleted successfully.",
        "success"
      );

      // Instantly filter local state list without reload
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      setIsDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete customer.", "error");
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  const handleRemindWhatsApp = (customer: CustomerSummary) => {
    if (!customer.phone) {
      alert(lang === "hi" ? "इस ग्राहक का फ़ोन नंबर मौजूद नहीं है।" : "Phone number missing for this customer.");
      return;
    }
    const text = `Dear ${customer.name},\n\nGreetings from *${customer.dairy_name || "Dairy"}*!\n\nWe hope you're enjoying our dairy products! This is a friendly reminder regarding your pending payment of ₹${customer.balance.toFixed(2)}.\n\nPlease clear the dues at your earliest convenience. Thank you!`;
    
    let phoneStr = customer.phone.replace(/\D/g, "");
    if (phoneStr && phoneStr.length === 10) {
      phoneStr = "91" + phoneStr;
    }

    const wa = phoneStr 
      ? `https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
      
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Customer Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? (lang === "hi" ? "ग्राहक संपादित करें" : "Edit Customer") : (lang === "hi" ? "नया ग्राहक जोड़ें" : "Add New Customer")}
      >
        <CustomerForm
          customer={
            editingCustomer
              ? {
                  id: editingCustomer.id,
                  name: editingCustomer.name,
                  phone: editingCustomer.phone,
                  address: editingCustomer.address,
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
        {paymentCustomer ? (
          <TransactionForm
            customerId={paymentCustomer.id}
            onSuccess={handlePaymentSuccess}
            defaultType={paymentCustomer.balance > 0 ? "payment" : "advance"}
          />
        ) : null}
      </Modal>

      {/* Customer Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        }}
        title={lang === "hi" ? "ग्राहक हटाएं?" : "Delete Customer?"}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {lang === "hi"
              ? `क्या आप वाकई "${customerToDelete?.name}" को हटाना चाहते हैं? यह उनके सभी एंट्री और भुगतान को स्थायी रूप से हटा देगा। यह कार्रवाई वापस नहीं ली जा सकती।`
              : `Are you sure you want to delete "${customerToDelete?.name}"? This will permanently delete all their entries and payments. This action cannot be undone.`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setCustomerToDelete(null);
              }}
            >
              {lang === "hi" ? "रद्द करें" : "Cancel"}
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-100"
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
            >
              {isDeletingCustomer
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

      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("customers.title")}</h1>
      <div className="flex max-w-xl flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by customer name or phone"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm touch-manipulation"
          aria-label="Search customers"
        />
        <Button
          type="button"
          onClick={openModalForNew}
          className="h-12 min-h-[48px] w-full text-base font-semibold sm:w-auto sm:self-start sm:px-8 touch-manipulation"
        >
          {t("customers.add")}
        </Button>
      </div>

      <Card title={lang === "hi" ? "सभी ग्राहक" : "All Customers"}>
        {loadError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">
            {loadError}
          </p>
        )}
        {filteredCustomers.length === 0 && !loadError ? (
          <p className="text-muted-foreground py-6 text-center">
            {customers.length === 0
              ? "No customers yet. Use \"Add Customer\" to create one."
              : "No customer matches your search."}
          </p>
        ) : filteredCustomers.length === 0 ? null : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
                  <tr>
                    <th className="px-4 py-3">{lang === "hi" ? "ग्राहक विवरण" : "Customer Details"}</th>
                    <th className="px-4 py-3 text-right">Total Sales</th>
                    <th className="px-4 py-3 text-right">Total Paid</th>
                    <th className="px-4 py-3 text-right">{lang === "hi" ? "बैलेंस" : "Balance"}</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border hover:bg-secondary/40 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/ledger/${c.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.phone && (
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        )}
                        {c.address && (
                          <p className="text-xs text-muted-foreground">{c.address}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        ₹{c.total_sales.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-700 font-medium">
                        ₹{c.total_paid.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-bold ${
                          c.balance > 0 ? "text-destructive" : "text-emerald-700"
                        }`}
                      >
                        ₹{Math.abs(c.balance).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center items-center gap-2 flex-wrap">
                          {c.balance > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="text-primary hover:bg-primary/10 border-primary/20 touch-manipulation min-h-[44px]"
                              onClick={() => handleRemindWhatsApp(c)}
                            >
                              {lang === "hi" ? "याद दिलाएं" : "Remind"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            className="touch-manipulation min-h-[44px]"
                            onClick={() => openModalForEdit(c)}
                          >
                            {lang === "hi" ? "संपादित करें" : "Edit"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="touch-manipulation min-h-[44px]"
                            onClick={() => {
                              setPaymentCustomer(c);
                              setIsPaymentOpen(true);
                            }}
                          >
                            {lang === "hi" ? "भुगतान लें" : "Take payment"}
                          </Button>
                          <Link href={`/ledger/${c.id}`}>
                            <Button type="button" variant="outline" className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 touch-manipulation min-h-[44px]">
                              {lang === "hi" ? "लेजर देखें" : "View Ledger"}
                            </Button>
                          </Link>
                          {/* Red Deletion Icon Button */}
                          <button
                            onClick={() => openDeleteConfirm(c)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all inline-flex items-center touch-manipulation min-h-[44px] min-w-[44px] justify-center"
                            title={lang === "hi" ? "ग्राहक हटाएं" : "Delete customer"}
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
              {filteredCustomers.map((c) => (
                <div key={`mob-${c.id}`} className="border border-border rounded-xl p-4 space-y-3 bg-white shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/ledger/${c.id}`} className="font-bold text-primary text-base hover:underline">{c.name}</Link>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{lang === "hi" ? "बैलेंस" : "Balance"}</p>
                      <p className={`font-bold ${c.balance > 0 ? "text-destructive" : "text-emerald-700"}`}>
                        ₹{Math.abs(c.balance).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm bg-secondary/30 rounded-lg p-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Sales</p>
                      <p className="font-medium">₹{c.total_sales.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Paid</p>
                      <p className="font-medium text-emerald-700">₹{c.total_paid.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {c.balance > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-primary hover:bg-primary/10 border-primary/20 touch-manipulation min-h-[44px] flex-1 sm:flex-none justify-center"
                        onClick={() => handleRemindWhatsApp(c)}
                      >
                        {lang === "hi" ? "याद दिलाएं" : "Remind"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="touch-manipulation min-h-[44px] flex-1 sm:flex-none justify-center"
                      onClick={() => {
                        setPaymentCustomer(c);
                        setIsPaymentOpen(true);
                      }}
                    >
                      {lang === "hi" ? "भुगतान लें" : "Take payment"}
                    </Button>
                    <Link href={`/ledger/${c.id}`} className="flex-1 sm:flex-none">
                      <Button type="button" variant="outline" className="w-full text-indigo-600 hover:bg-indigo-50 border-indigo-200 touch-manipulation min-h-[44px] justify-center">
                        {lang === "hi" ? "लेजर" : "Ledger"}
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      className="touch-manipulation min-h-[44px] min-w-[44px] px-0 justify-center"
                      onClick={() => openModalForEdit(c)}
                      title="Edit"
                    >
                      ✎
                    </Button>
                    <button
                      onClick={() => openDeleteConfirm(c)}
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

export default CustomersPage;
