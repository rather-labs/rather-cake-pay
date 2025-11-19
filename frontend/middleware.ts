import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update Supabase session
  const response = await updateSession(request)

  // Get the current wallet address from query params or headers
  // For now, we'll check if it's a dashboard route and verify user exists
  const pathname = request.nextUrl.pathname

  // Skip middleware for public routes
  if (
    pathname === '/' ||
    pathname === '/register' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next')
  ) {
    return response
  }

  // For dashboard routes, check if user exists
  // In a real app, this would get the wallet address from the authenticated session
  // For now, we'll let the client-side handle the redirect
  // This is a placeholder for future wallet auth integration

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

