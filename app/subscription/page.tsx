"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import AppShell from "@/components/layout/AppShell";

type SubStatus = {
  plan_name: string;
  days_remaining: number;
  end_date: string;
  is_active: boolean;
  price_inr: number;
};

const PLAN_TOTALS: Record<string, number> = {
  free_trial: 14,
  monthly: 30,
  yearly: 365,
};

const PLAN_LABELS: Record<string, string> = {
  free_trial: "TRIAL PERIOD",
  monthly: "MONTHLY PLAN",
  yearly: "YEARLY PLAN",
};

const leftFeatures = [
  "Unlimited customer records",
  "Full milk entry tracking",
  "Bill PDF generation",
  "Supplier management",
];

const rightFeatures = [
  "Sales & transaction reports",
  "Advance & payment ledger",
  "Retail sales tracking",
  "Priority support",
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionPage() {
  const rawMonthly = process.env.NEXT_PUBLIC_PRICE_MONTHLY;
  const rawYearly = process.env.NEXT_PUBLIC_PRICE_YEARLY;
  const priceMonthly = Number(rawMonthly ? rawMonthly.trim() : "459") || 459;
  const priceYearly = Number(rawYearly ? rawYearly.trim() : "3999") || 3999;
  const router = useRouter();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"razorpay" | "manual">("razorpay");
  const [txnRef, setTxnRef] = useState("");
  const [upiId, setUpiId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return router.push("/login");
      setUserEmail(user.email || "");
      const { data } = await supabaseClient
        .rpc("get_subscription_status", { p_user_id: user.id });
      if (data?.[0]) setSub(data[0]);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleManualPurchase() {
    if (!txnRef.trim()) {
      setToast({ msg: "Please enter Transaction Reference / UTR No.", type: "error" });
      return;
    }
    setPurchasing(true);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { data, error } = await supabaseClient.rpc("purchase_plan", {
      p_user_id: user.id,
      p_plan_name: selectedPlan,
      p_payment_ref: txnRef,
      p_payment_mode: "upi",
    });
    if (error) {
      setToast({ msg: error.message, type: "error" });
    } else {
      setToast({ msg: "Plan activated! Redirecting...", type: "success" });
      setShowModal(false);
      setTimeout(() => {
        router.refresh();
        router.push("/dashboard");
      }, 2000);
    }
    setPurchasing(false);
  }

  async function handleRazorpayPayment() {
    setPurchasing(true);
    try {
      // 1. Create subscription via backend API to get a subscription_id
      const res = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate subscription payment.");
      }

      const subscriptionId = data.subscriptionId;

      // 2. Load Razorpay checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setToast({ msg: "Failed to load Razorpay payment SDK.", type: "error" });
        setPurchasing(false);
        return;
      }

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        setPurchasing(false);
        return;
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_6X9N9Y3W2bH5Z7";

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: "DairyPro",
        description: `${selectedPlan === "monthly" ? "Monthly" : "Yearly"} Subscription Plan`,
        handler: async function (response: any) {
          // Payment/Subscription successful
          const paymentId = response.razorpay_payment_id;
          const { data: rpcData, error: rpcError } = await supabaseClient.rpc("purchase_plan", {
            p_user_id: user.id,
            p_plan_name: selectedPlan,
            p_payment_ref: paymentId,
            p_payment_mode: "razorpay",
          });

          if (rpcError) {
            setToast({ msg: `Activation error: ${rpcError.message}`, type: "error" });
          } else {
            setToast({ msg: "Subscription activated via Razorpay! Redirecting...", type: "success" });
            setShowModal(false);
            setTimeout(() => {
              router.refresh();
              router.push("/dashboard");
            }, 2000);
          }
          setPurchasing(false);
        },
        prefill: {
          email: userEmail,
        },
        theme: {
          color: "#14b8a6", // Teal theme to match TradersPro UI!
        },
        modal: {
          ondismiss: function () {
            setPurchasing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setToast({ msg: e.message || "Failed to open Razorpay checkout", type: "error" });
      setPurchasing(false);
    }
  }

  // Clear toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const totalDays = sub ? (PLAN_TOTALS[sub.plan_name] ?? 30) : 14;
  const usedDays = sub ? Math.max(0, totalDays - sub.days_remaining) : 0;
  const progressPct = Math.max(0, Math.min(100, Math.round((usedDays / totalDays) * 100)));

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto py-4">
        {loading ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-teal-500" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-6 max-w-5xl mx-auto">
              Subscription
            </h1>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              
              {/* LEFT — Account Status */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-md p-8 flex flex-col justify-between md:col-span-1 min-h-[300px]">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">
                    Account Status
                  </p>
                  <h2 className="text-3xl font-extrabold text-gray-800 mb-6 tracking-tight">
                    {sub ? PLAN_LABELS[sub.plan_name] || sub.plan_name.toUpperCase().replace("_", " ") : "NO PLAN"}
                  </h2>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3.5 mb-4 overflow-hidden border border-slate-200/20">
                    <div
                      className="bg-teal-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500 text-lg">🛡️</span>
                    {sub && sub.is_active && sub.days_remaining > 0 ? (
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        EXPIRES IN{" "}
                        <span className="text-gray-900 font-extrabold text-base">
                          {sub.days_remaining} BUSINESS DAYS
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-red-500 uppercase tracking-wide">
                        PLAN EXPIRED
                      </p>
                    )}
                  </div>
                  {sub && sub.end_date && (
                    <p className="text-xs text-gray-400 font-medium ml-7">
                      Expiry Date: {new Date(sub.end_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* RIGHT — Plan Card */}
              <div className="bg-slate-900 rounded-2xl p-8 text-white relative md:col-span-2 shadow-xl border border-slate-800/80 flex flex-col justify-between">
                <span className="absolute top-6 right-6 bg-teal-500 text-white text-[10px] font-extrabold px-3.5 py-1 rounded-full tracking-widest uppercase shadow-md">
                  BEST VALUE
                </span>

                <div>
                  <p className="text-xs uppercase tracking-widest text-teal-400 mb-1 font-bold">
                    Dairy Pro Plan
                  </p>
                  <h2 className="text-2xl font-extrabold mb-6 leading-tight tracking-tight">
                    COMPLETE DAIRY MANAGEMENT SUITE
                  </h2>

                  {/* Plan Toggle */}
                  <div className="flex gap-2 mb-6">
                    {(["monthly", "yearly"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPlan(p)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
                          selectedPlan === p
                            ? "bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/20"
                            : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        {p === "monthly" ? "Monthly" : "Yearly"}
                      </button>
                    ))}
                  </div>

                  {/* Price Display */}
                  <div className="bg-slate-800/80 border border-slate-700/40 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-5xl font-extrabold text-teal-400 tracking-tight">
                        {selectedPlan === "monthly" ? `₹${priceMonthly}` : `₹${priceYearly.toLocaleString("en-IN")}`}
                      </span>
                      <span className="text-slate-400 text-sm ml-2 font-medium">
                        / {selectedPlan === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                    <span className="bg-slate-700 text-teal-300 text-xs font-bold px-3 py-1.5 rounded-lg tracking-wider uppercase">
                      FULL ACCESS
                    </span>
                  </div>

                  {selectedPlan === "yearly" && (
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 mb-6 flex items-center gap-2">
                      <span className="text-base text-teal-400">🔄</span>
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                        RENEWAL PRICE LOCK: RENEW AT ₹{priceYearly.toLocaleString("en-IN")}/YEAR (PRICE LOCKED)
                      </p>
                    </div>
                  )}

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 mb-8 text-sm">
                    <div className="space-y-3.5">
                      {leftFeatures.map((f) => (
                        <div key={f} className="flex items-start gap-2.5 text-slate-300 font-medium">
                          <span className="text-teal-400 mt-0.5 text-xs">✅</span>
                          <span className="text-xs leading-normal">{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3.5">
                      {rightFeatures.map((f) => (
                        <div key={f} className="flex items-start gap-2.5 text-slate-300 font-medium">
                          <span className="text-teal-400 mt-0.5 text-xs">✅</span>
                          <span className="text-xs leading-normal">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    setShowModal(true);
                    setActiveTab("razorpay");
                  }}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-white font-black py-4 rounded-2xl tracking-widest transition-all duration-300 active:scale-[0.99] text-sm uppercase shadow-lg shadow-teal-500/10 hover:shadow-teal-400/20"
                >
                  ACTIVATE PLAN — {selectedPlan === "monthly" ? `₹${priceMonthly}/MONTH` : `₹${priceYearly}/YEAR`}
                </button>
              </div>

            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md border border-slate-100 shadow-2xl animate-fadeUp flex flex-col">
            <h3 className="text-2xl font-bold mb-1 text-slate-800 tracking-tight">
              Activate Subscription
            </h3>
            <p className="text-slate-500 text-sm mb-6 font-medium">
              {selectedPlan === "monthly"
                ? `Monthly Plan — ₹${priceMonthly}`
                : `Yearly Plan — ₹${priceYearly.toLocaleString("en-IN")}`}
            </p>

            {/* Payment Method Selector Tabs */}
            <div className="flex border-b border-slate-100 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("razorpay")}
                className={`flex-1 pb-3 text-sm font-extrabold transition-all border-b-2 uppercase tracking-wider ${
                  activeTab === "razorpay"
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Razorpay (Online)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`flex-1 pb-3 text-sm font-extrabold transition-all border-b-2 uppercase tracking-wider ${
                  activeTab === "manual"
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Manual UPI
              </button>
            </div>

            {activeTab === "razorpay" ? (
              <div className="space-y-6 text-center py-4">
                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 text-left">
                  <p className="text-xs text-teal-800 leading-relaxed font-medium">
                    ⚡ Pay securely using your Credit/Debit Card, UPI, Netbanking, or Wallet via Razorpay. The plan will activate instantly upon successful payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRazorpayPayment}
                  disabled={purchasing}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-white font-black py-4 rounded-2xl tracking-widest transition-all duration-300 uppercase text-sm shadow-md"
                >
                  {purchasing ? "Processing Payment..." : `Pay ₹${selectedPlan === "monthly" ? priceMonthly : priceYearly.toLocaleString("en-IN")} via Razorpay`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Your UPI ID (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. mobile@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-400 transition-all font-medium bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Transaction Reference / UTR No. <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter 12-digit UTR/TXN number"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-400 transition-all font-medium bg-slate-50/50"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-slate-200 text-slate-600 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all text-sm uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleManualPurchase}
                    disabled={purchasing}
                    className="flex-1 bg-teal-500 text-white py-3.5 rounded-2xl font-bold hover:bg-teal-400 transition-all text-sm uppercase tracking-wider disabled:opacity-50"
                  >
                    {purchasing ? "Confirming..." : "Confirm Payment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-xl font-bold text-white text-sm z-50 animate-slideIn ${
            toast.type === "success" ? "bg-teal-500" : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </AppShell>
  );
}
