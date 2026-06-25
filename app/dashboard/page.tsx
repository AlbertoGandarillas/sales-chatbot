import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'

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

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-600">{hint}</p>}
    </div>
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
    monthUsage,
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
      .from('usage_logs')
      .select('estimated_cost_usd')
      .eq('business_id', business.id)
      .gte('created_at', monthStart),
  ])

  const conversations = recentConversations.data ?? []
  const orders = recentOrders.data ?? []
  const monthlyCost = (monthUsage.data ?? []).reduce(
    (sum, row) => sum + Number(row.estimated_cost_usd ?? 0),
    0
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900">Resumen</h1>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Pedidos pendientes" value={String(pendingCount.count ?? 0)} />
        <Card label="Pedidos del mes" value={String(monthOrdersCount.count ?? 0)} />
        <Card
          label="Costo estimado del mes"
          value={`$ ${monthlyCost.toFixed(4)}`}
          hint="OpenAI (se llena con el uso del agente)"
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Conversaciones recientes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-600">
            Conversaciones recientes
          </h2>
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
                Aún no hay conversaciones.
              </p>
            ) : (
              conversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/conversaciones/${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300 hover:bg-stone-50"
                >
                  <div>
                    <p className="font-medium text-stone-900">{c.customer_phone}</p>
                    <p className="text-xs text-stone-600">{formatDate(c.updated_at)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.mode === 'human'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {c.mode === 'human' ? 'Humano' : 'Bot'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Pedidos recientes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-600">
            Pedidos recientes
          </h2>
          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
                Aún no hay pedidos.
              </p>
            ) : (
              orders.map((o) => {
                const inner = (
                  <>
                    <div>
                      <p className="font-medium text-stone-900">
                        {o.is_custom_order ? 'Encargo especial' : 'Pedido'}
                      </p>
                      <p className="text-xs text-stone-600">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-stone-900">
                        {o.is_custom_order ? '—' : formatSoles(Number(o.total_soles))}
                      </p>
                      <p className="text-xs text-stone-600">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </p>
                    </div>
                  </>
                )
                return o.conversation_id ? (
                  <Link
                    key={o.id}
                    href={`/dashboard/conversaciones/${o.conversation_id}`}
                    className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300 hover:bg-stone-50"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4"
                  >
                    {inner}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <p className="mt-8 text-sm text-stone-600">
        Gestiona tu catálogo en{' '}
        <Link href="/dashboard/catalogo" className="underline hover:text-stone-600">
          Catálogo
        </Link>{' '}
        o ajusta la info de tu negocio en{' '}
        <Link href="/dashboard/perfil" className="underline hover:text-stone-600">
          Perfil
        </Link>
        .
      </p>
    </main>
  )
}
