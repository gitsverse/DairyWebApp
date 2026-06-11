import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";

export async function GET() {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("daily_profile" as any)
    .select("*")
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

  // Fetch existing profile ID to perform an update on conflict
  const { data: existingProfile } = await auth.supabase
    .from("daily_profile" as any)
    .select("id")
    .maybeSingle() as { data: any | null };

  const profileId = existingProfile?.id;

  const { data, error } = await auth.supabase
    .from("daily_profile" as any)
    .upsert(
      {
        ...(profileId ? { id: profileId } : {}),
        ...payload,
        user_id: auth.user.id,
        updated_at: new Date().toISOString(),
      }
    )
    .select()
    .single() as { data: any | null; error: any };

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data);
}

