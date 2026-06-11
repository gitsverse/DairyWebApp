import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  // Basic UUID v1-v5 validation (case-insensitive)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return null;
  }
  return v;
}

function safeJsonError(message: string, details?: unknown) {
  if (details != null) console.error("[api/entries]", message, details);
  return json({ error: message }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("supplier_id");

  console.log("[api/entries][GET]", {
    supplier_id: customerId ?? null,
    url: req.url,
  });

  let query = auth.supabase.from("daily_supplier_entries" as any).select("*").order("date", { ascending: true });
  if (customerId) query = query.eq("supplier_id", customerId);

  const { data, error } = await query;
  if (error) {
    console.error("[api/entries][GET] supabase error", error);
    return json({ error: error.message }, { status: 500 });
  }

  return json(data);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return safeJsonError("Invalid JSON body", e);
  }

  const supplier_id = normalizeUuid(body?.supplier_id);
  const product_id = typeof body?.product_id === "number" ? body.product_id : Number(body?.product_id);
  const date = typeof body?.date === "string" ? body.date : null;
  const shift = typeof body?.shift === "string" ? body.shift : null;
  const quantity = typeof body?.quantity === "number" ? body.quantity : Number(body?.quantity);
  const price_per_unit =
    typeof body?.price_per_unit === "number" ? body.price_per_unit : Number(body?.price_per_unit);

  console.log("[api/entries][POST] create", {
    supplier_id_present: !!supplier_id,
    product_id,
    date,
    shift,
    quantity,
    price_per_unit,
  });

  if (
    !supplier_id ||
    !Number.isFinite(product_id) ||
    product_id <= 0 ||
    !date ||
    !shift ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(price_per_unit)
  ) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("daily_supplier_entries" as any)
    .insert([
      {
        supplier_id,
        product_id: Math.trunc(product_id),
        date,
        shift,
        quantity,
        price_per_unit,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("[api/entries][POST] supabase error", error);
    return json({ error: error.message }, { status: 500 });
  }
  return json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return safeJsonError("Invalid JSON body", e);
  }

  const id = normalizeUuid(body?.id);
  const supplier_id = body?.supplier_id == null ? undefined : normalizeUuid(body?.supplier_id);
  const product_id =
    body?.product_id == null
      ? undefined
      : typeof body?.product_id === "number"
        ? body.product_id
        : Number(body?.product_id);
  const date = body?.date == null ? undefined : typeof body?.date === "string" ? body.date : null;
  const shift = body?.shift == null ? undefined : typeof body?.shift === "string" ? body.shift : null;
  const quantity =
    body?.quantity == null
      ? undefined
      : typeof body?.quantity === "number"
        ? body.quantity
        : Number(body?.quantity);
  const price_per_unit =
    body?.price_per_unit == null
      ? undefined
      : typeof body?.price_per_unit === "number"
        ? body.price_per_unit
        : Number(body?.price_per_unit);

  console.log("[api/entries][PATCH] update", {
    id_present: !!id,
    has_supplier_id: supplier_id !== undefined,
    has_product_id: product_id !== undefined,
    has_date: date !== undefined,
    has_shift: shift !== undefined,
    has_quantity: quantity !== undefined,
    has_price_per_unit: price_per_unit !== undefined,
  });

  if (!id) return safeJsonError("Missing/invalid entry id");

  const patch: Record<string, unknown> = {};
  if (supplier_id !== undefined) {
    if (!supplier_id) return safeJsonError("Invalid supplier_id");
    patch.supplier_id = supplier_id;
  }
  if (product_id !== undefined) {
    if (!Number.isFinite(product_id) || product_id <= 0) return safeJsonError("Invalid product_id");
    patch.product_id = Math.trunc(product_id);
  }
  if (date !== undefined) {
    if (!date) return safeJsonError("Invalid date");
    patch.date = date;
  }
  if (shift !== undefined) {
    if (!shift) return safeJsonError("Invalid shift");
    patch.shift = shift;
  }
  if (quantity !== undefined) {
    if (!Number.isFinite(quantity)) return safeJsonError("Invalid quantity");
    patch.quantity = quantity;
  }
  if (price_per_unit !== undefined) {
    if (!Number.isFinite(price_per_unit)) return safeJsonError("Invalid price_per_unit");
    patch.price_per_unit = price_per_unit;
  }

  if (Object.keys(patch).length === 0) {
    return safeJsonError("No fields to update");
  }

  const { data, error } = await auth.supabase
    .from("daily_supplier_entries" as any)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[api/entries][PATCH] supabase error", error);
    return json({ error: error.message }, { status: 500 });
  }
  return json(data, { status: 200 });
}
