import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FloorMap from '@/components/FloorMap'

export default async function FloorPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Allow all authenticated users to access floor map
  // Floor map is a core POS feature needed by all staff

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <FloorMap />
      </div>
    </div>
  )
}