import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    // Clear the auth session cookie
    const cookieStore = await cookies()
    cookieStore.delete('authjs.session-token')
    cookieStore.delete('__Secure-authjs.session-token')
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
  }
}