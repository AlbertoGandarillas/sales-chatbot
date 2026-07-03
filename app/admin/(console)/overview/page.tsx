import { Card, PageHeader } from '@/components/ui'
import { getAdminOverviewStats } from '@/lib/admin-data'

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  )
}

export default async function AdminOverviewPage() {
  const stats = await getAdminOverviewStats()

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Overview"
        description="Pulso de la plataforma Uru (últimas 24 h y mes en curso)."
      />
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Negocios activos" value={String(stats.businessCount)} />
        <MetricCard
          label="Errores / warnings (24 h)"
          value={String(stats.errors24h)}
        />
        <MetricCard label="Mensajes (24 h)" value={String(stats.messages24h)} />
        <MetricCard
          label="Costo OpenAI (mes)"
          value={`$${stats.monthCostUsd.toFixed(4)}`}
          hint="Suma de usage_logs del mes"
        />
      </section>
    </main>
  )
}
