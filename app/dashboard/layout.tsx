import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'
import { getMembership } from '@/lib/team-access'
import { UruLogo } from '@/components/brand/uru-logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
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

  const membership = await getMembership()
  if (!membership) redirect('/onboarding')

  const business = await getOwnerBusiness()
  if (!business) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <UruLogo variant="isotipo" size="md" href={false} />
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {business.name}
              </span>
              <Badge tone="primary" className="mt-0.5">
                {business.catalog_source === 'shopify'
                  ? 'Shopify'
                  : 'Catálogo propio'}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-muted sm:gap-3">
            <span className="hidden max-w-[160px] truncate md:inline">{user.email}</span>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Salir
              </Button>
            </form>
          </div>
        </div>
        <DashboardNav role={membership.role} />
      </header>
      {children}
    </div>
  )
}
