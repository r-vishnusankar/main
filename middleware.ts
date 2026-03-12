import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/generate-image(.*)'
])

const bypassAuth = process.env.DISABLE_AUTH === 'true'

export default clerkMiddleware(async (auth, req) => {
  if (bypassAuth) return // Skip Clerk protection when DISABLE_AUTH=true
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
