import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
  const session = await auth()
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { tables } = body

    if (!tables || !Array.isArray(tables)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Use a transaction to update all tables
    await prisma.$transaction(async (tx) => {
      // Group tables by floor
      const tablesByFloor = tables.reduce((acc: any, table: any) => {
        const floor = table.floor || 1
        if (!acc[floor]) acc[floor] = []
        acc[floor].push(table)
        return acc
      }, {})

      // Process each floor
      for (const [floor, floorTables] of Object.entries(tablesByFloor)) {
        const floorNum = parseInt(floor)
        
        // Get existing tables on this floor
        const existingTablesOnFloor = await tx.table.findMany({
          where: { floor: floorNum }
        })

        // Track which existing tables are being kept
        const keptTableIds = new Set<string>()

        // Process each table in the update
        for (const table of floorTables as any[]) {
          if (table.id.startsWith('temp_')) {
            // This is a new table, create it
            const newTable = await tx.table.create({
              data: {
                name: table.name,
                capacity: table.capacity,
                floor: table.floor,
                zone: table.zone,
                shape: table.shape,
                posX: table.posX,
                posY: table.posY,
                width: table.width,
                height: table.height,
                rotation: table.rotation,
                status: table.status || 'available',
              },
            })

            // Create seats for the new table
            for (let i = 1; i <= table.capacity; i++) {
              await tx.seat.create({
                data: {
                  tableId: newTable.id,
                  number: i,
                  status: 'open',
                },
              })
            }
          } else {
            // This is an existing table, update it
            keptTableIds.add(table.id)
            
            await tx.table.update({
              where: { id: table.id },
              data: {
                name: table.name,
                capacity: table.capacity,
                floor: table.floor,
                zone: table.zone,
                shape: table.shape,
                posX: table.posX,
                posY: table.posY,
                width: table.width,
                height: table.height,
                rotation: table.rotation,
              },
            })

            // Update seats if capacity changed
            const existingSeats = await tx.seat.findMany({
              where: { tableId: table.id },
            })

            if (existingSeats.length !== table.capacity) {
              // Delete all existing seats
              await tx.seat.deleteMany({
                where: { tableId: table.id },
              })

              // Create new seats with correct capacity
              for (let i = 1; i <= table.capacity; i++) {
                await tx.seat.create({
                  data: {
                    tableId: table.id,
                    number: i,
                    status: 'open',
                  },
                })
              }
            }
          }
        }

        // Delete tables that were on this floor but are not in the update
        // This handles tables that were deleted in the UI
        for (const existingTable of existingTablesOnFloor) {
          if (!keptTableIds.has(existingTable.id)) {
            // Delete seats first
            await tx.seat.deleteMany({
              where: { tableId: existingTable.id },
            })
            // Then delete the table
            await tx.table.delete({
              where: { id: existingTable.id },
            })
          }
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating tables:', error)
    return NextResponse.json(
      { error: 'Failed to update tables' },
      { status: 500 }
    )
  }
}