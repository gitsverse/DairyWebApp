import { createClient } from "@/lib/supabase/server";
import { json } from "@/lib/http";

export async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      supabase,
      user: null as any,
      response: json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const, supabase, user, response: null as any };
}

