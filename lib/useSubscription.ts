import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export type SubscriptionStatus = {
  isActive: boolean;
  planName: string | null;
  daysRemaining: number;
  endDate: string | null;
  loading: boolean;
};

export function useSubscription(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: false,
    planName: null,
    daysRemaining: 0,
    endDate: null,
    loading: true,
  });

  useEffect(() => {
    async function fetchStatus() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        setStatus((s) => ({ ...s, loading: false }));
        return;
      }

      const { data, error } = await supabaseClient
        .rpc("get_subscription_status", { p_user_id: user.id });

      if (data && data.length > 0) {
        setStatus({
          isActive: data[0].is_active,
          planName: data[0].plan_name,
          daysRemaining: data[0].days_remaining,
          endDate: data[0].end_date,
          loading: false,
        });
      } else {
        setStatus((s) => ({ ...s, isActive: false, loading: false }));
      }
    }
    fetchStatus();
  }, []);

  return status;
}
