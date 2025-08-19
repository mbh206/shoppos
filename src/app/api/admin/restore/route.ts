import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { parse } from 'csv-parse/sync'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import AdmZip from 'adm-zip'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const format = formData.get('format') as string
    const clearExisting = formData.get('clearExisting') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create temp directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const tempDir = path.join(os.tmpdir(), `restore-${timestamp}`)
    await fs.mkdir(tempDir, { recursive: true })

    try {
      // Save uploaded file
      const buffer = Buffer.from(await file.arrayBuffer())
      const tempFilePath = path.join(tempDir, file.name)
      await fs.writeFile(tempFilePath, buffer)

      // Validate backup file
      const validation = await validateBackup(tempFilePath, format)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid backup file' },
          { status: 400 }
        )
      }

      // Create a database backup before restore (safety measure)
      const safetyBackup = await createSafetyBackup()

      // Clear existing data if requested
      if (clearExisting) {
        await clearDatabase()
      }

      // Restore based on format
      let result: RestoreResult
      switch (format) {
        case 'sql':
          result = await restoreFromSQL(tempFilePath)
          break
        case 'json':
          result = await restoreFromJSON(tempFilePath)
          break
        case 'csv':
          result = await restoreFromCSV(tempFilePath)
          break
        case 'excel':
          result = await restoreFromExcel(tempFilePath)
          break
        default:
          throw new Error('Unsupported format')
      }

      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true })

      return NextResponse.json({
        success: true,
        ...result,
        safetyBackup
      })
    } catch (error) {
      // Cleanup temp directory on error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
      throw error
    }
  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to restore backup' },
      { status: 500 }
    )
  }
}

interface RestoreResult {
  tablesRestored: string[]
  recordsRestored: number
  warnings: string[]
  errors: string[]
}

async function validateBackup(filepath: string, format: string): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (format) {
      case 'sql':
        const sqlContent = await fs.readFile(filepath, 'utf-8')
        if (!sqlContent.includes('INSERT INTO') && !sqlContent.includes('CREATE TABLE')) {
          return { valid: false, error: 'SQL file does not contain valid database statements' }
        }
        return { valid: true }

      case 'json':
        const jsonContent = await fs.readFile(filepath, 'utf-8')
        const data = JSON.parse(jsonContent)
        if (typeof data !== 'object' || !data) {
          return { valid: false, error: 'Invalid JSON structure' }
        }
        return { valid: true }

      case 'csv':
        // Check if it's a valid zip file
        try {
          const zip = new AdmZip(filepath)
          const entries = zip.getEntries()
          if (entries.length === 0) {
            return { valid: false, error: 'ZIP file is empty' }
          }
          return { valid: true }
        } catch {
          return { valid: false, error: 'Invalid ZIP file' }
        }

      case 'excel':
        try {
          const workbook = XLSX.readFile(filepath)
          if (workbook.SheetNames.length === 0) {
            return { valid: false, error: 'Excel file has no sheets' }
          }
          return { valid: true }
        } catch {
          return { valid: false, error: 'Invalid Excel file' }
        }

      default:
        return { valid: false, error: 'Unknown format' }
    }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}

async function createSafetyBackup(): Promise<string> {
  // Create a quick JSON backup before restore
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const backupPath = path.join(os.tmpdir(), `safety-backup-${timestamp}.json`)
  
  const data = await fetchAllData()
  await fs.writeFile(backupPath, JSON.stringify(data, null, 2))
  
  return backupPath
}

