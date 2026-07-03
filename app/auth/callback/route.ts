import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveTenantPostLoginPath } from '@/lib/tenant-routing'

/**
 * Callback del magic link. Soporta dos formatos de Supabase:
 *  - PKCE:        /auth/callback?code=...
 *  - token_hash:  /auth/callback?token_hash=...&type=magiclink
 * Tras establecer la sesión, redirige a `next` (o /dashboard).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = searchParams.get('next') ?? '/dashboard'
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createServerSupabase()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const destination = await resolveTenantPostLoginPath(supabase, next)
      return NextResponse.redirect(`${origin}${destination}`)
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      const destination = await resolveTenantPostLoginPath(supabase, next)
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
