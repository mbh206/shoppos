import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PointsTransactionType } from '@prisma/client'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { customerId, amount, reason } = body

    // Validate customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, pointsBalance: true }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if adjustment would result in negative balance
    const newBalance = customer.pointsBalance + amount
    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Adjustment would result in negative balance' },
        { status: 400 }
      )
    }

    // Create transaction and update balance
    const result = await prisma.$transaction(async (tx) => {
      // Create points transaction
      const transaction = await tx.pointsTransaction.create({
        data: {
          customerId,
          type: amount > 0 ? PointsTransactionType.ADJUSTMENT_ADD : PointsTransactionType.ADJUSTMENT_SUBTRACT,
          amount: Math.abs(amount),
          balanceAfter: newBalance,
          description: `Manual adjustment: ${reason}`,
          metadata: {
            adjustedBy: session.user.id,
            reason
          }
        }
      })

      // Update customer balance
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newBalance }
      })

      return { transaction, customer: updatedCustomer }
    })

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      newBalance: result.customer.pointsBalance
    })
  } catch (error) {
    console.error('Error adjusting points:', error)
    return NextResponse.json(
      { error: 'Failed to adjust points' },
      { status: 500 }
    )
  }
}