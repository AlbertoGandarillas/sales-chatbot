import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

export interface PlatformAdminSession {
  userId: string
  email: string
}

export async function getPlatformAdminSession(): Promise<PlatformAdminSession | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) return null

  return { userId: admin.user_id, email: admin.email }
}

export async function requirePlatformAdmin(): Promise<PlatformAdminSession> {
  const session = await getPlatformAdminSession()
  if (!session) redirect('/admin/login')
  return session
}

export async function requirePlatformAdminWithClient() {
  const supabase = await createServerSupabase()
  const session = await getPlatformAdminSession()
  if (!session) redirect('/admin/login')
  return { supabase, session }
}
