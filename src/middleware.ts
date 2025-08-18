import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getRequiredRole, hasRole } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')
  const isWebhookRoute = req.nextUrl.pathname.startsWith('/api/webhooks')
  const pathname = req.nextUrl.pathname

  // Allow webhook routes without authentication
  if (isWebhookRoute) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated and not on login page
  if (!isLoggedIn && !isOnLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to dashboard if authenticated and on login page
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Check role-based access for authenticated users
  if (isLoggedIn && req.auth?.user) {
    const userRole = req.auth.user.role as UserRole
    const requiredRole = getRequiredRole(pathname)
    
    if (requiredRole && !hasRole(userRole, requiredRole)) {
      // Redirect to appropriate dashboard based on role
      let redirectPath = '/dashboard'
      
      if (userRole === 'admin') {
        redirectPath = '/admin'
      } else if (hasRole(userRole, 'manager')) {
        redirectPath = '/manager'
      } else {
        redirectPath = '/employee'
      }
      
      // Only redirect if not already on the redirect path
      if (!pathname.startsWith(redirectPath)) {
        return NextResponse.redirect(new URL(redirectPath, req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}