import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'

const NAV = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/dashboard/catalogo', label: 'Catálogo' },
  { href: '/dashboard/perfil', label: 'Perfil' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signup')

  const business = await getOwnerBusiness()
  if (!business) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-stone-900">
              {business.name}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
              {business.vertical === 'retail' ? 'Retail' : 'Panadería'}
            </span>
          </div>
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
        <nav className="flex gap-1 px-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  )
}
