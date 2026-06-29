import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui'

function formatSoles(amount: number) {
  return `S/ ${amount.toFixed(2)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

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

export default async function DashboardResumen() {
  const business = await getOwnerBusiness()
  if (!business) return null
  const supabase = await createServerSupabase()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    recentConversations,
    recentOrders,
    pendingCount,
    monthOrdersCount,
    monthSalesOrders,
    unpaidPaymentsCount,
  ] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, customer_phone, mode, status, updated_at')
      .eq('business_id', business.id)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('orders')
      .select(
        'id, status, total_soles, is_custom_order, payment_status, conversation_id, created_at'
      )
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', monthStart),
    supabase
      .from('orders')
      .select('total_soles, is_custom_order, status')
      .eq('business_id', business.id)
      .gte('created_at', monthStart)
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('payment_status', 'unpaid')
      .neq('status', 'cancelled'),
  ])

  const conversations = recentConversations.data ?? []
  const orders = recentOrders.data ?? []
  const monthSalesTotal = (monthSalesOrders.data ?? []).reduce(
    (sum, row) => sum + (row.is_custom_order ? 0 : Number(row.total_soles ?? 0)),
    0
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Resumen" description="Actividad reciente de tu negocio." />

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Pedidos pendientes" value={String(pendingCount.count ?? 0)} />
        <MetricCard label="Pedidos del mes" value={String(monthOrdersCount.count ?? 0)} />
        <MetricCard
          label="Ventas del mes"
          value={formatSoles(monthSalesTotal)}
          hint={
            (unpaidPaymentsCount.count ?? 0) > 0
              ? `${unpaidPaymentsCount.count} pago(s) por confirmar`
              : 'Pedidos con precio fijo (sin cancelados)'
          }
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Conversaciones recientes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Conversaciones recientes
            </h2>
            <Link
              href="/dashboard/conversaciones"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <EmptyState title="Aún no hay conversaciones" description="Cuando un cliente escriba por WhatsApp, aparecerá aquí." />
            ) : (
              conversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/conversaciones/${c.id}`}
                  className="flex items-center justify-between rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-muted"
                >
                  <div>
                    <p className="font-medium text-foreground">{c.customer_phone}</p>
                    <p className="text-xs text-muted">{formatDate(c.updated_at)}</p>
                  </div>
                  <Badge tone={c.mode === 'human' ? 'warning' : 'neutral'} dot>
                    {c.mode === 'human' ? 'Humano' : 'Bot'}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Pedidos recientes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Pedidos recientes
          </h2>
          <div className="space-y-2">
            {orders.length === 0 ? (
              <EmptyState title="Aún no hay pedidos" description="Los pedidos que tome el bot aparecerán aquí." />
            ) : (
              orders.map((o) => {
                const inner = (
                  <>
                    <div>
                      <p className="font-medium text-foreground">
                        {o.is_custom_order ? 'Encargo especial' : 'Pedido'}
                      </p>
                      <p className="text-xs text-muted">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {o.is_custom_order ? '—' : formatSoles(Number(o.total_soles))}
                      </p>
                      <p className="text-xs text-muted">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </p>
                    </div>
                  </>
                )
                return o.conversation_id ? (
                  <Link
                    key={o.id}
                    href={`/dashboard/conversaciones/${o.conversation_id}`}
                    className="flex items-center justify-between rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-muted"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-card border border-border bg-surface p-4"
                  >
                    {inner}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
