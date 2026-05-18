import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routen-Definition
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/tenant-register',
  '/impressum',
  '/datenschutz',
]

const TENANT_ONLY_ROUTES = ['/tenant-portal']

// Diese Routen erfordern Login (Vermieter ODER Mieter)
const AUTH_REQUIRED_ROUTES = [
  '/dashboard',
  '/properties',
  '/units',
  '/tenants',
  '/contracts',
  '/payments',
  '/kosten',
  '/guv',
  '/nebenkostenabrechnung',
  '/tickets',
  '/invite-tenant',
  '/import',
  '/pricing',
  '/profile',
  '/role-select',
  '/tenant-portal',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static files & API routes überspringen
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // .svg, .ico, etc.
  ) {
    return NextResponse.next()
  }

  // Public routes durchlassen
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Auth-Check nur für geschützte Routen
  const needsAuth = AUTH_REQUIRED_ROUTES.some(r => pathname.startsWith(r))
  if (!needsAuth) {
    return NextResponse.next()
  }

  // Supabase Server Client erstellen
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Nicht eingeloggt → Login mit Redirect-Back
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files (svg, png, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}