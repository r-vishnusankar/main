import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/generate-image(.*)'
])

// Edge runtime only has NEXT_PUBLIC_* vars; use both for flexibility
const bypassAuth = process.env.DISABLE_AUTH === 'true' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true'

// Allowed origins for CORS when frontend (Netlify) and backend (Render) are split
const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function addCorsHeaders(res: NextResponse, origin: string | null): NextResponse {
  const allowed = origin && corsOrigins.some((o) => origin === o || o === '*')
  const allowOrigin = allowed ? origin! : corsOrigins[0]
  res.headers.set('Access-Control-Allow-Origin', allowOrigin)
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export default clerkMiddleware(async (auth, req) => {
  if (corsOrigins.length > 0 && req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 })
      addCorsHeaders(res, origin)
      res.headers.set('Access-Control-Max-Age', '86400')
      return res
    }
  }

  if (bypassAuth) return NextResponse.next()
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
