// app/api/razorpay/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Razorpay from "razorpay"

export async function POST(req: NextRequest) {
  try {
    const { amount, planName } = await req.json()

    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    if (!key_id || !key_secret) {
      return NextResponse.json(
        { error: 'Razorpay keys not configured' },
        { status: 500 }
      )
    }

    const razorpay = new Razorpay({ key_id, key_secret })

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise safely as integer
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { plan: planName }
    });

    return NextResponse.json({ orderId: order.id, amount: order.amount })

  } catch (error: any) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { error: error.description || error.message || 'Order creation failed' },
      { status: 500 }
    )
  }
}
