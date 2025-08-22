import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    // Parse dates and set time boundaries
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Fetch orders within date range
    const orders = await prisma.order.findMany({
      where: {
        status: 'paid',
        closedAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        items: true,
        payments: true
      }
    })

    // Calculate totals
    let totalSales = 0
    const paymentMethods = {
      cash: 0,
      card: 0,
      points: 0
    }
    const categories = {
      retail: 0,
      fnb: 0,
      seatTime: 0,
      rental: 0,
      membership: 0
    }
    const itemSales: { [key: string]: { quantity: number; revenue: number } } = {}

    orders.forEach(order => {
      // Sum up order items
      order.items.forEach(item => {
        totalSales += item.totalMinor
        
        // Track by category
        switch (item.kind) {
          case 'retail':
            categories.retail += item.totalMinor
            break
          case 'fnb':
            categories.fnb += item.totalMinor
            break
          case 'seat_time':
            categories.seatTime += item.totalMinor
            break
          case 'rental':
          case 'rental_deposit':
          case 'rental_fee':
            categories.rental += item.totalMinor
            break
          case 'membership':
            categories.membership += item.totalMinor
            break
        }

        // Track top items
        if (item.kind === 'retail' || item.kind === 'fnb') {
          if (!itemSales[item.name]) {
            itemSales[item.name] = { quantity: 0, revenue: 0 }
          }
          itemSales[item.name].quantity += item.qty
          itemSales[item.name].revenue += item.totalMinor
        }
      })

      // Track payment methods
      order.payments.forEach(payment => {
        if (payment.status === 'succeeded') {
          switch (payment.method) {
            case 'cash':
              paymentMethods.cash += payment.amountMinor
              break
            case 'square_terminal':
              paymentMethods.card += payment.amountMinor
              break
            case 'points':
              paymentMethods.points += payment.amountMinor
              break
          }
        }
      })
    })

    // Get top selling items
    const topItems = Object.entries(itemSales)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const averageOrderValue = orders.length > 0 ? Math.round(totalSales / orders.length) : 0

    return NextResponse.json({
      date: startDate === endDate ? startDate : `${startDate} to ${endDate}`,
      totalSales,
      orderCount: orders.length,
      averageOrderValue,
      paymentMethods,
      categories,
      topItems
    })
  } catch (error) {
    console.error('Error generating sales report:', error)
    return NextResponse.json(
      { error: 'Failed to generate sales report' },
      { status: 500 }
    )
  }
}