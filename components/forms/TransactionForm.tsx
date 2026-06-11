import React, { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import DateInput from "@/components/ui/DateInput";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { toLocalDateString } from "@/lib/dateUtils";

interface TransactionFormProps {
  customerId: string;
  onSuccess: () => void;
  defaultType?: "payment" | "advance" | "adjustment" | "due";
  lockType?: boolean;
  transaction?: Record<string, unknown> | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  customerId,
  onSuccess,
  defaultType,
  lockType,
  transaction = null,
}) => {
  const { t, lang } = useI18n();
  const [type, setType] = useState<"payment" | "advance" | "adjustment" | "due">(
    defaultType ?? "payment"
  );
  const [amount, setAmount] = useState("");
  type PaymentMode = "cash" | "online" | "upi";
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [date, setDate] = useState(toLocalDateString());
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (transaction) {
      setType((transaction.type as any) ?? "payment");
      setAmount(transaction.amount != null ? String(transaction.amount) : "");
      setPaymentMode((transaction.payment_mode as any) ?? "cash");
      setDate(typeof transaction.date === "string" ? transaction.date : toLocalDateString());
      setNote(typeof transaction.note === "string" ? transaction.note : "");
    } else if (defaultType) {
      setType(defaultType);
    }
  }, [transaction, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt)) {
      setError("Please enter a valid amount.");
      return;
    }
    if (amt < 0) {
      setError(lang === "hi" ? "राशि ऋणात्मक नहीं हो सकती।" : "Amount cannot be negative.");
      return;
    }
    if (amt <= 0) {
      setError("Please enter an amount greater than zero.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      let submissionError;
      if (transaction) {
        const { error } = await supabaseClient
          .from("daily_transactions" as any)
          .update({
            type,
            amount: Number(amount),
            payment_mode: type === "due" ? null : paymentMode,
            date,
            note: note.trim() ? note.trim() : null,
          })
          .eq("id", transaction.id);
        submissionError = error;
      } else {
        const { error } = await supabaseClient
          .from("daily_transactions" as any)
          .insert([
            {
              customer_id: customerId,
              type,
              amount: Number(amount),
              payment_mode: paymentMode,
              date,
              note: note.trim() ? note.trim() : null,
            },
          ]);
        submissionError = error;
      }

      if (submissionError) {
        setError(`Failed to save transaction: ${submissionError.message}`);
      } else {
        setAmount("");
        setNote("");
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={t("form.amount")}
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Select
          label={t("tx.type")}
          value={type}
          onChange={(v) => setType(v as "payment" | "advance" | "adjustment" | "due")}
          options={[
            { value: "payment", label: t("tx.payment") },
            { value: "advance", label: t("tx.advance") },
            { value: "adjustment", label: t("tx.adjustment") },
            { value: "due", label: t("tx.due") },
          ]}
          disabled={!!lockType}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {type !== "due" ? (
          <Select
            label={t("tx.paymentMode")}
            value={paymentMode}
            onChange={(v) =>
              setPaymentMode(v === "online" ? "online" : v === "upi" ? "upi" : "cash")
            }
            options={[
              { value: "cash", label: t("tx.cash") },
              { value: "online", label: t("tx.online") },
              { value: "upi", label: t("tx.upi") },
            ]}
          />
        ) : (
          <div className="hidden md:block" />
        )}
        <DateInput
          label={t("form.date")}
          id="date"
          value={date}
          onChange={(val) => setDate(val)}
          required
        />
      </div>
      <Input
        label={t("form.noteOptional")}
        id="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : lang === "hi" ? "लेनदेन सेव करें" : "Save Transaction"}
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </form>
  );
};

export default TransactionForm;
