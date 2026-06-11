import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const SUPERADMIN_EMAIL = "atifazmi2005@gmail.com";

  // Protect /admin/dashboard - superadmin only
  if (path.startsWith("/admin/dashboard")) {
    if (!user || user.email !== SUPERADMIN_EMAIL) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url, { status: 303 });
    }
  }

  // Prevent logged-in superadmin from seeing admin login
  if (path === "/admin/login" && user && user.email === SUPERADMIN_EMAIL) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url, { status: 303 });
  }

  if (path === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url, { status: 303 });
  }

  const isProtectedApp =
    path.startsWith("/dashboard") ||
    path.startsWith("/customers") ||
    path.startsWith("/entries") ||
    path.startsWith("/products") ||
    path.startsWith("/billing") ||
    path.startsWith("/ledger") ||
    path.startsWith("/settings");

  const isProtectedApi =
    path.startsWith("/api/") &&
    !path.startsWith("/api/auth");

  if (isProtectedApp && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((path === "/login" || path === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url, { status: 303 });
  }

  return supabaseResponse;
}

