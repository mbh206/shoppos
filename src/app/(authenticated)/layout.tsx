import { auth } from '@/lib/auth'
import Navigation from '@/components/Navigation'
import { redirect } from 'next/navigation'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation
        userRole={session.user.role}
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <div className="flex-1 ml-16 lg:ml-48 transition-all duration-300">
        {children}
      </div>
    </div>
  )
}