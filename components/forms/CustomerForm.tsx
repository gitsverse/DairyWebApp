import React, { useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/i18n/LanguageProvider";

export type CustomerSaveResult = { id: string };

interface CustomerFormProps {
  customer: any | null; // Pass null for new customer
  onSuccess: (result?: CustomerSaveResult) => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSuccess }) => {
  const { t, lang } = useI18n();
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (normalizedPhone && normalizedPhone.length !== 10) {
      setError(lang === "hi" ? "फोन नंबर ठीक 10 अंकों का होना चाहिए।" : "Phone number must be exactly 10 digits.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (normalizedPhone) {
        let existsQuery = supabaseClient
          .from("daily_customers" as any)
          .select("id, name, phone")
          .eq("phone", normalizedPhone)
          .limit(1);
        if (customer?.id) {
          existsQuery = existsQuery.neq("id", customer.id);
        }
        const { data: existing } = await existsQuery.maybeSingle() as { data: any | null };
        if (existing) {
          setError(`Phone already exists for customer "${existing.name}".`);
          return;
        }
      }

      const customerData = {
        name: name.trim(),
        phone: normalizedPhone || null,
        address,
      };

      if (customer?.id) {
        const { error: submissionError } = await supabaseClient
          .from("daily_customers" as any)
          .update(customerData as any)
          .eq("id", customer.id);
        if (submissionError) {
          console.error("Error saving customer:", submissionError);
          setError(submissionError.message || "Failed to save customer. Please try again.");
        } else {
          onSuccess({ id: customer.id });
        }
      } else {
        const { data: created, error: submissionError } = await supabaseClient
          .from("daily_customers" as any)
          .insert([customerData] as any)
          .select("id")
          .single() as { data: any | null; error: any };
        if (submissionError) {
          console.error("Error saving customer:", submissionError);
          setError(submissionError.message || "Failed to save customer. Please try again.");
        } else {
          setName("");
          setPhone("");
          setAddress("");
          onSuccess(created?.id ? { id: created.id } : undefined);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={t("form.fullName")}
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSubmitting}
        />
        <Input
          label={t("form.phone")}
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
            setPhone(digits);
          }}
          inputMode="numeric"
          pattern="[0-9]{10}"
          placeholder={lang === "hi" ? "10 अंकों का नंबर" : "10-digit number"}
          disabled={isSubmitting}
        />
      </div>
      <Input
        label={t("form.address")}
        id="address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : (lang === "hi" ? "ग्राहक सेव करें" : "Save Customer")}
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </form>
  );
};

export default CustomerForm;
