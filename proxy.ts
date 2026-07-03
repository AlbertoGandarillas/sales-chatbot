import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveTenantPostLoginPath } from '@/lib/tenant-routing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresca la sesión (rota tokens si hace falta) y la deja en cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Admin: sin sesión → /admin/login (excepto la propia página de login)
  if (path.startsWith('/admin') && path !== '/admin/login' && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Proteger rutas autenticadas tenant: sin sesión → /login
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/onboarding') ||
    path === '/reset-password'

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Sesión activa en /login o /signup → dashboard u onboarding según negocio vinculado.
  if (user && (path === '/signup' || path === '/login')) {
    const destination = await resolveTenantPostLoginPath(supabase)
    const url = request.nextUrl.clone()
    url.pathname = destination
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Dueño con negocio no debe ver onboarding.
  if (user && path.startsWith('/onboarding')) {
    const destination = await resolveTenantPostLoginPath(supabase, '/onboarding')
    if (destination !== '/onboarding') {
      const url = request.nextUrl.clone()
      url.pathname = destination
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/reset-password',
    '/signup',
    '/login',
    '/admin/:path*',
  ],
}
