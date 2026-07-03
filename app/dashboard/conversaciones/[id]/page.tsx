import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { summarizeRecurringItems } from '@/lib/recurring-orders'
import {
  ModeToggle,
  OrderCard,
  ReplyBox,
  ConversationMessages,
  type OrderView,
} from './conversation-client'
import { Badge } from '@/components/ui'

export const maxDuration = 30

interface MessageRow {
  id: string
  role: 'user' | 'assistant' | 'human_agent' | 'tool'
  content: string
  created_at: string
}

interface OrderRow {
  id: string
  is_custom_order: boolean
  items: { quantity: number; name: string }[] | null
  custom_order_details: { tipo?: string; tamaño?: string } | null
  total_soles: number
  status: string
  payment_status: string
  delivery_status: string
  estimated_delivery_date: string | null
  payment_confirmed_at: string | null
  payment_note: string | null
  notes: string | null
}

function summarizeOrder(o: OrderRow): string {
  if (o.is_custom_order && o.custom_order_details) {
    return `Encargo: ${o.custom_order_details.tipo ?? ''} ${
      o.custom_order_details.tamaño ? `(${o.custom_order_details.tamaño})` : ''
    }`.trim()
  }
  return (o.items ?? []).map((i) => `${i.quantity}x ${i.name}`).join(', ')
}

export default async function ConversationDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  // RLS limita esta lectura al negocio del dueño autenticado.
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, customer_phone, mode, status, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!conversation) notFound()

  const [{ data: messageData }, { data: orderData }, { data: recurringData }] =
    await Promise.all([
    supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select(
        'id, is_custom_order, items, custom_order_details, total_soles, status, payment_status, delivery_status, estimated_delivery_date, payment_confirmed_at, payment_note, notes'
      )
      .eq('conversation_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('recurring_orders')
      .select('id, status, frequency, next_run_on, items')
      .eq('customer_phone', conversation.customer_phone)
      .in('status', ['active', 'paused']),
  ])

  const messages = (messageData ?? []) as MessageRow[]
  const orders = (orderData ?? []) as OrderRow[]
  const recurringActive = (recurringData ?? []).filter((r) => r.status === 'active')
  const mode = (conversation.mode as 'bot' | 'human') ?? 'bot'

  const orderViews: OrderView[] = orders.map((o) => ({
    id: o.id,
    is_custom_order: o.is_custom_order,
    items_summary: summarizeOrder(o),
    total_soles: Number(o.total_soles),
    status: o.status,
    payment_status: o.payment_status,
    delivery_status: o.delivery_status,
    estimated_delivery_date: o.estimated_delivery_date,
    payment_confirmed_at: o.payment_confirmed_at,
    payment_note: o.payment_note,
    notes: o.notes,
  }))

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
      {/* Columna del chat */}
      <section className="flex h-[75vh] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        {/* Encabezado tipo WhatsApp */}
        <header className="flex items-center justify-between gap-3 border-b border-border bg-wa-header px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/conversaciones"
              className="rounded-full bg-white/15 px-2 py-1 text-sm hover:bg-white/25"
              aria-label="Volver a conversaciones"
            >
              ←
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {conversation.customer_phone.slice(-2)}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                {conversation.customer_phone}
              </p>
              <p className="text-xs text-primary-foreground/80">
                {mode === 'human' ? 'Atención humana' : 'Atendido por el bot'}
              </p>
              {recurringActive.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {recurringActive.map((r) => (
                    <Link key={r.id} href="/dashboard/recurrentes">
                      <Badge tone="success" className="text-[10px]">
                        Recurrente · {summarizeRecurringItems(
                          (r.items ?? []) as { quantity: number; name: string }[]
                        )}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <ModeToggle conversationId={id} mode={mode} />
        </header>

        <ConversationMessages messages={messages} />

        {/* Caja de respuesta manual */}
        <ReplyBox conversationId={id} mode={mode} />
      </section>

      {/* Columna de pedidos */}
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Pedidos de esta conversación
        </h2>
        {orderViews.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted">
            Sin pedidos asociados.
          </p>
        ) : (
          orderViews.map((o) => (
            <OrderCard key={o.id} order={o} conversationId={id} />
          ))
        )}
      </aside>
    </main>
  )
}
