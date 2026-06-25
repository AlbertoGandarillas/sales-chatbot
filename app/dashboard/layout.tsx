import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .maybeSingle()

  // Sin negocio asociado → onboarding (se implementa en M5).
  if (!business) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
        <span className="text-sm font-semibold text-stone-900">
          {business.name}
        </span>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <span className="hidden sm:inline">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-100"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  )
}
