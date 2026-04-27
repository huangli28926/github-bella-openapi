import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default async function middleware(request: NextRequest) {
  return createMiddleware(routing)(request)
}

export const config = {
  matcher: [
    '/((?!api/|_next|_vercel|v1|console|openapi|.*\\..*).*)',
  ]
}
