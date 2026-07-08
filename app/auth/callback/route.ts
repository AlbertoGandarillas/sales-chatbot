import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveTenantPostLoginPath } from '@/lib/tenant-routing'

/**
 * Callback de enlaces de correo (confirmación de cuenta, recuperación de contraseña).
 * Soporta PKCE (`?code=...`) y token_hash (`?token_hash=...&type=recovery`).
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
