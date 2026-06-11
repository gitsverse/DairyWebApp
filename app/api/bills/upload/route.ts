import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";
import { formatDate } from "@/lib/dateUtils";
import {
  BillPdfDocument,
  type BillPdfLine,
} from "@/components/bills/BillPdfDocument";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedSupabase();
    if (!auth.ok) return auth.response;

    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch (err) {
      return json(
        { error: "Invalid request body: must be valid JSON" },
        { status: 400 }
      );
    }

    const { customer_id, customer_ids, start_date, end_date, view_mode, customers_config } = requestBody;

    let configs: { id: string; start_date: string; end_date: string; type?: string }[] = [];
    if (customers_config && Array.isArray(customers_config)) {
      configs = customers_config;
    } else {
      const ids: string[] = customer_ids || (customer_id ? [customer_id] : []);
      if (start_date && end_date) {
        configs = ids.map((id) => ({ id, start_date, end_date }));
      }
    }

    if (configs.length === 0) {
      return json(
        { error: "No customer configurations or dates provided" },
        { status: 400 }
      );
    }

    const { data: profile } = await auth.supabase
      .from("daily_profile")
      .select("*")
      .eq("id", 1)
      .maybeSingle() as { data: any | null };

    let billsData: any[] = [];

    try {
      billsData = await Promise.all(
        configs.map(async (config) => {
          const { id, start_date: local_start_date, end_date: local_end_date, type } = config;
          const isSupplier = type === "supplier";

          const customerTable = isSupplier ? "daily_suppliers" : "daily_customers";
          const entriesTable = isSupplier ? "daily_supplier_entries" : "daily_entries";
          const transactionsTable = isSupplier ? "daily_supplier_transactions" : "daily_transactions";
          const idField = isSupplier ? "supplier_id" : "customer_id";

          // Fetch all customer/supplier configurations concurrently for high performance and read isolation
          const [
            customerRes,
            entriesRes,
            prevEntriesRes,
            transactionsRes,
            prevTransactionsRes
          ] = await Promise.all([
            auth.supabase
              .from(customerTable as any)
              .select("name, phone, address")
              .eq("id", id)
              .single() as any,
            auth.supabase
              .from(entriesTable as any)
              .select("date, shift, quantity, price_per_unit, total_amount, daily_products(name, unit)")
              .eq(idField, id)
              .gte("date", local_start_date)
              .lte("date", local_end_date)
              .order("date", { ascending: true }) as any,
            auth.supabase
              .from(entriesTable as any)
              .select("total_amount")
              .eq(idField, id)
              .lt("date", local_start_date) as any,
            auth.supabase
              .from(transactionsTable as any)
              .select("date, type, amount, payment_mode, note")
              .eq(idField, id)
              .gte("date", local_start_date)
              .lte("date", local_end_date)
              .order("date", { ascending: true }) as any,
            auth.supabase
              .from(transactionsTable as any)
              .select("amount, type")
              .eq(idField, id)
              .lt("date", local_start_date) as any
          ]);

          if (customerRes.error || !customerRes.data) {
            throw new Error(customerRes.error?.message || `${isSupplier ? 'Supplier' : 'Customer'} not found: ${id}`);
          }
          if (entriesRes.error) throw new Error(entriesRes.error.message);
          if (prevEntriesRes.error) throw new Error(prevEntriesRes.error.message);
          if (transactionsRes.error) throw new Error(transactionsRes.error.message);
          if (prevTransactionsRes.error) throw new Error(prevTransactionsRes.error.message);

          const customer = customerRes.data;
          const entries = entriesRes.data;
          const prevEntries = prevEntriesRes.data;
          const transactions = transactionsRes.data;
          const prevTransactions = prevTransactionsRes.data;

          const lines: BillPdfLine[] = [];

          // Group entries and transactions by date
          const entriesByDate: Record<string, any[]> = {};
          for (const e of entries || []) {
            const d = String(e.date);
            if (!entriesByDate[d]) entriesByDate[d] = [];
            entriesByDate[d].push(e);
          }

          const transactionsByDate: Record<string, any[]> = {};
          for (const t of transactions || []) {
            const d = String(t.date);
            if (!transactionsByDate[d]) transactionsByDate[d] = [];
            transactionsByDate[d].push(t);
          }

          // Generate all dates in the range
          const dates: string[] = [];
          if (local_start_date && local_end_date) {
            const currTime = new Date(local_start_date + "T12:00:00");
            const endTime = new Date(local_end_date + "T12:00:00");
            while (currTime <= endTime) {
              dates.push(currTime.toISOString().slice(0, 10));
              currTime.setDate(currTime.getDate() + 1);
            }
          }

          // Populate lines day by day to show active purchases or "X" for empty days
          for (const date of dates) {
            const dayEntries = entriesByDate[date] || [];
            const dayTransactions = transactionsByDate[date] || [];

            if (dayEntries.length > 0) {
              for (const e of dayEntries) {
                const p = e.daily_products as { name?: string; unit?: string } | null;
                const name = p?.name ?? "product";
                const unit = p?.unit ?? "";
                lines.push({
                  date: date,
                  kind: "Sale",
                  detail: `${e.shift} - ${Number(e.quantity)} ${name} @ Rs. ${Number(e.price_per_unit).toFixed(2)}`,
                  debit: Number(e.total_amount).toFixed(2),
                  credit: "-",
                  quantity: Number(e.quantity),
                  shift: e.shift === "evening" ? "evening" : "morning",
                  productName: name,
                  productUnit: unit,
                  pricePerUnit: Number(e.price_per_unit),
                });
              }
            } else {
              // No milk purchase on this day, add a cut line
              lines.push({
                date: date,
                kind: "Sale",
                detail: "X",
                debit: "-",
                credit: "-",
              });
            }

            for (const t of dayTransactions) {
              if (t.type === "due") continue; // Exclude due transactions from table lines to avoid double-counting with previous due
              lines.push({
                date: date,
                kind: String(t.type),
                detail: `${t.payment_mode}${t.note ? ` - ${t.note}` : ""}`,
                debit: "-",
                credit: Number(t.amount).toFixed(2),
              });
            }
          }

          let totalSales = 0;
          let totalPaid = 0;
          let prevSales = 0;
          let prevPaid = 0;
          let periodDues = 0;

          for (const e of prevEntries || []) {
            prevSales += Number(e.total_amount || 0);
          }
          for (const t of prevTransactions || []) {
            if (t.type === "due") {
              prevSales += Number(t.amount || 0);
            } else {
              prevPaid += Number(t.amount || 0);
            }
          }
          for (const e of entries || []) {
            totalSales += Number(e.total_amount || 0);
          }
          for (const t of transactions || []) {
            if (t.type === "due") {
              periodDues += Number(t.amount || 0);
            } else {
              totalPaid += Number(t.amount || 0);
            }
          }
          const openingBalance = (prevSales - prevPaid) + periodDues;
          const finalBalance = openingBalance + totalSales - totalPaid;

          return {
            customerName: customer.name,
            customerPhone: customer.phone,
            customerAddress: customer.address,
            lines,
            openingBalance: Math.abs(openingBalance).toFixed(2),
            totalSales: totalSales.toFixed(2),
            totalPaid: totalPaid.toFixed(2),
            finalBalance: Math.abs(finalBalance).toFixed(2),
            periodLabel: `${formatDate(local_start_date)} - ${formatDate(local_end_date)}`,
          };
        })
      );
    } catch (err: any) {
      return json({ error: err.message || "Failed to query customer bills data." }, { status: 500 });
    }

    const dairyName = profile?.dairy_name ?? "Dairy";
    const defaultStartDate = configs[0]?.start_date || "";
    const defaultEndDate = configs[0]?.end_date || "";

    try {
      const buffer = await renderToBuffer(
        React.createElement(BillPdfDocument, {
          dairyName,
          tagline: profile?.tagline,
          address: profile?.address,
          phone: profile?.phone,
          gst: profile?.gst,
          periodLabel: `${formatDate(defaultStartDate)} → ${formatDate(defaultEndDate)}`,
          bills: billsData,
          viewMode: view_mode || "grid",
        }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
      );

      const bucket = process.env.BILLS_BUCKET || "bills";
      const today = new Date().toISOString().slice(0, 10);
      const pathId = configs.map((c) => c.id).join("_");
      const path = `projects/dairy/${today}/bills/${pathId}/${defaultStartDate}_${defaultEndDate}.pdf`;

      const { error: upErr } = await auth.supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (upErr) {
        return json({ error: upErr.message }, { status: 500 });
      }

      const { data: signed, error: signErr } = await auth.supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      if (signErr || !signed?.signedUrl) {
        return json(
          { error: signErr?.message ?? "Could not sign URL" },
          { status: 500 }
        );
      }

      // Shorten the signed URL using TinyURL to keep WhatsApp messages clean
      let shortUrl = null;
      try {
        const tinyRes = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(signed.signedUrl));
        if (tinyRes.ok) {
          shortUrl = await tinyRes.text();
        }
      } catch (err) {
        console.error("TinyURL error:", err);
      }

      return json({
        signedUrl: signed.signedUrl,
        shortUrl: shortUrl,
        path,
        bucket,
        expiresInSeconds: 60 * 60 * 24 * 7,
      });
    } catch (err: any) {
      console.error("PDF generation/upload failed:", err);
      return json({ error: err.message || "Failed to generate and upload PDF" }, { status: 500 });
    }
  } catch (err: any) {
    console.error("Unexpected error in bills upload:", err);
    return json({ error: err.message || "An unexpected error occurred while processing your request" }, { status: 500 });
  }
}