async function clearDatabase() {
  // Clear all tables in correct order (respecting foreign keys)
  await prisma.$transaction([
    // Clear dependent tables first
    prisma.orderEvent.deleteMany(),
    prisma.paymentAttempt.deleteMany(),
    prisma.eventTicket.deleteMany(),
    prisma.timeEntry.deleteMany(),
    prisma.employeeProfile.deleteMany(),
    prisma.inventorySnapshot.deleteMany(),
    prisma.inventoryReservation.deleteMany(),
    prisma.inventoryCount.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.menuItemIngredient.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.gameRental.deleteMany(),
    prisma.tableGameSession.deleteMany(),
    prisma.seatSession.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    
    // Then clear main tables
    prisma.rental.deleteMany(),
    prisma.retailItem.deleteMany(),
    prisma.supply.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.ingredient.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.menuCategory.deleteMany(),
    prisma.game.deleteMany(),
    prisma.seat.deleteMany(),
    prisma.table.deleteMany(),
    prisma.event.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.catalogCache.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

async function restoreFromSQL(filepath: string): Promise<RestoreResult> {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://mark@localhost:5432/shoppos?schema=public'
  
  try {
    // Try to use psql to restore
    await execAsync(`psql "${dbUrl}" < "${filepath}"`)
    
    // Count restored records
    const counts = await getRecordCounts()
    
    return {
      tablesRestored: Object.keys(counts),
      recordsRestored: Object.values(counts).reduce((a, b) => a + b, 0),
      warnings: [],
      errors: []
    }
  } catch (error: any) {
    // If psql fails, try to parse and execute statements manually
    const sqlContent = await fs.readFile(filepath, 'utf-8')
    const statements = sqlContent.split(';').filter(s => s.trim())
    
    let recordsRestored = 0
    const errors: string[] = []
    const tablesRestored = new Set<string>()
    
    for (const statement of statements) {
      if (statement.trim().startsWith('INSERT INTO')) {
        try {
          // Extract table name
          const tableMatch = statement.match(/INSERT INTO "?(\w+)"?/i)
          if (tableMatch) {
            tablesRestored.add(tableMatch[1])
          }
          
          // Execute raw SQL
          await prisma.$executeRawUnsafe(statement)
          recordsRestored++
        } catch (err: any) {
          errors.push(`Failed to execute: ${statement.substring(0, 50)}... - ${err.message}`)
        }
      }
    }
    
    return {
      tablesRestored: Array.from(tablesRestored),
      recordsRestored,
      warnings: ['Used fallback SQL restoration method'],
      errors
    }
  }
}

async function restoreFromJSON(filepath: string): Promise<RestoreResult> {
  const jsonContent = await fs.readFile(filepath, 'utf-8')
  const data = JSON.parse(jsonContent)
  
  let recordsRestored = 0
  const errors: string[] = []
  const warnings: string[] = []
  const tablesRestored: string[] = []
  
  // Define the correct order for restoration (respecting foreign keys)
  const restoreOrder = [
    'users',
    'customers',
    'catalogCache',
    'events',
    'tables',
    'seats',
    'games',
    'menuCategories',
    'menuItems',
    'ingredients',
    'suppliers',
    'supplies',
    'retailItems',
    'rentals',
    'orders',
    'orderItems',
    'seatSessions',
    'gameSessions',
    'gameRentals',
    'menuItemIngredients',
    'stockMovements',
    'purchaseOrders',
    'purchaseOrderItems',
    'inventorySnapshots',
    'inventoryReservations',
    'inventoryCounts',
    'employeeProfiles',
    'timeEntries',
    'eventTickets',
    'paymentAttempts',
    'orderEvents',
  ]
  
  for (const tableName of restoreOrder) {
    if (data[tableName] && Array.isArray(data[tableName]) && data[tableName].length > 0) {
      try {
        const records = data[tableName]
        const prismaModel = getModelFromTableName(tableName)
        
        if (prismaModel) {
          // Process records to handle dates and special fields
          const processedRecords = records.map((record: any) => {
            const processed = { ...record }
            
            // Remove password field for users (will be re-hashed if needed)
            if (tableName === 'users' && processed.hashedPassword === '[REDACTED]') {
              processed.hashedPassword = '$2a$10$dummyHashedPasswordToBeReset'
              warnings.push('User passwords need to be reset')
            }
            
            // Convert date strings back to Date objects
            Object.keys(processed).forEach(key => {
              if (typeof processed[key] === 'string' && 
                  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(processed[key])) {
                processed[key] = new Date(processed[key])
              }
            })
            
            return processed
          })
          
          // Use createMany for bulk insert
          await prismaModel.createMany({
            data: processedRecords,
            skipDuplicates: true
          })
          
          recordsRestored += processedRecords.length
          tablesRestored.push(tableName)
        }
      } catch (error: any) {
        errors.push(`Failed to restore ${tableName}: ${error.message}`)
      }
    }
  }
  
  return {
    tablesRestored,
    recordsRestored,
    warnings,
    errors
  }
}

async function restoreFromCSV(filepath: string): Promise<RestoreResult> {
  const zip = new AdmZip(filepath)
  const entries = zip.getEntries()
  
  let recordsRestored = 0
  const errors: string[] = []
  const warnings: string[] = []
  const tablesRestored: string[] = []
  
  for (const entry of entries) {
    if (entry.entryName.endsWith('.csv')) {
      const tableName = path.basename(entry.entryName, '.csv')
      const csvContent = zip.readAsText(entry)
      
      try {
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true
        })
        
        if (records.length > 0) {
          const prismaModel = getModelFromTableName(tableName)
          
          if (prismaModel) {
            // Process records to handle data types
            const processedRecords = records.map((record: any) => {
              const processed: any = {}
              
              Object.keys(record).forEach(key => {
                let value = record[key]
                
                // Handle null values
                if (value === '' || value === 'null' || value === 'NULL') {
                  processed[key] = null
                }
                // Handle booleans
                else if (value === 'true' || value === 'false') {
                  processed[key] = value === 'true'
                }
                // Handle numbers
                else if (!isNaN(value) && value !== '') {
                  processed[key] = Number(value)
                }
                // Handle dates
                else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                  processed[key] = new Date(value)
                }
                // Handle JSON
                else if ((value.startsWith('{') && value.endsWith('}')) || 
                        (value.startsWith('[') && value.endsWith(']'))) {
                  try {
                    processed[key] = JSON.parse(value)
                  } catch {
                    processed[key] = value
                  }
                }
                else {
                  processed[key] = value
                }
              })
              
              return processed
            })
            
            await prismaModel.createMany({
              data: processedRecords,
              skipDuplicates: true
            })
            
            recordsRestored += processedRecords.length
            tablesRestored.push(tableName)
          }
        }
      } catch (error: any) {
        errors.push(`Failed to restore ${tableName}: ${error.message}`)
      }
    }
  }
  
  return {
    tablesRestored,
    recordsRestored,
    warnings,
    errors
  }
}

