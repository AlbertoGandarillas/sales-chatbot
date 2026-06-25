import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'
import { Badge, Button } from '@/components/ui'
import { DashboardNav } from './dashboard-nav'

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {business.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {business.name}
            </span>
            <Badge tone="primary">
              {business.vertical === 'retail' ? 'Retail' : 'Panadería'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="hidden max-w-[180px] truncate sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
        <DashboardNav />
      </header>
      {children}
    </div>
  )
}
