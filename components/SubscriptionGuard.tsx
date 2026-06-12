"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  isActive: boolean;
  daysRemaining: number;
  planName: string | null;
  children: React.ReactNode;
}

export default function SubscriptionGuard({
  isActive,
  daysRemaining,
  planName,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Redirect to subscription page if plan is expired and we aren't already there
    if (
      !isActive &&
      pathname !== "/subscription" &&
      !pathname.startsWith("/admin") &&
      pathname !== "/login" &&
      pathname !== "/signup"
    ) {
      router.replace("/subscription");
    }
  }, [isActive, pathname, router]);

  // Always allow subscription, public landing pages, auth, and superadmin views
  if (
    pathname === "/subscription" ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/"
  ) {
    return <>{children}</>;
  }

  if (!isActive) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* Show trial warning banner if <= 5 days left */}
      {planName === "free_trial" && daysRemaining <= 5 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs text-center py-2.5 px-4 font-semibold flex items-center justify-center gap-2 relative z-50 shadow-md">
          <span>
            <span className="bg-slate-950 text-amber-400 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded mr-1.5">
              Trial Notice
            </span>
            Your 14-day free trial expires in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}.
          </span>
          <a href="/subscription" className="underline font-extrabold hover:text-black transition-colors">
            Subscribe now &rarr;
          </a>
        </div>
      )}
      {children}
    </>
  );
}
