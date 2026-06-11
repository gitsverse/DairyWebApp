import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";

export async function GET() {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("daily_customers" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { name, phone, address, default_milk_qty, custom_milk_rate } =
    await req.json();

  if (!name) return json({ error: "Name is required" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("daily_customers" as any)
    .insert([{ name, phone, address, default_milk_qty, custom_milk_rate }] as any)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data, { status: 201 });
}
