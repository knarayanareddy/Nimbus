import { NextRequest, NextResponse } from 'next/server'

// Edge middleware is retained for OpenNext compatibility; Next's Node-only
// proxy convention is not supported by the selected Workers adapter.
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const isDev = process.env.NODE_ENV !== 'production'
  const csp = ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "img-src 'self' data: blob: https:", "font-src 'self' https://fonts.gstatic.com", "object-src 'none'",
    `connect-src 'self' https://*.solana.com wss://*.solana.com${isDev ? ' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*' : ''}`,
    "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"].join('; ')
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] }
