import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import * as XLSX from 'xlsx'
import archiver from 'archiver'
import { createWriteStream } from 'fs'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'sql'

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const tempDir = path.join(os.tmpdir(), `backup-${timestamp}`)
    await fs.mkdir(tempDir, { recursive: true })

    let filename: string
    let content: Buffer
    let contentType: string

    switch (format) {
      case 'sql':
        const result = await createSQLBackup(tempDir, timestamp)
        filename = result.filename
        content = result.content
        contentType = 'application/sql'
        break

      case 'json':
        const jsonResult = await createJSONBackup(tempDir, timestamp)
        filename = jsonResult.filename
        content = jsonResult.content
        contentType = 'application/json'
        break

      case 'csv':
        const csvResult = await createCSVBackup(tempDir, timestamp)
        filename = csvResult.filename
        content = csvResult.content
        contentType = 'application/zip'
        break

      case 'excel':
        const excelResult = await createExcelBackup(tempDir, timestamp)
        filename = excelResult.filename
        content = excelResult.content
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break

      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true })

    // Return the file
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString(),
      },
    })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    )
  }
}

async function createSQLBackup(tempDir: string, timestamp: string) {
  const filename = `shoppos-backup-${timestamp}.sql`
  const filepath = path.join(tempDir, filename)
  
  // Get database URL from environment
  const dbUrl = process.env.DATABASE_URL || 'postgresql://mark@localhost:5432/shoppos?schema=public'
  
  try {
    // Try to find pg_dump in common locations
    const pgDumpPaths = [
      'pg_dump',
      '/usr/local/bin/pg_dump',
      '/opt/homebrew/bin/pg_dump',
      '/usr/bin/pg_dump',
      '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump'
    ]
    
    let pgDumpCommand = 'pg_dump'
    for (const path of pgDumpPaths) {
      try {
        await execAsync(`which ${path}`)
        pgDumpCommand = path
        break
      } catch {
        // Try next path
      }
    }
    
    // Execute pg_dump
    await execAsync(`${pgDumpCommand} "${dbUrl}" > "${filepath}"`)
    const content = await fs.readFile(filepath)
    return { filename, content }
  } catch (error: any) {
    // If pg_dump fails, fall back to JSON export with schema-like structure
    console.warn('pg_dump not found, falling back to structured JSON export')
    
    // Create a SQL-like export using Prisma data
    const data = await fetchAllData()
    
    let sqlContent = `-- ShopPOS Database Backup\n`
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`
    sqlContent += `-- Note: This is a data-only backup. Schema must be recreated separately.\n\n`
    
    // Generate INSERT statements for each table
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records) && records.length > 0) {
        sqlContent += `\n-- Table: ${tableName}\n`
        sqlContent += `-- Records: ${records.length}\n`
        
        for (const record of records as any[]) {
          const columns = Object.keys(record).join(', ')
          const values = Object.values(record).map(v => {
            if (v === null) return 'NULL'
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
            if (v instanceof Date) return `'${v.toISOString()}'`
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
            return v
          }).join(', ')
          
          sqlContent += `INSERT INTO "${tableName}" (${columns}) VALUES (${values});\n`
        }
      }
    }
    
    const content = Buffer.from(sqlContent)
    return { filename, content }
  }
}

async function createJSONBackup(tempDir: string, timestamp: string) {
  const filename = `shoppos-backup-${timestamp}.json`
  
  // Fetch all data from database
  const data = await fetchAllData()
  
  const content = Buffer.from(JSON.stringify(data, null, 2))
  return { filename, content }
}

async function createCSVBackup(tempDir: string, timestamp: string) {
  const filename = `shoppos-backup-${timestamp}.zip`
  const filepath = path.join(tempDir, filename)
  
  // Fetch all data
  const data = await fetchAllData()
  
  // Create CSV files for each table
  const createCsvWriter = require('csv-writer').createObjectCsvWriter
  
  for (const [tableName, records] of Object.entries(data)) {
    if (Array.isArray(records) && records.length > 0) {
      const csvPath = path.join(tempDir, `${tableName}.csv`)
      const headers = Object.keys(records[0]).map(key => ({ id: key, title: key }))
      
      const csvWriter = createCsvWriter({
        path: csvPath,
        header: headers
      })
      
      await csvWriter.writeRecords(records)
    }
  }
  
  // Create zip archive
  await createZipArchive(tempDir, filepath, '*.csv')
  
  const content = await fs.readFile(filepath)
  return { filename, content }
}

async function createExcelBackup(tempDir: string, timestamp: string) {
  const filename = `shoppos-backup-${timestamp}.xlsx`
  
  // Fetch all data
  const data = await fetchAllData()
  
  // Create workbook
  const workbook = XLSX.utils.book_new()
  
  for (const [tableName, records] of Object.entries(data)) {
    if (Array.isArray(records) && records.length > 0) {
      // Convert records to worksheet
      const worksheet = XLSX.utils.json_to_sheet(records)
      
      // Add worksheet to workbook (truncate sheet name if too long)
      const sheetName = tableName.substring(0, 31)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }
  }
  
  // Write workbook to buffer instead of file
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  
  return { filename, content: Buffer.from(buffer) }
}

async function fetchAllData() {
  const [
    users,
    customers,
    orders,
    orderItems,
    tables,
    seats,
    seatSessions,
    games,
    gameSessions,
    gameRentals,
    menuCategories,
    menuItems,
    ingredients,
    menuItemIngredients,
    stockMovements,
    suppliers,
    purchaseOrders,
    purchaseOrderItems,
    supplies,
    retailItems,
    inventorySnapshots,
    employeeProfiles,
    timeEntries,
    events,
    eventTickets,
    paymentAttempts,
    orderEvents,
    rentals,
    inventoryReservations,
    inventoryCounts,
    catalogCache
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.table.findMany(),
    prisma.seat.findMany(),
    prisma.seatSession.findMany(),
    prisma.game.findMany(),
    prisma.tableGameSession.findMany(),
    prisma.gameRental.findMany(),
    prisma.menuCategory.findMany(),
    prisma.menuItem.findMany(),
    prisma.ingredient.findMany(),
    prisma.menuItemIngredient.findMany(),
    prisma.stockMovement.findMany(),
    prisma.supplier.findMany(),
    prisma.purchaseOrder.findMany(),
    prisma.purchaseOrderItem.findMany(),
    prisma.supply.findMany(),
    prisma.retailItem.findMany(),
    prisma.inventorySnapshot.findMany(),
    prisma.employeeProfile.findMany(),
    prisma.timeEntry.findMany(),
    prisma.event.findMany(),
    prisma.eventTicket.findMany(),
    prisma.paymentAttempt.findMany(),
    prisma.orderEvent.findMany(),
    prisma.rental.findMany(),
    prisma.inventoryReservation.findMany(),
    prisma.inventoryCount.findMany(),
    prisma.catalogCache.findMany()
  ])

  return {
    users: users.map(u => ({ ...u, hashedPassword: '[REDACTED]' })), // Remove passwords
    customers,
    orders,
    orderItems,
    tables,
    seats,
    seatSessions,
    games,
    gameSessions,
    gameRentals,
    menuCategories,
    menuItems,
    ingredients,
    menuItemIngredients,
    stockMovements,
    suppliers,
    purchaseOrders,
    purchaseOrderItems,
    supplies,
    retailItems,
    inventorySnapshots,
    employeeProfiles,
    timeEntries,
    events,
    eventTickets,
    paymentAttempts,
    orderEvents,
    rentals,
    inventoryReservations,
    inventoryCounts,
    catalogCache
  }
}

async function createZipArchive(sourceDir: string, outputPath: string, pattern: string) {
  return new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', (err) => reject(err))

    archive.pipe(output)
    archive.glob(pattern, { cwd: sourceDir })
    archive.finalize()
  })
}