import { auth } from '@/lib/auth'
import Navigation from './Navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="flex">
      <Navigation
        userRole={session.user.role}
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <div className="flex-1 ml-64">
        {children}
      </div>
    </div>
  )
}