async function restoreFromExcel(filepath: string): Promise<RestoreResult> {
  const workbook = XLSX.readFile(filepath)
  
  let recordsRestored = 0
  const errors: string[] = []
  const warnings: string[] = []
  const tablesRestored: string[] = []
  
  for (const sheetName of workbook.SheetNames) {
    try {
      const worksheet = workbook.Sheets[sheetName]
      const records = XLSX.utils.sheet_to_json(worksheet)
      
      if (records.length > 0) {
        const prismaModel = getModelFromTableName(sheetName)
        
        if (prismaModel) {
          // Process records to handle Excel date serial numbers
          const processedRecords = records.map((record: any) => {
            const processed: any = {}
            
            Object.keys(record).forEach(key => {
              let value = record[key]
              
              // Handle Excel date serial numbers
              if (typeof value === 'number' && key.toLowerCase().includes('date') || 
                  key.toLowerCase().includes('at')) {
                // Excel stores dates as numbers
                processed[key] = new Date((value - 25569) * 86400 * 1000)
              }
              // Handle booleans
              else if (value === true || value === false) {
                processed[key] = value
              }
              // Handle null
              else if (value === null || value === '') {
                processed[key] = null
              }
              // Parse JSON strings
              else if (typeof value === 'string' && 
                      ((value.startsWith('{') && value.endsWith('}')) || 
                       (value.startsWith('[') && value.endsWith(']')))) {
                try {
                  processed[key] = JSON.parse(value)
                } catch {
                  processed[key] = value
                }
              }
              else {
                processed[key] = value
              }
            })
            
            return processed
          })
          
          await prismaModel.createMany({
            data: processedRecords,
            skipDuplicates: true
          })
          
          recordsRestored += processedRecords.length
          tablesRestored.push(sheetName)
        }
      }
    } catch (error: any) {
      errors.push(`Failed to restore ${sheetName}: ${error.message}`)
    }
  }
  
  return {
    tablesRestored,
    recordsRestored,
    warnings,
    errors
  }
}

