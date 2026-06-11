import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

export async function middleware(request: NextRequest) {
  // Basic Rate Limiting
  const ip = (request as any).ip || request.headers.get("x-forwarded-for") || "127.0.0.1";
  
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    const now = Date.now();
    let record = rateLimitMap.get(ip);
    
    if (!record || now - record.lastReset > RATE_LIMIT_WINDOW_MS) {
      record = { count: 1, lastReset: now };
      rateLimitMap.set(ip, record);
    } else {
      record.count += 1;
      if (record.count > MAX_REQUESTS_PER_WINDOW) {
        return new NextResponse("Too Many Requests", { status: 429 });
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
