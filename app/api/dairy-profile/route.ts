import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";

export async function GET() {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("daily_profile" as any)
    .select("*")
    .eq("id", 1)
    .maybeSingle() as { data: any | null; error: any };

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const allowed = [
    "dairy_name",
    "tagline",
    "address",
    "phone",
    "gst",
    "logo_url",
  ] as const;
  const payload: Record<string, string | undefined> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) payload[key] = body[key];
  }

  const { data, error } = await auth.supabase
    .from("daily_profile" as any)
    .upsert(
      { id: 1, ...payload, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single() as { data: any | null; error: any };

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data);
}
