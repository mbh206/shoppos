import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSquareClient, SANDBOX_TEST_CARDS } from '@/lib/square-client'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { orderId, amountMinor, sourceId } = body

  if (!orderId || !amountMinor) {
    return NextResponse.json(
      { error: 'Order ID and amount are required' },
      { status: 400 }
    )
  }

  try {
    // Verify order exists and is payable
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        status: true,
        items: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'open' && order.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: 'Order is not payable' },
        { status: 400 }
      )
    }

    const locationId = process.env.SQUARE_LOCATION_ID
    if (!locationId) {
      return NextResponse.json(
        { error: 'Square location not configured' },
        { status: 500 }
      )
    }

    try {
      // Use the Square API client to create a real payment
      const squareClient = createSquareClient()
      
      // For sandbox, use test card nonce if no sourceId provided
      const paymentSourceId = sourceId || SANDBOX_TEST_CARDS.visa_success
      
      // Create payment with Square
      const paymentResult = await squareClient.createPayment({
        sourceId: paymentSourceId,
        amountMoney: {
          amount: amountMinor,
          currency: 'JPY'
        },
        idempotencyKey: `${orderId}_${Date.now()}`,
        locationId,
        referenceId: orderId,
        note: `Order #${orderId.slice(-8).toUpperCase()}`
      })
      
      // Record the payment in our database
      await prisma.payment.create({
        data: {
          orderId,
          method: 'card',
          amountMinor,
          squarePaymentId: paymentResult.payment.id,
          processedAt: new Date(paymentResult.payment.created_at)
        }
      })

      return NextResponse.json({
        success: true,
        paymentId: paymentResult.payment.id,
        status: paymentResult.payment.status,
        message: 'Payment processed successfully',
        receiptUrl: paymentResult.payment.receipt_url,
        cardDetails: paymentResult.payment.card_details ? {
          last4: paymentResult.payment.card_details.card.last_4,
          brand: paymentResult.payment.card_details.card.card_brand
        } : undefined
      })
    } catch (squareError: any) {
      console.error('Square API error:', squareError)
      
      // If it's a configuration error, provide helpful message
      if (squareError.message?.includes('SQUARE_ACCESS_TOKEN')) {
        return NextResponse.json({
          error: 'Square is not properly configured. Please check your environment variables.',
          details: 'Ensure SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are set in .env.local'
        }, { status: 500 })
      }
      
      return NextResponse.json({
        error: squareError.message || 'Failed to process payment'
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    )
  }
}

// GET endpoint to check available test payment methods
export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    testCards: [
      { nonce: 'cnon:card-nonce-ok', description: 'Visa ending in 1111 (approved)' },
      { nonce: 'cnon:card-nonce-declined', description: 'Visa ending in 0002 (declined)' },
      { nonce: 'cnon:card-nonce-expired-card', description: 'Expired card' },
      { nonce: 'cnon:gift-card-nonce-ok', description: 'Gift card (approved)' }
    ],
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    message: 'Use these test nonces for sandbox payments'
  })
}