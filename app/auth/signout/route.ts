import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()

  const formData = await request.formData().catch(() => null)
  const nextPath = formData?.get('next')
  const redirectTo =
    typeof nextPath === 'string' && nextPath.startsWith('/')
      ? nextPath
      : '/login'

  return NextResponse.redirect(`${request.nextUrl.origin}${redirectTo}`, {
    status: 303,
  })
}
