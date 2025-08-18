import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { items } = body // Array of { itemId, receivedQty, notes }

  try {
    // Get the purchase order
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ingredient: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Start a transaction to update everything atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update each item's received quantity
      for (const item of items) {
        const orderItem = order.items.find(i => i.id === item.itemId)
        if (!orderItem) continue

        // Update the purchase order item
        await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: {
            receivedQty: item.receivedQty,
            notes: item.notes
          }
        })

        // Add to ingredient stock
        if (item.receivedQty > 0) {
          await tx.ingredient.update({
            where: { id: orderItem.ingredientId },
            data: {
              stockQuantity: {
                increment: item.receivedQty
              },
              lastRestocked: new Date()
            }
          })

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              ingredientId: orderItem.ingredientId,
              type: 'purchase',
              quantity: item.receivedQty,
              unitCost: orderItem.unitCost,
              totalCost: Math.round(item.receivedQty * orderItem.unitCost),
              reason: `Purchase Order ${order.orderNumber}`,
              referenceId: order.id,
              referenceType: 'purchase_order',
              performedBy: session.user.id
            }
          })
        }
      }

      // Check if all items are fully received
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id }
      })
      
      const allReceived = updatedItems.every(item => item.receivedQty >= item.quantity)
      const someReceived = updatedItems.some(item => item.receivedQty > 0)

      // Update order status
      const newStatus = allReceived ? 'received' : someReceived ? 'partial' : order.status

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          receivedDate: allReceived ? new Date() : undefined,
          receivedBy: session.user.id
        },
        include: {
          supplier: true,
          items: {
            include: {
              ingredient: true
            }
          }
        }
      })

      return updatedOrder
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error receiving purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to receive purchase order' },
      { status: 500 }
    )
  }
}