function getModelFromTableName(tableName: string): any {
  const modelMap: Record<string, any> = {
    'users': prisma.user,
    'User': prisma.user,
    'customers': prisma.customer,
    'Customer': prisma.customer,
    'orders': prisma.order,
    'Order': prisma.order,
    'orderItems': prisma.orderItem,
    'OrderItem': prisma.orderItem,
    'tables': prisma.table,
    'Table': prisma.table,
    'seats': prisma.seat,
    'Seat': prisma.seat,
    'seatSessions': prisma.seatSession,
    'SeatSession': prisma.seatSession,
    'games': prisma.game,
    'Game': prisma.game,
    'gameSessions': prisma.tableGameSession,
    'TableGameSession': prisma.tableGameSession,
    'gameRentals': prisma.gameRental,
    'GameRental': prisma.gameRental,
    'menuCategories': prisma.menuCategory,
    'MenuCategory': prisma.menuCategory,
    'menuItems': prisma.menuItem,
    'MenuItem': prisma.menuItem,
    'ingredients': prisma.ingredient,
    'Ingredient': prisma.ingredient,
    'menuItemIngredients': prisma.menuItemIngredient,
    'MenuItemIngredient': prisma.menuItemIngredient,
    'stockMovements': prisma.stockMovement,
    'StockMovement': prisma.stockMovement,
    'suppliers': prisma.supplier,
    'Supplier': prisma.supplier,
    'purchaseOrders': prisma.purchaseOrder,
    'PurchaseOrder': prisma.purchaseOrder,
    'purchaseOrderItems': prisma.purchaseOrderItem,
    'PurchaseOrderItem': prisma.purchaseOrderItem,
    'supplies': prisma.supply,
    'Supply': prisma.supply,
    'retailItems': prisma.retailItem,
    'RetailItem': prisma.retailItem,
    'inventorySnapshots': prisma.inventorySnapshot,
    'InventorySnapshot': prisma.inventorySnapshot,
    'employeeProfiles': prisma.employeeProfile,
    'EmployeeProfile': prisma.employeeProfile,
    'timeEntries': prisma.timeEntry,
    'TimeEntry': prisma.timeEntry,
    'events': prisma.event,
    'Event': prisma.event,
    'eventTickets': prisma.eventTicket,
    'EventTicket': prisma.eventTicket,
    'paymentAttempts': prisma.paymentAttempt,
    'PaymentAttempt': prisma.paymentAttempt,
    'orderEvents': prisma.orderEvent,
    'OrderEvent': prisma.orderEvent,
    'rentals': prisma.rental,
    'Rental': prisma.rental,
    'inventoryReservations': prisma.inventoryReservation,
    'InventoryReservation': prisma.inventoryReservation,
    'inventoryCounts': prisma.inventoryCount,
    'InventoryCount': prisma.inventoryCount,
    'catalogCache': prisma.catalogCache,
    'CatalogCache': prisma.catalogCache,
  }
  
  return modelMap[tableName]
}

async function getRecordCounts() {
  const counts = await Promise.all([
    prisma.user.count().then(c => ({ users: c })),
    prisma.customer.count().then(c => ({ customers: c })),
    prisma.order.count().then(c => ({ orders: c })),
    prisma.orderItem.count().then(c => ({ orderItems: c })),
    prisma.table.count().then(c => ({ tables: c })),
    prisma.seat.count().then(c => ({ seats: c })),
    prisma.game.count().then(c => ({ games: c })),
    prisma.menuCategory.count().then(c => ({ menuCategories: c })),
    prisma.menuItem.count().then(c => ({ menuItems: c })),
    prisma.ingredient.count().then(c => ({ ingredients: c })),
    prisma.supplier.count().then(c => ({ suppliers: c })),
    prisma.retailItem.count().then(c => ({ retailItems: c })),
  ])
  
  return Object.assign({}, ...counts)
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
  }
}