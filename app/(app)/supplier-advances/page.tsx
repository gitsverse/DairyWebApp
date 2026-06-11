"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { toLocalDateString } from "@/lib/dateUtils";

interface SupplierBalance {
  supplier_id: string;
  name: string;
  balance: number;
  phone?: string | null;
  dairy_name?: string;
}

export default function SupplierAdvancesPage() {
  const { t, lang } = useI18n();
  const [suppliers, setSuppliers] = useState<SupplierBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState<SupplierBalance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "online" | "upi">("cash");
  const [type, setType] = useState<"advance" | "payment" | "adjustment">("payment");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBalances = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: rows } = await supabaseClient
        .from("daily_suppliers" as any)
        .select("id, name, phone") as { data: any[] | null };

      let entries: any[] = [];
      let entriesPage = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabaseClient
          .from("daily_supplier_entries" as any)
          .select("supplier_id, total_amount")
          .range(entriesPage * pageSize, (entriesPage + 1) * pageSize - 1) as { data: any[] | null };

        if (!data || data.length === 0) break;
        entries = entries.concat(data);
        if (data.length < pageSize) break;
        entriesPage++;
      }

      let txs: any[] = [];
      let txsPage = 0;
      while (true) {
        const { data } = await supabaseClient
          .from("daily_supplier_transactions" as any)
          .select("supplier_id, amount, type")
          .range(txsPage * pageSize, (txsPage + 1) * pageSize - 1) as { data: any[] | null };

        if (!data || data.length === 0) break;
        txs = txs.concat(data);
        if (data.length < pageSize) break;
        txsPage++;
      }

      const { data: profile } = await supabaseClient
        .from("daily_profile")
        .select("dairy_name")
        .maybeSingle() as { data: any | null };

      const purchasesMap = new Map<string, number>();
      const paidMap = new Map<string, number>();

      for (const e of entries) {
        purchasesMap.set(e.supplier_id, (purchasesMap.get(e.supplier_id) || 0) + Number(e.total_amount || 0));
      }
      for (const t of txs) {
        if (t.type === "due") {
          purchasesMap.set(t.supplier_id, (purchasesMap.get(t.supplier_id) || 0) + Number(t.amount || 0));
        } else {
          paidMap.set(t.supplier_id, (paidMap.get(t.supplier_id) || 0) + Number(t.amount || 0));
        }
      }

      const list: SupplierBalance[] = (rows || []).map((s) => ({
        supplier_id: s.id,
        name: s.name,
        phone: s.phone,
        balance: (purchasesMap.get(s.id) || 0) - (paidMap.get(s.id) || 0),
        dairy_name: profile?.dairy_name || "Dairy",
      }));

      setSuppliers(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const openModal = (supplier: SupplierBalance) => {
    setSelectedSupplier(supplier);
    setType(supplier.balance > 0 ? "payment" : "advance");
    setAmount("");
    setIsModalOpen(true);
  };

  const handleRemindWhatsApp = (supplier: SupplierBalance) => {
    if (!supplier.phone) {
      alert(lang === "hi" ? "इस आपूर्तिकर्ता का फ़ोन नंबर मौजूद नहीं है।" : "Phone number missing for this supplier.");
      return;
    }
    const text = lang === "hi"
      ? `नमस्ते ${supplier.name},\n\n*${supplier.dairy_name}* की ओर से अभिवादन! 🥛\n\nआपके खाते में ₹${supplier.balance.toFixed(2)} का भुगतान बकाया है। कृपया जल्द से जल्द भुगतान करें।\n\nधन्यवाद!`
      : `Dear ${supplier.name},\n\nGreetings from *${supplier.dairy_name}*! 🥛\n\nThis is a reminder that we owe you ₹${supplier.balance.toFixed(2)} for milk supplies. We will settle this soon.\n\nThank you!`;

    let phoneStr = supplier.phone.replace(/\D/g, "");
    if (phoneStr && phoneStr.length === 10) phoneStr = "91" + phoneStr;
    const wa = phoneStr
      ? `https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !amount) return;
    setIsSubmitting(true);

    const today = toLocalDateString();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      alert("No authenticated user session found.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabaseClient.from("daily_supplier_transactions" as any).insert({
      supplier_id: selectedSupplier.supplier_id,
      type,
      amount: Number(amount),
      payment_mode: paymentMode,
      date: today,
      user_id: user.id,
    });

    if (!error) {
      setIsModalOpen(false);
      loadBalances();
    } else {
      alert("Error adding transaction: " + error.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        {lang === "hi" ? "आपूर्तिकर्ता भुगतान प्रबंधन" : "Supplier Payment Management"}
      </h1>

      <Card title={lang === "hi" ? "आपूर्तिकर्ता बैलेंस" : "Supplier Balances"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
              <tr>
                <th className="px-4 py-3">{lang === "hi" ? "आपूर्तिकर्ता" : "Supplier"}</th>
                <th className="px-4 py-3">{lang === "hi" ? "स्थिति" : "Status"}</th>
                <th className="px-4 py-3 text-right">{lang === "hi" ? "राशि" : "Amount"}</th>
                <th className="px-4 py-3 text-right">{lang === "hi" ? "क्रिया" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted-foreground">
                    {lang === "hi" ? "लोड हो रहा है…" : "Loading..."}
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted-foreground">
                    {lang === "hi" ? "कोई आपूर्तिकर्ता नहीं मिला।" : "No suppliers found."}
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.supplier_id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium uppercase">{s.name}</p>
                      {s.phone && <p className="text-xs text-muted-foreground mt-0.5">📞 {s.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {s.balance > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {lang === "hi" ? "भुगतान बाकी है" : "Payment Pending"}
                        </span>
                      ) : s.balance < 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {lang === "hi" ? "एडवांस दिया गया" : "Advance Given"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {lang === "hi" ? "सेटल" : "Settled"}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${s.balance > 0 ? "text-amber-700" : s.balance < 0 ? "text-blue-700" : ""}`}>
                      ₹{Math.abs(s.balance).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {s.phone && (
                          <Button size="sm" variant="outline" className="text-green-700 hover:bg-green-50 border-green-200" onClick={() => handleRemindWhatsApp(s)}>
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            {lang === "hi" ? "WhatsApp" : "WhatsApp"}
                          </Button>
                        )}
                        <Button size="sm" onClick={() => openModal(s)}>
                          {lang === "hi" ? "एंट्री जोड़ें" : "Add Payment"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedSupplier && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`${lang === "hi" ? "भुगतान जोड़ें" : "Add Payment"} – ${selectedSupplier.name}`}
        >
          <form onSubmit={handleTransaction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                {lang === "hi" ? "लेनदेन प्रकार" : "Transaction Type"}
              </label>
              <div className="flex gap-4 flex-wrap">
                {(["payment", "advance", "adjustment"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={opt}
                      checked={type === opt}
                      onChange={() => setType(opt)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">
                      {opt === "payment"
                        ? lang === "hi" ? "भुगतान (बिल के खिलाफ)" : "Payment (against bill)"
                        : opt === "advance"
                        ? lang === "hi" ? "एडवांस" : "Advance"
                        : lang === "hi" ? "समायोजन" : "Adjustment"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Input
              id="sup-amount"
              label={lang === "hi" ? "राशि (₹)" : "Amount (₹)"}
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                {lang === "hi" ? "भुगतान माध्यम" : "Payment Mode"}
              </label>
              <div className="flex gap-4">
                {(["cash", "online", "upi"] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={mode}
                      checked={paymentMode === mode}
                      onChange={() => setPaymentMode(mode)}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm capitalize">{mode.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? lang === "hi" ? "सेव हो रहा है…" : "Saving..."
                : lang === "hi" ? "सेव करें" : "Save"}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
