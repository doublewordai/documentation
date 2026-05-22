import {NextRequest, NextResponse} from 'next/server'

// Per-request nonce CSP.
//
// A nonce must be unique per response, so the Content-Security-Policy header is
// built here (not in next.config.ts headers(), which is static). Next.js reads
// the nonce from the request's CSP header and stamps it onto every script tag
// it renders; `'strict-dynamic'` then lets those trusted scripts load their own
// chunks (Next bundles, Vercel Analytics, PostHog) without host allowlisting.
//
// Trade-off: emitting a per-request nonce opts every route into dynamic
// rendering (no full-route static cache). Accepted here in exchange for
// dropping `'unsafe-inline'` from script-src and getting real XSS containment.
//
// The non-CSP security headers stay in next.config.ts (they're static).
//
// `style-src` keeps `'unsafe-inline'`: Tailwind/Next emit inline styles, and
// inline styles are not a script-execution vector. `frame-src` allows the
// Sanity-authored video embeds; `connect-src 'self'` covers PostHog via the
// /ingest rewrite.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.sanity.io",
    "font-src 'self' data:",
    "connect-src 'self'",
    'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com',
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)

  // Forward the nonce + CSP on the request so Next.js stamps the nonce onto the
  // scripts it renders for this response.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({request: {headers: requestHeaders}})
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    // Run on documents, skip static assets / image optimizer / favicon, and
    // skip prefetches (no nonce needed, and matching them would thrash the
    // dynamic-rendering cache).
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        {type: 'header', key: 'next-router-prefetch'},
        {type: 'header', key: 'purpose', value: 'prefetch'},
      ],
    },
  ],
}
