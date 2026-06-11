"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DateInput from "@/components/ui/DateInput";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { formatDate, toLocalDateString as isoDate, startOfLocalMonthISO as startOfMonthISO } from "@/lib/dateUtils";
import { PencilIcon } from "@heroicons/react/24/outline";
import { parseISO, differenceInDays, addDays, isValid } from "date-fns";

const FETCH_MS = 18_000;

interface DailyEntry {
  id: string;
  date: string;
  shift: string;
  quantity: number;
  total_amount: number;
  price_per_unit?: number;
  product_id?: number;
  supplier_id?: string;
  daily_suppliers: { name: string; phone?: string | null } | null;
  daily_products: { name: string; unit: string } | null;
}

const SupplierEntriesPage = () => {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; custom_milk_rate?: number | null }[]>([]);
  const [products, setProducts] = useState<
    { id: number; name: string; default_rate: number; unit: string }[]
  >([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  // Quick Inline Add form state
  const [inlineSupplierId, setInlineSupplierId] = useState("");
  const [inlineProductId, setInlineProductId] = useState("");
  const [inlineDate, setInlineDate] = useState(isoDate(new Date()));
  const [inlineShift, setInlineShift] = useState("morning");
  const [inlineQuantity, setInlineQuantity] = useState("");
  const [inlineRate, setInlineRate] = useState("");
  const [isAddingInline, setIsAddingInline] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Record<string, unknown> | null>(null);

  // Bulk Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSupplierId, setBulkSupplierId] = useState("");
  const [bulkProductId, setBulkProductId] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState(startOfMonthISO());
  const [bulkEndDate, setBulkEndDate] = useState(isoDate(new Date()));
  const [bulkShift, setBulkShift] = useState("morning");
  const [bulkQuantity, setBulkQuantity] = useState("");
  const [bulkRate, setBulkRate] = useState("");
  const [bulkSkipSundays, setBulkSkipSundays] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Filters state
  const [dateFrom, setDateFrom] = useState<string>(startOfMonthISO());
  const [dateTo, setDateTo] = useState<string>(isoDate(new Date()));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const q = search.trim();
    const handle = setTimeout(() => setDebouncedSearch(q), 350);
    return () => clearTimeout(handle);
  }, [search]);

  // Query and auto-fill last used milk rate for the selected supplier
  const fetchLastUsedRate = useCallback(async (cid: string, pid: string) => {
    if (!cid || !pid) return;
    try {
      const { data, error } = await supabaseClient
        .from("daily_supplier_entries" as any)
        .select("price_per_unit")
        .eq("supplier_id", cid)
        .eq("product_id", Number(pid))
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: any | null; error: any };

      if (error) {
        console.error("Error fetching last supplier rate:", error);
      }

      if (data?.price_per_unit != null) {
        setInlineRate(String(data.price_per_unit));
      } else {
        const cust = suppliers.find((c) => c.id === cid);
        const selectedProd = products.find((p) => String(p.id) === pid);
        if (selectedProd?.name === "milk" && cust?.custom_milk_rate != null) {
          setInlineRate(String(cust.custom_milk_rate));
        } else {
          setInlineRate(String(selectedProd?.default_rate ?? 60));
        }
      }
    } catch (e) {
      console.error(e);
      setInlineRate("60");
    }
  }, [suppliers, products]);

  useEffect(() => {
    if (inlineSupplierId && inlineProductId) {
      fetchLastUsedRate(inlineSupplierId, inlineProductId);
    } else {
      setInlineRate("");
    }
  }, [inlineSupplierId, inlineProductId, fetchLastUsedRate]);

  // Bulk rate auto-fill
  useEffect(() => {
    if (bulkSupplierId && bulkProductId) {
      const cust = suppliers.find((c) => c.id === bulkSupplierId);
      const selectedProd = products.find((p) => String(p.id) === bulkProductId);
      if (selectedProd?.name === "milk" && cust?.custom_milk_rate != null) {
        setBulkRate(String(cust.custom_milk_rate));
      } else {
        setBulkRate(String(selectedProd?.default_rate ?? 60));
      }
    } else {
      setBulkRate("");
    }
  }, [bulkSupplierId, bulkProductId, suppliers, products]);

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoadingEntries(true);
      const { data, error, count } = await withTimeout(
        (() => {
          let q = supabaseClient
            .from("daily_supplier_entries" as any)
            .select(
              debouncedSearch
                ? "id, date, shift, quantity, total_amount, price_per_unit, product_id, supplier_id, daily_suppliers!inner(name, phone), daily_products(name, unit)"
                : "id, date, shift, quantity, total_amount, price_per_unit, product_id, supplier_id, daily_suppliers(name, phone), daily_products(name, unit)",
              { count: "exact" }
            )
            .order("date", { ascending: false })
            .order("id", { ascending: false });

          if (dateFrom) q = q.gte("date", dateFrom);
          if (dateTo) q = q.lte("date", dateTo);

          if (debouncedSearch) {
            q = q.ilike("daily_suppliers.name", `%${debouncedSearch}%`);
          }

          return q;
        })(),
        FETCH_MS
      );

      if (error) {
        console.error("[SupplierEntriesPage] error fetching entries", error);
        return error;
      }
      setEntries((data as unknown as DailyEntry[]) || []);
      setFilteredCount(typeof count === "number" ? count : (data as any[])?.length ?? 0);
      return null;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to load entries");
      return err;
    } finally {
      setIsLoadingEntries(false);
    }
  }, [dateFrom, dateTo, debouncedSearch]);

  const loadInitialData = useCallback(async () => {
    setLoadError(null);
    try {
      const { count: total, error: totalErr } = await withTimeout(
        supabaseClient.from("daily_supplier_entries" as any).select("id", { count: "exact", head: true }),
        FETCH_MS
      );
      if (totalErr) {
        console.error("[SupplierEntriesPage] error fetching total entries count", totalErr);
        setTotalCount(null);
      } else {
        setTotalCount(typeof total === "number" ? total : null);
      }

      const { data: suppliersData, error: cErr } = await withTimeout(
        supabaseClient.from("daily_suppliers" as any).select("id, name, custom_milk_rate"),
        FETCH_MS
      );
      const { data: productsData, error: pErr } = await withTimeout(
        supabaseClient.from("daily_products" as any).select("id, name, default_rate, unit"),
        FETCH_MS
      ) as { data: any[] | null; error: any };

      if (cErr || pErr) {
        setLoadError(cErr?.message ?? pErr?.message ?? "Could not load form data");
        setSuppliers([]);
        setProducts([]);
        return;
      }

      setSuppliers((suppliersData as any) || []);
      const loadedProducts = (productsData as any[]) || [];
      setProducts(loadedProducts);
      if (loadedProducts.length > 0) {
        const milkProduct = loadedProducts.find((p) => p.name === "milk");
        const defaultProdId = String(milkProduct?.id ?? loadedProducts[0].id);
        setInlineProductId(defaultProdId);
        setBulkProductId(defaultProdId);
      }
      const entryErr = await fetchEntries();
      if (entryErr) {
        setLoadError(entryErr.message);
      }
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : "Failed to load page");
      setSuppliers([]);
      setProducts([]);
    }
  }, [fetchEntries]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Inline Quick Add Handler
  const handleInlineAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineSupplierId || !inlineProductId || !inlineDate || !inlineQuantity || !inlineRate) {
      showToast("Please fill in all quick entry fields.", "error");
      return;
    }

    const qtyNum = Number(inlineQuantity);
    const rateNum = Number(inlineRate);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast("Quantity must be greater than zero.", "error");
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      showToast("Rate must be greater than zero.", "error");
      return;
    }

    setIsAddingInline(true);
    try {
      const payload = {
        supplier_id: inlineSupplierId,
        product_id: Number(inlineProductId),
        date: inlineDate,
        shift: inlineShift,
        quantity: qtyNum,
        price_per_unit: rateNum,
      };

      const res = await fetch("/api/supplier-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || "Failed to add entry.", "error");
        return;
      }

      showToast(lang === "hi" ? "एंट्री सफलतापूर्वक जोड़ी गई।" : "Entry added successfully.", "success");
      setInlineQuantity(""); // ONLY clear the Quantity field as requested
      fetchEntries();
      
      // Update total counts
      setTotalCount((prev) => (prev != null ? prev + 1 : null));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error.", "error");
    } finally {
      setIsAddingInline(false);
    }
  };

  // Bulk Entry Form Handler
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSupplierId || !bulkProductId || !bulkStartDate || !bulkEndDate || !bulkQuantity || !bulkRate) {
      showToast("Please fill in all bulk entry fields.", "error");
      return;
    }

    const qtyNum = Number(bulkQuantity);
    const rateNum = Number(bulkRate);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast("Quantity must be greater than zero.", "error");
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      showToast("Rate must be greater than zero.", "error");
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const res = await fetch("/api/supplier-entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: bulkSupplierId,
          product_id: Number(bulkProductId),
          start_date: bulkStartDate,
          end_date: bulkEndDate,
          shift: bulkShift,
          quantity: qtyNum,
          price_per_unit: rateNum,
          skip_sundays: bulkSkipSundays,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || "Failed to execute bulk entries.", "error");
        return;
      }

      showToast(
        lang === "hi"
          ? `${json.added} एंट्रियां जोड़ी गईं, ${json.skipped} छोड़ी गईं (पहले से मौजूद थीं)`
          : `${json.added} entries added, ${json.skipped} skipped (already existed).`,
        "success"
      );
      setIsBulkModalOpen(false);
      fetchEntries();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error.", "error");
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Live bulk entries preview label
  const getBulkPreviewText = () => {
    if (!bulkStartDate || !bulkEndDate) return "";
    const start = parseISO(bulkStartDate);
    const end = parseISO(bulkEndDate);

    if (!isValid(start) || !isValid(end) || start > end) {
      return lang === "hi" ? "अमान्य तिथि श्रेणी" : "Invalid date range";
    }

    const totalDays = differenceInDays(end, start) + 1;
    let daysToCreate = totalDays;

    if (bulkSkipSundays) {
      let sundays = 0;
      for (let i = 0; i < totalDays; i++) {
        const curr = addDays(start, i);
        if (curr.getDay() === 0) sundays++;
      }
      daysToCreate -= sundays;
    }

    if (bulkShift === "both") {
      daysToCreate *= 2;
    }

    return lang === "hi"
      ? `इससे ${formatDate(bulkStartDate)} से ${formatDate(bulkEndDate)} तक ${daysToCreate} एंट्रियां बनाई जाएंगी`
      : `This will create ${daysToCreate} entries from ${formatDate(bulkStartDate)} to ${formatDate(bulkEndDate)}`;
  };

  const handleEditClick = (entry: DailyEntry) => {
    // Map internal fields to match standard EntryForm props structure
    setEditingEntry({
      id: entry.id,
      supplier_id: entry.supplier_id,
      product_id: entry.product_id,
      date: entry.date,
      shift: entry.shift,
      quantity: entry.quantity,
      price_per_unit: entry.price_per_unit,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingEntry(null);
    showToast(lang === "hi" ? "एंट्री संपादित हो गई।" : "Entry updated successfully.", "success");
    fetchEntries();
  };

  return (
    <div className="space-y-6">
      {/* Edit Entry Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntry(null);
        }}
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
              if (error) { showToast(error.message, "error"); return; }
              showToast(lang === "hi" ? "एंट्री संपादित हो गई।" : "Entry updated.", "success");
              setIsEditModalOpen(false);
              setEditingEntry(null);
              fetchEntries();
            }}
          >
            <Input id="edit-qty" label={lang === "hi" ? "मात्रा" : "Quantity"} type="number" step="0.1"
              defaultValue={String(editingEntry.quantity ?? "")} required />
            <Input id="edit-rate" label={lang === "hi" ? "दर (₹)" : "Rate (₹)"} type="number" step="0.01"
              defaultValue={String(editingEntry.price_per_unit ?? "")} required />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingEntry(null); }}>{lang === "hi" ? "रद्द करें" : "Cancel"}</Button>
              <Button type="submit">{lang === "hi" ? "सेव करें" : "Save"}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Entry Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={lang === "hi" ? "थोक / महीना सीमा एंट्री" : "Bulk / Monthly Range Entry"}
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <Select
            label={lang === "hi" ? "आपूर्तिकर्ता" : "Supplier"}
            value={bulkSupplierId}
            onChange={setBulkSupplierId}
            options={suppliers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={lang === "hi" ? "ग्राहक चुनें" : "Select supplier"}
            required
            searchable
          />
          <Select
            label={lang === "hi" ? "उत्पाद" : "Product"}
            value={bulkProductId}
            onChange={setBulkProductId}
            options={products.map((p) => ({
              value: String(p.id),
              label: p.name === "milk" ? (lang === "hi" ? "दूध (Milk)" : "Milk") : p.name === "ghee" ? (lang === "hi" ? "घी (Ghee)" : "Ghee") : p.name.charAt(0).toUpperCase() + p.name.slice(1)
            }))}
            placeholder={lang === "hi" ? "उत्पाद चुनें" : "Select Product"}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              id="bulk-start"
              label={lang === "hi" ? "तारीख (से)" : "From Date"}
              value={bulkStartDate}
              onChange={setBulkStartDate}
              required
            />
            <DateInput
              id="bulk-end"
              label={lang === "hi" ? "तारीख (तक)" : "To Date"}
              value={bulkEndDate}
              onChange={setBulkEndDate}
              required
            />
          </div>
          <Select
            label={lang === "hi" ? "शिफ्ट" : "Shift"}
            value={bulkShift}
            onChange={setBulkShift}
            options={[
              { value: "morning", label: lang === "hi" ? "सुबह" : "Morning" },
              { value: "evening", label: lang === "hi" ? "शाम" : "Evening" },
              { value: "both", label: lang === "hi" ? "दोनों" : "Both" },
            ]}
            required
          />
          {(() => {
            const selectedBulkProduct = products.find((p) => String(p.id) === bulkProductId);
            const bulkProductUnit = selectedBulkProduct?.unit || "liter";
            const bulkProductUnitLabel =
              bulkProductUnit === "kg"
                ? (lang === "hi" ? "किग्रा" : "kg")
                : (lang === "hi" ? "लीटर" : "liters");
            const bulkProductUnitShort =
              bulkProductUnit === "kg"
                ? "kg"
                : (lang === "hi" ? "लीटर" : "liter");

            return (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="bulk-qty"
                  label={lang === "hi" ? `दैनिक मात्रा (${bulkProductUnitLabel})` : `Daily Quantity (${bulkProductUnitLabel})`}
                  type="number"
                  step="0.1"
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(e.target.value)}
                  placeholder="0.0"
                  required
                />
                <Input
                  id="bulk-rate"
                  label={lang === "hi" ? `दर (₹/${bulkProductUnitShort})` : `Rate (₹/${bulkProductUnitShort})`}
                  type="number"
                  step="0.01"
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            );
          })()}
          
          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={bulkSkipSundays}
              onChange={(e) => setBulkSkipSundays(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
            />
            <span className="text-sm font-semibold text-slate-700">
              {lang === "hi" ? "रविवार छोड़ें" : "Skip Sundays"}
            </span>
          </label>

          {bulkStartDate && bulkEndDate && (
            <p className="text-xs text-primary font-bold bg-primary/10 rounded-xl px-4 py-3">
              💡 {getBulkPreviewText()}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
            >
              {lang === "hi" ? "रद्द करें" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmittingBulk}>
              {isSubmittingBulk
                ? lang === "hi"
                  ? "सेव हो रहा है…"
                  : "Saving…"
                : lang === "hi"
                ? "पुष्टि करें और जोड़ें"
                : "Confirm & Add"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Header View */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-foreground">{t("nav.supplierEntries")}</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            {/* Range Icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{lang === "hi" ? "थोक एंट्री" : "Bulk Entry"}</span>
          </Button>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {loadError}
        </p>
      )}

      {/* FIX 5 — persistent inline quick entry form at top */}
      <Card title={lang === "hi" ? "त्वरित प्रविष्टि जोड़ें" : "Quick Daily Entry"}>
        <form onSubmit={handleInlineAdd} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
          <Select
            label={lang === "hi" ? "आपूर्तिकर्ता" : "Supplier"}
            value={inlineSupplierId}
            onChange={setInlineSupplierId}
            options={suppliers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={lang === "hi" ? "ग्राहक चुनें" : "Select supplier"}
            required
            searchable
          />
          <Select
            label={lang === "hi" ? "उत्पाद" : "Product"}
            value={inlineProductId}
            onChange={setInlineProductId}
            options={products.map((p) => ({
              value: String(p.id),
              label: p.name === "milk" ? (lang === "hi" ? "दूध (Milk)" : "Milk") : p.name === "ghee" ? (lang === "hi" ? "घी (Ghee)" : "Ghee") : p.name.charAt(0).toUpperCase() + p.name.slice(1)
            }))}
            placeholder={lang === "hi" ? "उत्पाद चुनें" : "Select Product"}
            required
          />
          <DateInput
            id="inline-date"
            label={lang === "hi" ? "तारीख" : "Date"}
            value={inlineDate}
            onChange={setInlineDate}
            required
          />
          <Select
            label={lang === "hi" ? "शिफ्ट" : "Shift"}
            value={inlineShift}
            onChange={setInlineShift}
            options={[
              { value: "morning", label: lang === "hi" ? "सुबह" : "Morning" },
              { value: "evening", label: lang === "hi" ? "शाम" : "Evening" },
            ]}
            required
          />
          {(() => {
            const selectedInlineProduct = products.find((p) => String(p.id) === inlineProductId);
            const inlineProductUnit = selectedInlineProduct?.unit || "liter";
            const inlineProductUnitLabel =
              inlineProductUnit === "kg"
                ? (lang === "hi" ? "किग्रा" : "kg")
                : (lang === "hi" ? "लीटर" : "liters");
            const inlineProductUnitShort =
              inlineProductUnit === "kg"
                ? "kg"
                : (lang === "hi" ? "लीटर" : "liter");

            return (
              <>
                <Input
                  id="inline-qty"
                  label={lang === "hi" ? `मात्रा (${inlineProductUnitLabel})` : `Qty (${inlineProductUnitLabel})`}
                  type="number"
                  step="0.1"
                  value={inlineQuantity}
                  onChange={(e) => setInlineQuantity(e.target.value)}
                  placeholder="0.0"
                  required
                />
                <Input
                  id="inline-rate"
                  label={lang === "hi" ? `दर (₹/${inlineProductUnitShort})` : `Rate (₹/${inlineProductUnitShort})`}
                  type="number"
                  step="0.01"
                  value={inlineRate}
                  onChange={(e) => setInlineRate(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </>
            );
          })()}
          <Button type="submit" disabled={isAddingInline} className="h-11 flex items-center justify-center gap-2">
            {isAddingInline ? (
              <span>{lang === "hi" ? "सेव हो रहा है…" : "Adding…"}</span>
            ) : (
              <>
                <span>{lang === "hi" ? "प्रविष्टि जोड़ें" : "Add Entry"}</span>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Standard Filters Card */}
      <Card title={lang === "hi" ? "एंट्री फ़िल्टर" : "Filters"}>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <DateInput
            id="date-from"
            label={lang === "hi" ? "तारीख (से)" : "Date from"}
            value={dateFrom}
            onChange={setDateFrom}
            className="flex-1"
          />
          <DateInput
            id="date-to"
            label={lang === "hi" ? "तारीख (तक)" : "Date to"}
            value={dateTo}
            onChange={setDateTo}
            className="flex-1"
          />
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 mb-1">
              {lang === "hi" ? "ग्राहक खोजें" : "Search supplier"}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "hi" ? "नाम से खोजें" : "Search by supplier name"}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 h-11">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDateFrom(startOfMonthISO());
                setDateTo(isoDate(new Date()));
                setSearch("");
              }}
            >
              {lang === "hi" ? "रीसेट" : "Reset"}
            </Button>
            <Button type="button" variant="outline" onClick={() => fetchEntries()}>
              {lang === "hi" ? "रिफ्रेश" : "Refresh"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-semibold">
          {isLoadingEntries
            ? lang === "hi"
              ? "लोड हो रहा है…"
              : "Loading…"
            : `${filteredCount} ${lang === "hi" ? "एंट्री" : "entries"}${
                totalCount != null ? ` • ${lang === "hi" ? "कुल" : "Total"}: ${totalCount}` : ""
              }`}
        </p>
      </Card>

      {/* Entries Table */}
      <Card title={lang === "hi" ? "सभी एंट्री" : "All Entries"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isLoadingEntries
                      ? lang === "hi"
                        ? "लोड हो रहा है…"
                        : "Loading…"
                      : lang === "hi"
                        ? "कोई एंट्री नहीं मिली।"
                        : "No entries found."}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border hover:bg-secondary/40 transition-colors"
                  >
                    <td className="px-4 py-2 font-medium">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {entry.daily_suppliers?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{entry.daily_products?.name ?? "—"}</td>
                    <td className="px-4 py-2 capitalize text-slate-600">{entry.shift}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {entry.quantity} {entry.daily_products?.unit === "liter" ? (lang === "hi" ? "लीटर" : "liter") : (entry.daily_products?.unit || "")}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-primary">
                      ₹{Number(entry.total_amount).toFixed(2)}
                    </td>
                    {/* Actions cell containing the Edit action button */}
                    <td className="px-4 py-2 text-center print:hidden">
                      <div className="flex justify-center items-center gap-1">
                        <button
                          onClick={() => handleEditClick(entry)}
                          className="p-1.5 text-primary hover:text-primary-muted hover:bg-primary/10 rounded-xl transition-all inline-flex items-center"
                          title="Edit entry"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        {entry.daily_suppliers?.phone && (
                          <a
                            href={`https://wa.me/${entry.daily_suppliers.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              lang === "hi"
                                ? `नमस्ते ${entry.daily_suppliers.name},\n\nहमने ${formatDate(entry.date)} को ${entry.shift === "morning" ? "सुबह" : "शाम"} की शिफ्ट में आपसे ${entry.quantity} ${entry.daily_products?.unit === "liter" ? "लीटर" : (entry.daily_products?.unit || "")} ${entry.daily_products?.name === "milk" ? "दूध" : entry.daily_products?.name || ""} प्राप्त किया है।\n\nधन्यवाद!`
                                : `Hello ${entry.daily_suppliers.name},\n\nWe have received ${entry.quantity} ${entry.daily_products?.unit === "liter" ? "liter" : (entry.daily_products?.unit || "")} ${entry.daily_products?.name || ""} from you on ${formatDate(entry.date)} (${entry.shift} shift).\n\nThank you!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all inline-flex items-center"
                            title={lang === "hi" ? "WhatsApp पर भेजें" : "Send on WhatsApp"}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SupplierEntriesPage;
