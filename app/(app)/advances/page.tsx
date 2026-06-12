"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { toLocalDateString } from "@/lib/dateUtils";

interface CustomerBalance {
  customer_id: string;
  name: string;
  balance: number;
  phone?: string | null;
  dairy_name?: string;
}

export default function AdvancesPage() {
  const { t, lang } = useI18n();
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBalance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "online" | "upi">("cash");
  const [type, setType] = useState<"advance" | "payment" | "due">("advance");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBalances = useCallback(async () => {
    setIsLoading(true);
    // Use existing get_top_customers RPC function with a very wide date range to get all-time balances
    const { data, error } = await supabaseClient.rpc("get_top_customers", {
      p_start: "2000-01-01",
      p_end: "2100-01-01",
    });

    const { data: phoneData } = await supabaseClient.from("daily_customers" as any).select("id, phone") as { data: { id: string; phone: string | null }[] | null };
    const { data: profile } = await supabaseClient.from("daily_profile").select("dairy_name").maybeSingle() as { data: any | null };

    if (data) {
      const merged = (data as CustomerBalance[]).map(c => {
        const p = phoneData?.find(pd => pd.id === c.customer_id);
        return { ...c, phone: p?.phone, dairy_name: profile?.dairy_name || "Dairy" };
      });
      setCustomers(merged);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const openModal = (customer: CustomerBalance) => {
    setSelectedCustomer(customer);
    setType(customer.balance > 0 ? "payment" : "advance"); // Default based on balance
    setAmount(Math.abs(customer.balance).toString() || "");
    setIsModalOpen(true);
  };

  const handleRemindWhatsApp = (customer: CustomerBalance) => {
    if (!customer.phone) {
      alert(lang === "hi" ? "इस ग्राहक का फ़ोन नंबर मौजूद नहीं है।" : "Phone number missing for this customer.");
      return;
    }
    const text = `Dear ${customer.name},\n\nGreetings from *${(customer as any).dairy_name}*!\n\nWe hope you're enjoying our dairy products! This is a friendly reminder regarding your pending payment of ₹${customer.balance.toFixed(2)}.\n\nPlease clear the dues at your earliest convenience. Thank you!`;
    
    let phoneStr = customer.phone.replace(/\D/g, "");
    if (phoneStr && phoneStr.length === 10) {
      phoneStr = "91" + phoneStr;
    }

    const wa = phoneStr 
      ? `https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
      
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;
    setIsSubmitting(true);

    const today = toLocalDateString();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      alert("No authenticated user session found.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabaseClient.from("daily_transactions" as any).insert({
      customer_id: selectedCustomer.customer_id,
      type: type,
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
      <h1 className="text-3xl font-bold text-foreground">Advances & Dues Management</h1>

      <Card title="Customer Balances">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted-foreground">Loading...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted-foreground">No customers found.</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium uppercase">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground mt-0.5">Phone: {c.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.balance < 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Advance Paid
                        </span>
                      ) : c.balance > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending to Receive
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          Settled
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${c.balance > 0 ? "text-amber-700" : c.balance < 0 ? "text-emerald-700" : ""}`}>
                      ₹{Math.abs(c.balance).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {c.balance > 0 && (
                          <Button size="sm" variant="outline" className="text-primary hover:bg-primary/10 border-primary/20" onClick={() => handleRemindWhatsApp(c)}>
                            Remind
                          </Button>
                        )}
                        <Button size="sm" onClick={() => openModal(c)}>
                          Add Entry
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
      {selectedCustomer && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Add Entry for ${selectedCustomer.name}`}
        >
          <form onSubmit={handleTransaction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Transaction Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="advance"
                    checked={type === "advance"}
                    onChange={() => setType("advance")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>Advance (Money taken beforehand)</span>
                </label>
              </div>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="payment"
                    checked={type === "payment"}
                    onChange={() => setType("payment")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>Payment (Clearing due balance)</span>
                </label>
              </div>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="due"
                    checked={type === "due"}
                    onChange={() => setType("due")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>Remaining Due (Customer owes money)</span>
                </label>
              </div>
            </div>

            <Input
              id="amount"
              label="Amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            {type !== "due" && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Payment Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="cash"
                      checked={paymentMode === "cash"}
                      onChange={() => setPaymentMode("cash")}
                      className="w-4 h-4 text-primary"
                    />
                    <span>Cash</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="online"
                      checked={paymentMode === "online"}
                      onChange={() => setPaymentMode("online")}
                      className="w-4 h-4 text-primary"
                    />
                    <span>Online</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="upi"
                      checked={paymentMode === "upi"}
                      onChange={() => setPaymentMode("upi")}
                      className="w-4 h-4 text-primary"
                    />
                    <span>UPI</span>
                  </label>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Entry"}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
