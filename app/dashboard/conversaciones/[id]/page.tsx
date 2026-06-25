import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  ModeToggle,
  OrderCard,
  ReplyBox,
  type OrderView,
} from './conversation-client'

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
  estimated_delivery_date: string | null
  payment_confirmed_at: string | null
  payment_note: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

  const [{ data: messageData }, { data: orderData }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select(
        'id, is_custom_order, items, custom_order_details, total_soles, status, payment_status, estimated_delivery_date, payment_confirmed_at, payment_note'
      )
      .eq('conversation_id', id)
      .order('created_at', { ascending: false }),
  ])

  const messages = (messageData ?? []) as MessageRow[]
  const orders = (orderData ?? []) as OrderRow[]
  const mode = (conversation.mode as 'bot' | 'human') ?? 'bot'

  const orderViews: OrderView[] = orders.map((o) => ({
    id: o.id,
    is_custom_order: o.is_custom_order,
    items_summary: summarizeOrder(o),
    total_soles: Number(o.total_soles),
    status: o.status,
    payment_status: o.payment_status,
    estimated_delivery_date: o.estimated_delivery_date,
    payment_confirmed_at: o.payment_confirmed_at,
    payment_note: o.payment_note,
  }))

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
      {/* Columna del chat */}
      <section className="flex h-[75vh] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {/* Encabezado tipo WhatsApp */}
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-emerald-700 px-4 py-3 text-white">
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
              <p className="text-xs text-emerald-50">
                {mode === 'human' ? 'Atención humana' : 'Atendido por el bot'}
              </p>
            </div>
          </div>
          <ModeToggle conversationId={id} mode={mode} />
        </header>

        {/* Mensajes */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-4 py-4">
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-stone-600">
              Sin mensajes todavía.
            </p>
          ) : (
            messages.map((m) => {
              const incoming = m.role === 'user'
              const isHuman = m.role === 'human_agent'
              return (
                <div
                  key={m.id}
                  className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      incoming
                        ? 'rounded-tl-sm bg-white text-stone-900'
                        : isHuman
                          ? 'rounded-tr-sm bg-emerald-200 text-stone-900'
                          : 'rounded-tr-sm bg-[#d9fdd3] text-stone-900'
                    }`}
                  >
                    {!incoming && (
                      <p className="mb-0.5 text-[11px] font-semibold text-emerald-800">
                        {isHuman ? 'Equipo' : 'Bot'}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap wrap-break-word">{m.content}</p>
                    <p className="mt-1 text-right text-[10px] text-stone-600">
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Caja de respuesta manual */}
        <ReplyBox conversationId={id} mode={mode} />
      </section>

      {/* Columna de pedidos */}
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
          Pedidos de esta conversación
        </h2>
        {orderViews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
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
