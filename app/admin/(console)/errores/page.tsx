import Link from 'next/link'
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui'
import { listErrorLogs } from '@/lib/admin-data'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const LEVEL_TONE: Record<string, 'danger' | 'warning' | 'neutral' | 'primary'> = {
  error: 'danger',
  warning: 'warning',
  info: 'primary',
  debug: 'neutral',
}

export default async function AdminErroresPage() {
  const errors = await listErrorLogs({ limit: 100 })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Errores"
        description="Logs del sistema (observabilidad custom). Ordenados por más recientes."
      />

      <div className="mt-6 space-y-2">
        {errors.length === 0 ? (
          <EmptyState
            title="Sin errores registrados"
            description="Cuando ocurra un fallo en webhook, agente o cron, aparecerá aquí."
          />
        ) : (
          errors.map((row) => (
            <Link key={row.id} href={`/admin/errores/${row.id}`}>
              <Card className="p-4 transition-colors hover:border-border-strong hover:bg-surface-muted">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{row.message}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(row.created_at)} · {row.source}
                      {row.business_id ? ` · negocio ${row.business_id.slice(0, 8)}…` : ''}
                    </p>
                  </div>
                  <Badge tone={LEVEL_TONE[row.level] ?? 'neutral'}>{row.level}</Badge>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
