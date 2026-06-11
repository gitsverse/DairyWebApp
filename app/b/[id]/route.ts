import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  // Decode the base64url encoded path
  const storagePath = Buffer.from(params.id, 'base64url').toString('utf-8');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );

  const bucket = process.env.BILLS_BUCKET || "bills";

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not retrieve bill" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
