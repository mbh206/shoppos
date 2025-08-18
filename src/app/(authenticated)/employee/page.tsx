import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TimeClockWidget from '@/components/TimeClockWidget'

export default async function EmployeeDashboard() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Employee Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {session.user.name || session.user.email}</p>
      </div>

      {/* Time Clock Widget */}
      <div className="mb-6">
        <TimeClockWidget userName={session.user.name} userEmail={session.user.email} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/floor"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Floor Map</h2>
          <p className="text-gray-600">View and manage table assignments</p>
        </Link>

        <Link
          href="/orders"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Orders</h2>
          <p className="text-gray-600">View active orders and process payments</p>
        </Link>

        <Link
          href="/games"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Games Library</h2>
          <p className="text-gray-600">Browse and check out games</p>
        </Link>

        <Link
          href="/employee/schedule"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">My Schedule</h2>
          <p className="text-gray-600">View your work schedule</p>
        </Link>

        <Link
          href="/employee/timesheet"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Time Records</h2>
          <p className="text-gray-600">View your time entries and hours</p>
        </Link>

        <Link
          href="/employee/profile"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">My Profile</h2>
          <p className="text-gray-600">Update your personal information</p>
        </Link>
      </div>

      {/* Today's Stats */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Today's Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Orders Processed</div>
            <div className="text-2xl font-bold">0</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Tables Served</div>
            <div className="text-2xl font-bold">0</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Hours Worked</div>
            <div className="text-2xl font-bold">0.0</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Break Time</div>
            <div className="text-2xl font-bold">0m</div>
          </div>
        </div>
      </div>
    </div>
  )
}