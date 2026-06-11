import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planName } = await req.json();
    if (planName !== "monthly" && planName !== "yearly") {
      return NextResponse.json({ error: "Invalid plan name" }, { status: 400 });
    }

    const planId = planName === "monthly"
      ? process.env.NEXT_PUBLIC_RAZORPAY_PLAN_MONTHLY
      : process.env.NEXT_PUBLIC_RAZORPAY_PLAN_YEARLY;

    if (!planId) {
      return NextResponse.json(
        { error: "Razorpay Plan ID not configured in server environment (.env)" },
        { status: 500 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay API credentials not configured in server environment" },
        { status: 500 }
      );
    }

    // Call Razorpay API to create a subscription
    const authHeader = `Basic ${Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64")}`;
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        plan_id: planId.trim(),
        total_count: planName === "monthly" ? 12 : 5, // Standard cycle counts
        quantity: 1,
        customer_notify: 1,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Razorpay subscription creation failed:", data);
      return NextResponse.json(
        { error: data.error?.description || "Failed to create subscription in Razorpay" },
        { status: response.status }
      );
    }

    return NextResponse.json({ subscriptionId: data.id });
  } catch (error: any) {
    console.error("Payment API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
