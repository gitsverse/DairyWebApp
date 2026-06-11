"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import EntryForm from "@/components/forms/EntryForm";
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
  customer_id?: string;
  daily_customers: { name: string } | null;
  daily_products: { name: string; unit: string } | null;
}

const EntriesPage = () => {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  
  const [customers, setCustomers] = useState<{ id: string; name: string; custom_milk_rate?: number | null }[]>([]);
  const [products, setProducts] = useState<
    { id: number; name: string; default_rate: number; unit: string }[]
  >([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  // Quick Inline Add form state
  const [inlineCustomerId, setInlineCustomerId] = useState("");
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
  const [bulkCustomerId, setBulkCustomerId] = useState("");
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

  // Query and auto-fill last used milk rate for the selected customer
  const fetchLastUsedRate = useCallback(async (cid: string, pid: string) => {
    if (!cid || !pid) return;
    try {
      const { data, error } = await supabaseClient
        .from("daily_entries" as any)
        .select("price_per_unit")
        .eq("customer_id", cid)
        .eq("product_id", Number(pid))
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: any | null; error: any };

      if (error) {
        console.error("Error fetching last customer rate:", error);
      }

      if (data?.price_per_unit != null) {
        setInlineRate(String(data.price_per_unit));
      } else {
        const cust = customers.find((c) => c.id === cid);
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
  }, [customers, products]);

  useEffect(() => {
    if (inlineCustomerId && inlineProductId) {
      fetchLastUsedRate(inlineCustomerId, inlineProductId);
    } else {
      setInlineRate("");
    }
  }, [inlineCustomerId, inlineProductId, fetchLastUsedRate]);

  // Bulk rate auto-fill
  useEffect(() => {
    if (bulkCustomerId && bulkProductId) {
      const cust = customers.find((c) => c.id === bulkCustomerId);
      const selectedProd = products.find((p) => String(p.id) === bulkProductId);
      if (selectedProd?.name === "milk" && cust?.custom_milk_rate != null) {
        setBulkRate(String(cust.custom_milk_rate));
      } else {
        setBulkRate(String(selectedProd?.default_rate ?? 60));
      }
    } else {
      setBulkRate("");
    }
  }, [bulkCustomerId, bulkProductId, customers, products]);

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoadingEntries(true);
      const { data, error, count } = await withTimeout(
        (() => {
          let q = supabaseClient
            .from("daily_entries" as any)
            .select(
              debouncedSearch
                ? "id, date, shift, quantity, total_amount, price_per_unit, product_id, customer_id, daily_customers!inner(name), daily_products(name, unit)"
                : "id, date, shift, quantity, total_amount, price_per_unit, product_id, customer_id, daily_customers(name), daily_products(name, unit)",
              { count: "exact" }
            )
            .order("date", { ascending: false })
            .order("id", { ascending: false });

          if (dateFrom) q = q.gte("date", dateFrom);
          if (dateTo) q = q.lte("date", dateTo);

          if (debouncedSearch) {
            q = q.ilike("daily_customers.name", `%${debouncedSearch}%`);
          }

          return q;
        })(),
        FETCH_MS
      );

      if (error) {
        console.error("[EntriesPage] error fetching entries", error);
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
        supabaseClient.from("daily_entries" as any).select("id", { count: "exact", head: true }),
        FETCH_MS
      );
      if (totalErr) {
        console.error("[EntriesPage] error fetching total entries count", totalErr);
        setTotalCount(null);
      } else {
        setTotalCount(typeof total === "number" ? total : null);
      }

      const { data: customersData, error: cErr } = await withTimeout(
        supabaseClient.from("daily_customers" as any).select("id, name, custom_milk_rate"),
        FETCH_MS
      );
      const { data: productsData, error: pErr } = await withTimeout(
        supabaseClient.from("daily_products" as any).select("id, name, default_rate, unit"),
        FETCH_MS
      ) as { data: any[] | null; error: any };

      if (cErr || pErr) {
        setLoadError(cErr?.message ?? pErr?.message ?? "Could not load form data");
        setCustomers([]);
        setProducts([]);
        return;
      }

      setCustomers((customersData as any) || []);
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
      setCustomers([]);
      setProducts([]);
    }
  }, [fetchEntries]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Inline Quick Add Handler
  const handleInlineAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineCustomerId || !inlineProductId || !inlineDate || !inlineQuantity || !inlineRate) {
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
        customer_id: inlineCustomerId,
        product_id: Number(inlineProductId),
        date: inlineDate,
        shift: inlineShift,
        quantity: qtyNum,
        price_per_unit: rateNum,
      };

      const res = await fetch("/api/entries", {
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
    if (!bulkCustomerId || !bulkProductId || !bulkStartDate || !bulkEndDate || !bulkQuantity || !bulkRate) {
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
      const res = await fetch("/api/entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: bulkCustomerId,
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
      customer_id: entry.customer_id,
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
          <EntryForm
            customers={customers}
            products={products}
            entry={editingEntry}
            onSuccess={handleEditSuccess}
          />
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
            label={lang === "hi" ? "ग्राहक" : "Customer"}
            value={bulkCustomerId}
            onChange={setBulkCustomerId}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={lang === "hi" ? "ग्राहक चुनें" : "Select Customer"}
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
        <h1 className="text-3xl font-bold text-foreground">{t("entries.title")}</h1>
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
            label={lang === "hi" ? "ग्राहक" : "Customer"}
            value={inlineCustomerId}
            onChange={setInlineCustomerId}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={lang === "hi" ? "ग्राहक चुनें" : "Select Customer"}
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
              {lang === "hi" ? "ग्राहक खोजें" : "Search customer"}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "hi" ? "नाम से खोजें" : "Search by customer name"}
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
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
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
                        {entry.daily_customers?.name ?? "—"}
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
                        <button
                          onClick={() => handleEditClick(entry)}
                          className="p-1.5 text-primary hover:text-primary-muted hover:bg-primary/10 rounded-xl transition-all inline-flex items-center touch-manipulation min-h-[44px] min-w-[44px] justify-center"
                          title="Edit entry"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {entries.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {isLoadingEntries ? "Loading..." : "No entries found."}
              </p>
            ) : (
              entries.map((entry) => (
                <div key={`mob-${entry.id}`} className="border border-border rounded-xl p-4 bg-white shadow-sm flex justify-between items-center relative pr-12">
                  <div className="space-y-1 w-full">
                    <p className="font-bold text-primary text-base">
                      {entry.daily_customers?.name ?? "—"}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground font-medium">
                      <span>{formatDate(entry.date)}</span>
                      <span>•</span>
                      <span className="capitalize">{entry.shift}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-medium text-slate-600">
                        {entry.daily_products?.name ?? "—"} ({entry.quantity} {entry.daily_products?.unit === "liter" ? (lang === "hi" ? "लीटर" : "liter") : (entry.daily_products?.unit || "")})
                      </span>
                      <span className="font-bold text-emerald-700 text-base">
                        ₹{Number(entry.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditClick(entry)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-xl transition-all touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Edit entry"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      </Card>
    </div>
  );
};

export default EntriesPage;
