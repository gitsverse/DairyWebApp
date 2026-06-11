import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");

  let query = auth.supabase
    .from("daily_transactions" as any)
    .select("*")
    .order("date", { ascending: true });
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, { status: 500 });

  return json(data);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { customer_id, type, amount, payment_mode, date, note } = await req.json();

  if (!customer_id || !type || amount == null || !payment_mode) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("daily_transactions" as any)
    .insert([
      {
        customer_id,
        type,
        amount,
        payment_mode,
        date: date || new Date().toISOString().slice(0, 10),
        note,
      },
    ])
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data, { status: 201 });
}
