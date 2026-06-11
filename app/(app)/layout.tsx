import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SubscriptionGuard from "@/components/SubscriptionGuard";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subData } = await supabase.rpc("get_subscription_status", {
    p_user_id: user.id,
  });

  const isActive = subData?.[0]?.is_active ?? false;
  const daysRemaining = subData?.[0]?.days_remaining ?? 0;
  const planName = subData?.[0]?.plan_name ?? null;

  return (
    <SubscriptionGuard
      isActive={isActive}
      daysRemaining={daysRemaining}
      planName={planName}
    >
      <AppShell>{children}</AppShell>
    </SubscriptionGuard>
  );
}

