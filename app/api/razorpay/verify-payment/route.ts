// app/api/razorpay/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await req.json()

    const keySecret = process.env.RAZORPAY_KEY_SECRET!

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex')

    const isValid = expectedSignature === razorpay_signature

    if (!isValid) {
      return NextResponse.json(
        { verified: false, error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      verified: true,
      paymentId: razorpay_payment_id
    })

  } catch (error: any) {
    return NextResponse.json(
      { verified: false, error: error.message },
      { status: 500 }
    )
  }
}
