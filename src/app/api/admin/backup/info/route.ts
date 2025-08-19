import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get counts for all tables
    const [
      userCount,
      customerCount,
      orderCount,
      orderItemCount,
      tableCount,
      seatCount,
      seatSessionCount,
      gameCount,
      gameSessionCount,
      gameRentalCount,
      menuCategoryCount,
      menuItemCount,
      ingredientCount,
      stockMovementCount,
      supplierCount,
      purchaseOrderCount,
      retailItemCount,
      employeeProfileCount,
      timeEntryCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.table.count(),
      prisma.seat.count(),
      prisma.seatSession.count(),
      prisma.game.count(),
      prisma.tableGameSession.count(),
      prisma.gameRental.count(),
      prisma.menuCategory.count(),
      prisma.menuItem.count(),
      prisma.ingredient.count(),
      prisma.stockMovement.count(),
      prisma.supplier.count(),
      prisma.purchaseOrder.count(),
      prisma.retailItem.count(),
      prisma.employeeProfile.count(),
      prisma.timeEntry.count()
    ])

    const totalRecords = userCount + customerCount + orderCount + orderItemCount +
      tableCount + seatCount + seatSessionCount + gameCount + gameSessionCount +
      gameRentalCount + menuCategoryCount + menuItemCount + ingredientCount +
      stockMovementCount + supplierCount + purchaseOrderCount + retailItemCount +
      employeeProfileCount + timeEntryCount

    // Estimate sizes (very rough estimates)
    const avgRecordSize = 500 // bytes
    const estimatedSizes = {
      sql: Math.round(totalRecords * avgRecordSize * 1.2 / 1024 / 1024), // MB, with overhead
      json: Math.round(totalRecords * avgRecordSize * 1.5 / 1024 / 1024), // MB, JSON is larger
      csv: Math.round(totalRecords * avgRecordSize * 0.8 / 1024 / 1024), // MB, CSV is compact
      excel: Math.round(totalRecords * avgRecordSize * 1.0 / 1024 / 1024), // MB
    }

    return NextResponse.json({
      totalRecords,
      tableCounts: {
        users: userCount,
        customers: customerCount,
        orders: orderCount,
        orderItems: orderItemCount,
        tables: tableCount,
        seats: seatCount,
        seatSessions: seatSessionCount,
        games: gameCount,
        gameSessions: gameSessionCount,
        gameRentals: gameRentalCount,
        menuCategories: menuCategoryCount,
        menuItems: menuItemCount,
        ingredients: ingredientCount,
        stockMovements: stockMovementCount,
        suppliers: supplierCount,
        purchaseOrders: purchaseOrderCount,
        retailItems: retailItemCount,
        employeeProfiles: employeeProfileCount,
        timeEntries: timeEntryCount
      },
      estimatedSizes,
      lastBackup: null // Could track this in the future
    })
  } catch (error) {
    console.error('Error getting backup info:', error)
    return NextResponse.json(
      { error: 'Failed to get backup information' },
      { status: 500 }
    )
  }
}