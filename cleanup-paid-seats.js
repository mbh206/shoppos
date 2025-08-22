const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupPaidSeats() {
  try {
    // Find all seats that are occupied
    const occupiedSeats = await prisma.seat.findMany({
      where: { status: 'occupied' },
      include: {
        seatSessions: {
          include: {
            order: true
          }
        }
      }
    });

    console.log(`Found ${occupiedSeats.length} occupied seats`);
    
    let clearedCount = 0;
    
    for (const seat of occupiedSeats) {
      // Check if all sessions for this seat have paid orders
      const hasUnpaidSession = seat.seatSessions.some(session => 
        session.order.status === 'open' || 
        session.order.status === 'awaiting_payment'
      );
      
      if (!hasUnpaidSession && seat.seatSessions.length > 0) {
        // All sessions are paid, clear the seat
        await prisma.seat.update({
          where: { id: seat.id },
          data: { status: 'open' }
        });
        
        console.log(`Cleared seat ${seat.number} (all orders paid)`);
        clearedCount++;
      }
    }
    
    console.log(`\nCleared ${clearedCount} seats that had paid orders`);
    
    // Also check for any tables that should be marked as available
    const tables = await prisma.table.findMany({
      where: { status: 'seated' },
      include: {
        seats: true
      }
    });
    
    let tablesCleared = 0;
    
    for (const table of tables) {
      const hasOccupiedSeats = table.seats.some(seat => seat.status === 'occupied');
      
      if (!hasOccupiedSeats) {
        await prisma.table.update({
          where: { id: table.id },
          data: { status: 'available' }
        });
        
        console.log(`Marked table ${table.name} as available`);
        tablesCleared++;
      }
    }
    
    console.log(`\nMarked ${tablesCleared} tables as available`);
    
  } catch (error) {
    console.error('Error cleaning up seats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupPaidSeats();