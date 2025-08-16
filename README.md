# KOMA POS - Custom Café/Retail POS System

Square-integrated POS system for café and retail operations with seat timers, online pickup, rentals, and events.

## Features

### P0 - Core Features (Implemented)
- ✅ Floor Map with Tables/Seats management
- ✅ Seat Timer functionality with automatic billing
- ✅ Order Composer for counter operations
- ✅ Authentication with role-based access (admin, host, server, kitchen)
- ✅ Order management with items and totals

### In Progress
- Online Pickup Queue with webhook handling
- Square Terminal + Cash checkout
- Printing support with ESC/POS
- Catalog & Inventory sync from Square

### P1 - Additional Features (Planned)
- Rentals system with deposits
- Events & Tickets management
- Customer profiles (Square CRM integration)

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Square Sandbox account (for testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your PostgreSQL database and update `.env.local`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/shoppos?schema=public"
```

3. Run database migrations:
```bash
npm run db:push
```

4. Seed the database with test data:
```bash
npm run db:seed
```

This creates test users:
- admin@example.com / admin123
- host@example.com / host123
- server@example.com / server123
- kitchen@example.com / kitchen123

5. Start the development server:
```bash
npm run dev
```

6. Access the application at http://localhost:3000

## Square Integration

To enable Square features:

1. Create a Square Sandbox account
2. Get your credentials from Square Dashboard
3. Update `.env.local` with:
   - SQUARE_ACCESS_TOKEN
   - SQUARE_APPLICATION_ID
   - SQUARE_LOCATION_ID
   - SQUARE_WEBHOOK_SIGNATURE_KEY
   - SQUARE_DEVICE_ID (for Terminal)

## Database Management

- View database: `npm run db:studio`
- Create migration: `npm run db:migrate`
- Push schema changes: `npm run db:push`
- Seed data: `npm run db:seed`

## Application Structure

- `/login` - Authentication page
- `/dashboard` - Role-based redirect
- `/floor` - Floor map with tables (host/server)
- `/floor/table/[id]` - Table detail with seats
- `/orders` - Order management
- `/orders/[id]` - Order detail with composer
- `/admin` - Admin panel (coming soon)

## API Endpoints

- `GET /api/floor` - Get all tables with seats
- `GET/PATCH /api/tables/[id]` - Manage table status
- `PATCH /api/seats/[id]` - Update seat status
- `POST/DELETE /api/seats/[id]/timer` - Start/stop seat timer
- `GET/POST /api/orders` - List/create orders
- `GET/PATCH /api/orders/[id]` - Get/update order
- `POST/DELETE /api/orders/[id]/items` - Add/remove items

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Square SDK
- NextAuth (Auth.js)
- Tailwind CSS

## Timezone

All server-side time calculations use Asia/Tokyo timezone (configured in .env.local).

## Development Notes

- Money values are stored as integer minor units (¥1 = 100 minor units)
- Square remains source of truth for catalog, inventory, and customers
- Local database mirrors necessary data for performance
- All financial transactions are logged in OrderEvent table