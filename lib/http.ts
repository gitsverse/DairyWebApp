import { NextResponse } from "next/server";

/** User-specific API data: never cache on shared CDNs; browser may revalidate. */
const PRIVATE_NO_STORE = "private, no-store, must-revalidate";

export function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", PRIVATE_NO_STORE);
  }
  return NextResponse.json(body, { ...init, headers });
}
