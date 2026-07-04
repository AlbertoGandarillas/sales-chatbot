import { redirect } from 'next/navigation'
import { getPlatformAdminSession } from '@/lib/admin-auth'
import { Badge, Button } from '@/components/ui'
import { AdminNav } from '../admin-nav'

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getPlatformAdminSession()
  if (!session) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--btn-primary-bg)] text-sm font-bold text-[var(--btn-primary-fg)]">
              U
            </span>
            <span className="text-sm font-semibold text-foreground">Uru Admin</span>
            <Badge tone="warning">Admin</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="hidden max-w-[200px] truncate sm:inline">{session.email}</span>
            <form action="/auth/signout" method="post">
              <input type="hidden" name="next" value="/admin/login" />
              <Button type="submit" variant="outline" size="sm">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      {children}
    </div>
  )
}
