import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Sandbox mode - simulate terminal operations without Square SDK
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { orderId, amountMinor, action } = body

  if (!orderId || !action) {
    return NextResponse.json(
      { error: 'Order ID and action are required' },
      { status: 400 }
    )
  }

  try {
    switch (action) {
      case 'create_checkout': {
        if (!amountMinor) {
          return NextResponse.json(
            { error: 'Amount is required for checkout' },
            { status: 400 }
          )
        }

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

        // Calculate order total to verify amount
        const orderTotal = order.items.reduce((sum, item) => sum + item.totalMinor, 0)
        if (amountMinor > orderTotal) {
          return NextResponse.json(
            { error: 'Payment amount exceeds order total' },
            { status: 400 }
          )
        }

        // For sandbox mode, simulate terminal checkout creation
        const simulatedCheckoutId = `sim_checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Create payment attempt record
        const paymentAttempt = await prisma.paymentAttempt.create({
          data: {
            orderId,
            method: 'square_terminal',
            amountMinor,
            status: 'pending',
            metadata: {
              initiatedBy: session.user.id,
              initiatedAt: new Date().toISOString(),
              squareCheckoutId: simulatedCheckoutId,
              sandboxMode: true
            }
          }
        })

        return NextResponse.json({
          success: true,
          checkoutId: simulatedCheckoutId,
          paymentAttemptId: paymentAttempt.id,
          message: 'Sandbox checkout created. Simulating terminal payment...',
          sandboxMode: true
        })
      }

      case 'check_status': {
        const { checkoutId, paymentAttemptId } = body

        if (!checkoutId || !paymentAttemptId) {
          return NextResponse.json(
            { error: 'Checkout ID and payment attempt ID are required' },
            { status: 400 }
          )
        }

        // Get payment attempt
        const paymentAttempt = await prisma.paymentAttempt.findUnique({
          where: { id: paymentAttemptId }
        })

        if (!paymentAttempt) {
          return NextResponse.json(
            { error: 'Payment attempt not found' },
            { status: 404 }
          )
        }

        // For sandbox mode, auto-complete after a short delay
        const metadata = paymentAttempt.metadata as any
        const initiatedAt = new Date(metadata.initiatedAt)
        const now = new Date()
        const elapsedSeconds = (now.getTime() - initiatedAt.getTime()) / 1000

        let status = 'processing'
        let squareStatus = 'IN_PROGRESS'

        // Simulate processing time (5 seconds)
        if (elapsedSeconds >= 5) {
          status = 'succeeded'
          squareStatus = 'COMPLETED'

          // If not already marked as succeeded, update the payment attempt
          if (paymentAttempt.status !== 'succeeded') {
            await prisma.paymentAttempt.update({
              where: { id: paymentAttemptId },
              data: {
                status: 'succeeded',
                processedAt: new Date(),
                metadata: {
                  ...metadata,
                  completedAt: new Date().toISOString(),
                  squarePaymentId: `sim_payment_${Date.now()}`
                }
              }
            })
          }
        }

        return NextResponse.json({
          status,
          paymentAttemptId,
          checkoutId,
          squareStatus,
          sandboxMode: true,
          message: status === 'succeeded' 
            ? 'Payment completed (sandbox simulation)' 
            : 'Processing payment (sandbox simulation)...'
        })
      }

      case 'cancel_checkout': {
        const { checkoutId, paymentAttemptId } = body

        if (!checkoutId || !paymentAttemptId) {
          return NextResponse.json(
            { error: 'Checkout ID and payment attempt ID are required' },
            { status: 400 }
          )
        }

        // Update payment attempt to cancelled
        await prisma.paymentAttempt.update({
          where: { id: paymentAttemptId },
          data: {
            status: 'cancelled',
            metadata: {
              cancelledBy: session.user.id,
              cancelledAt: new Date().toISOString()
            }
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Checkout cancelled (sandbox mode)'
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Square Terminal error:', error)
    return NextResponse.json(
      { error: 'Failed to process Square Terminal request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if Square Terminal is configured
  const isConfigured = !!(
    process.env.SQUARE_APPLICATION_ID &&
    process.env.SQUARE_ACCESS_TOKEN &&
    process.env.SQUARE_LOCATION_ID &&
    process.env.SQUARE_DEVICE_ID
  )

  // For sandbox mode, simulate device being connected
  const deviceStatus = isConfigured ? 'simulated' : 'not_configured'

  return NextResponse.json({
    configured: isConfigured,
    status: isConfigured ? 'ready' : 'not_configured',
    deviceStatus,
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    sandboxMode: true,
    message: isConfigured 
      ? 'Square Terminal is configured in sandbox mode (virtual device)'
      : 'Square Terminal requires configuration. Please set up Square credentials in environment variables.'
  })
}