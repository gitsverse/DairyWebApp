import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";
import { parseISO, differenceInDays, addDays, format, isValid } from "date-fns";

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return null;
  }
  return v;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supplier_id = normalizeUuid(body?.supplier_id);
  const product_id = body?.product_id != null ? Number(body.product_id) : null;
  const start_date = typeof body?.start_date === "string" ? body.start_date : null;
  const end_date = typeof body?.end_date === "string" ? body.end_date : null;
  const quantity = typeof body?.quantity === "number" ? body.quantity : Number(body?.quantity);
  const price_per_unit =
    typeof body?.price_per_unit === "number" ? body.price_per_unit : Number(body?.price_per_unit);
  const skip_sundays = !!body?.skip_sundays;
  const shift = body?.shift || "morning"; // "morning", "evening", or "both"

  if (
    !supplier_id ||
    !start_date ||
    !end_date ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(price_per_unit) ||
    price_per_unit <= 0
  ) {
    return json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  const startParsed = parseISO(start_date);
  const endParsed = parseISO(end_date);

  if (!isValid(startParsed) || !isValid(endParsed) || startParsed > endParsed) {
    return json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    // 1. Fetch milk product ID if product_id was not provided
    let productId = product_id;
    if (!productId || isNaN(productId) || productId <= 0) {
      const { data: milkProd } = await auth.supabase
        .from("daily_products" as any)
        .select("id")
        .eq("name", "milk")
        .maybeSingle() as { data: any | null };
      productId = milkProd?.id ?? 1;
    }

    // 2. Fetch existing daily entries in the date range for the customer
    const { data: existing, error: fetchErr } = await auth.supabase
      .from("daily_supplier_entries" as any)
      .select("date, shift")
      .eq("supplier_id", supplier_id)
      .gte("date", start_date)
      .lte("date", end_date) as { data: { date: string, shift: string }[] | null; error: any };

    if (fetchErr) {
      return json({ error: fetchErr.message }, { status: 500 });
    }

    const existingSet = new Set(existing?.map((e) => `${e.date}:${e.shift}`) || []);

    // 3. Generate candidate dates
    const totalDays = differenceInDays(endParsed, startParsed) + 1;
    const candidates: { date: string, shift: string }[] = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDate = addDays(startParsed, i);
      const isSunday = currentDate.getDay() === 0;
      
      // If skip_sundays is active and it is a Sunday, skip it entirely
      if (skip_sundays && isSunday) {
        continue;
      }
      
      const dateStr = format(currentDate, "yyyy-MM-dd");
      if (shift === "both" || shift === "morning") {
        candidates.push({ date: dateStr, shift: "morning" });
      }
      if (shift === "both" || shift === "evening") {
        candidates.push({ date: dateStr, shift: "evening" });
      }
    }

    // 4. Filter out dates that already exist
    const toInsert = candidates.filter((c) => !existingSet.has(`${c.date}:${c.shift}`));
    const skippedCount = candidates.length - toInsert.length;

    if (toInsert.length > 0) {
      // 5. Perform bulk insert
      const rows = toInsert.map((c) => ({
        supplier_id,
        product_id: productId,
        date: c.date,
        shift: c.shift,
        quantity,
        price_per_unit,
      }));

      const { error: insErr } = await auth.supabase
        .from("daily_supplier_entries" as any)
        .insert(rows);

      if (insErr) {
        console.error("[api/entries/bulk] insert error", insErr);
        return json({ error: insErr.message }, { status: 500 });
      }
    }

    return json({
      success: true,
      added: toInsert.length,
      skipped: skippedCount,
    });
  } catch (e) {
    console.error("[api/entries/bulk] unexpected error", e);
    return json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
