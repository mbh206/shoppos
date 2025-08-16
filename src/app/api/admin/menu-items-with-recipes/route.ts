import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || !['admin', 'host'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const menuItems = await prisma.menuItem.findMany({
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(menuItems)
  } catch (error) {
    console.error('Error fetching menu items with recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    )
  }
}