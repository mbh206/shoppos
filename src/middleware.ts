import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')
  const isWebhookRoute = req.nextUrl.pathname.startsWith('/api/webhooks')

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

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}