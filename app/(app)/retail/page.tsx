"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DateInput from "@/components/ui/DateInput";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { toLocalDateString } from "@/lib/dateUtils";

interface Product {
  id: number;
  name: string;
  default_rate: number;
}

interface RetailSale {
  id: string;
  date: string;
  product_id: number;
  quantity: number;
  total_amount: number;
  payment_mode: string;
  created_at: string;
}

export default function RetailPage() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "online">("cash");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [date, setDate] = useState<string>(toLocalDateString());
  const [todayCash, setTodayCash] = useState(0);
  const [todayOnline, setTodayOnline] = useState(0);
  const [salesList, setSalesList] = useState<RetailSale[]>([]);

  const [loadDataError, setLoadDataError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadDataError(null);
    // Load products
    const { data: prods } = await supabaseClient.from("daily_products" as any).select("*") as { data: any[] | null };
    if (prods) setProducts(prods);

    // Load today's retail sales summary and detailed list
    const { data: sales, error } = await supabaseClient
      .from("daily_retail_sales" as any)
      .select("id, date, product_id, quantity, total_amount, payment_mode, created_at")
      .eq("date", date)
      .order("created_at", { ascending: false }) as { data: RetailSale[] | null, error: any };

    if (error) {
      console.error("Error fetching daily_retail_sales:", error);
      setLoadDataError(error.message || JSON.stringify(error));
    }

    let cash = 0;
    let online = 0;
    if (sales) {
      setSalesList(sales);
      for (const sale of sales) {
        if (sale.payment_mode === "cash") cash += Number(sale.total_amount);
        if (sale.payment_mode === "online" || sale.payment_mode === "upi") online += Number(sale.total_amount);
      }
    } else {
      setSalesList([]);
    }
    setTodayCash(cash);
    setTodayOnline(online);
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-fill rate when product changes
  useEffect(() => {
    if (selectedProductId) {
      const p = products.find((x) => x.id.toString() === selectedProductId);
      if (p) setRate(p.default_rate.toString());
    } else {
      setRate("");
    }
  }, [selectedProductId, products]);

  const totalAmount = (Number(quantity) || 0) * (Number(rate) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || !rate) return;
    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabaseClient.from("daily_retail_sales" as any).insert({
      date: date,
      product_id: parseInt(selectedProductId),
      quantity: Number(quantity),
      total_amount: totalAmount,
      payment_mode: paymentMode,
    } as any);

    if (error) {
      if (error.code === '42P01') {
        setMessage({ type: "error", text: "Table retail_sales does not exist. Please run the SQL migration." });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } else {
      setMessage({ type: "success", text: "Retail sale saved!" });
      setQuantity("");
      loadData(); // Refresh summary
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "hi" ? "क्या आप इस एंट्री को हटाना चाहते हैं?" : "Are you sure you want to delete this entry?")) return;
    const { error } = await supabaseClient.from("daily_retail_sales" as any).delete().eq("id", id);
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: lang === "hi" ? "एंट्री सफलतापूर्वक हटा दी गई।" : "Entry deleted successfully." });
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Retail Sales</h1>
      {loadDataError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          Error loading data: {loadDataError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={lang === "hi" ? "नई रिटेल एंट्री" : "New Retail Entry"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DateInput
              id="retail-date"
              label={lang === "hi" ? "तारीख" : "Date"}
              value={date}
              onChange={setDate}
              required
            />
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {lang === "hi" ? "उत्पाद" : "Product"}
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="quantity"
                label="Quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <Input
                id="rate"
                label="Rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>

            <div className="bg-secondary/40 p-3 rounded-md flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-xl font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Payment Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="cash"
                    checked={paymentMode === "cash"}
                    onChange={() => setPaymentMode("cash")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>Cash</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="online"
                    checked={paymentMode === "online"}
                    onChange={() => setPaymentMode("online")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>Online / UPI</span>
                </label>
              </div>
            </div>

            {message && (
              <p className={`text-sm rounded-md px-3 py-2 ${message.type === "error" ? "text-destructive bg-destructive/10" : "text-emerald-700 bg-emerald-50"}`}>
                {message.text}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (lang === "hi" ? "सेव हो रहा है..." : "Saving...") : (lang === "hi" ? "रिटेल बिक्री सेव करें" : "Save Retail Sale")}
            </Button>
          </form>
        </Card>

        <Card title={lang === "hi" ? "दैनिक सारांश" : "Daily Summary"}>
          <div className="space-y-6 mt-4">
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-emerald-800 text-sm font-medium">Cash Collected</p>
                <p className="text-3xl font-bold text-emerald-900">₹{todayCash.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-2xl">
                💵
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-blue-800 text-sm font-medium">Online Collected</p>
                <p className="text-3xl font-bold text-blue-900">₹{todayOnline.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl">
                📱
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-between items-center">
              <span className="font-semibold text-lg">Total Retail Sales</span>
              <span className="font-bold text-2xl">₹{(todayCash + todayOnline).toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title={lang === "hi" ? "आज का खुदरा बिक्री इतिहास" : "Today's Retail Sales History"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {lang === "hi" ? "कोई एंट्री नहीं मिली।" : "No entries found."}
                  </td>
                </tr>
              ) : (
                salesList.map((sale) => {
                  const rateVal = sale.quantity > 0 ? (sale.total_amount / sale.quantity) : 0;
                  const timeStr = sale.created_at
                    ? new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—";

                  return (
                    <tr key={sale.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-2 font-medium">{timeStr}</td>
                      <td className="px-4 py-2 font-semibold capitalize">
                        {products.find(p => p.id === sale.product_id)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right">{sale.quantity}</td>
                      <td className="px-4 py-2 text-right">₹{rateVal.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-bold text-primary">₹{Number(sale.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-2 capitalize font-semibold">{sale.payment_mode === "online" ? "Online / UPI" : sale.payment_mode}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="text-destructive hover:text-destructive/80 p-1 hover:bg-destructive/10 rounded-lg transition-colors inline-flex items-center"
                          title="Delete entry"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
