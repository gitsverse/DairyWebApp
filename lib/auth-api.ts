import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedSupabase() {
  // Temporary hardcoded auth uses middleware cookie gating for pages and APIs.
  // API routes can assume requests already passed middleware; keep signature compatible.
  const supabase = await createClient();
  return { ok: true as const, supabase, user: null as any, response: null as any };
}
