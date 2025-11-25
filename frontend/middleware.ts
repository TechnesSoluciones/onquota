/**
 * Next.js Middleware
 * Handles route protection
 *
 * NOTE: This middleware is intentionally simplified for development.
 * In development, frontend (localhost:3000) and backend (localhost:8000)
 * are on different domains, so httpOnly cookies set by the backend
 * are not accessible to the Next.js middleware.
 *
 * Authentication is handled client-side via the AuthContext.
 * Protected routes will check authentication state on the client and
 * redirect if needed.
 *
 * In production (same domain), you can enhance this middleware to
 * check httpOnly cookies for additional security.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[Middleware] Processing request for:', pathname)

  // In development, we can't reliably check httpOnly cookies from a different domain
  // So we let all requests through and rely on client-side auth checks
  // The AuthContext will handle redirects appropriately

  // Allow all requests to proceed
  // Client-side AuthContext will handle authentication checks
  return NextResponse.next()
}

/**
 * Matcher configuration
 * Specifies which routes should run through middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)',
  ],
}
