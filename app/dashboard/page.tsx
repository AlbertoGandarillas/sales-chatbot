'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

interface OrderItem {
  product_id: string
  name: string
  quantity: number
  unit_price: number
}

interface CustomOrderDetails {
  tipo: string
  tamaño: string
  fecha_entrega: string
  mensaje_en_torta?: string
  notas?: string
}

interface Order {
  id: string
  status: string
  items: OrderItem[]
  total_soles: number
  is_custom_order: boolean
  custom_order_details: CustomOrderDetails | null
  payment_status: string
  delivery_status: string
  created_at: string
}

function formatSoles(amount: number) {
  return `S/ ${amount.toFixed(2)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    unpaid: 'Sin pagar',
    paid: 'Pagado',
    delivered: 'Entregado',
  }
  return labels[status] ?? status
}

function OrderCard({
  order,
  onUpdate,
}: {
  order: Order
  onUpdate: (id: string, fields: Partial<Order>) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)

  async function markPaid() {
    setUpdating(true)
    await onUpdate(order.id, { payment_status: 'paid' })
    setUpdating(false)
  }

  async function markDelivered() {
    setUpdating(true)
    await onUpdate(order.id, { delivery_status: 'delivered' })
    setUpdating(false)
  }

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-stone-500">{formatDate(order.created_at)}</p>
          <p className="font-mono text-xs text-stone-400">{order.id.slice(0, 8)}…</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.is_custom_order && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Encargo especial
            </span>
          )}
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
            {statusLabel(order.status)}
          </span>
        </div>
      </div>

      {order.is_custom_order && order.custom_order_details ? (
        <div className="mb-3 space-y-1 text-sm text-stone-700">
          <p>
            <span className="font-medium">Tipo:</span>{' '}
            {order.custom_order_details.tipo}
          </p>
          <p>
            <span className="font-medium">Tamaño:</span>{' '}
            {order.custom_order_details.tamaño}
          </p>
          <p>
            <span className="font-medium">Entrega:</span>{' '}
            {order.custom_order_details.fecha_entrega}
          </p>
          {order.custom_order_details.mensaje_en_torta && (
            <p>
              <span className="font-medium">Mensaje:</span>{' '}
              {order.custom_order_details.mensaje_en_torta}
            </p>
          )}
          {order.custom_order_details.notas && (
            <p>
              <span className="font-medium">Notas:</span>{' '}
              {order.custom_order_details.notas}
            </p>
          )}
        </div>
      ) : (
        <ul className="mb-3 space-y-1 text-sm text-stone-700">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.quantity}x {item.name} — {formatSoles(item.unit_price * item.quantity)}
            </li>
          ))}
        </ul>
      )}

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span
          className={
            order.payment_status === 'paid'
              ? 'text-green-700'
              : 'text-stone-600'
          }
        >
          Pago: {statusLabel(order.payment_status)}
        </span>
        <span
          className={
            order.delivery_status === 'delivered'
              ? 'text-green-700'
              : 'text-stone-600'
          }
        >
          Entrega: {statusLabel(order.delivery_status)}
        </span>
        {!order.is_custom_order && (
          <span className="font-semibold text-stone-900">
            Total: {formatSoles(Number(order.total_soles))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {order.payment_status !== 'paid' && (
          <button
            type="button"
            disabled={updating}
            onClick={markPaid}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            Marcar pagado
          </button>
        )}
        {order.delivery_status !== 'delivered' && (
          <button
            type="button"
            disabled={updating}
            onClick={markDelivered}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-900 disabled:opacity-50"
          >
            Marcar entregado
          </button>
        )}
      </div>
    </article>
  )
}

export default function DashboardPage() {
  const supabase = useMemo(() => createBrowserSupabase(), [])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'regular' | 'custom'>('all')

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, status, items, total_soles, is_custom_order, custom_order_details, payment_status, delivery_status, created_at'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading orders:', error)
      return
    }

    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadOrders()

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadOrders, supabase])

  async function updateOrder(id: string, fields: Partial<Order>) {
    const { error } = await supabase.from('orders').update(fields).eq('id', id)
    if (error) {
      console.error('Error updating order:', error)
      return
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...fields } : o))
    )
  }

  const filtered = orders.filter((o) => {
    if (filter === 'regular') return !o.is_custom_order
    if (filter === 'custom') return o.is_custom_order
    return true
  })

  const regularCount = orders.filter((o) => !o.is_custom_order).length
  const customCount = orders.filter((o) => o.is_custom_order).length

  return (
    <main className="bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-bold text-stone-900">Pedidos</h1>
        <p className="mt-1 text-sm text-stone-500">
          Dashboard en tiempo real · {orders.length} pedido
          {orders.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ['all', `Todos (${orders.length})`],
              ['regular', `Regulares (${regularCount})`],
              ['custom', `Encargos (${customCount})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-stone-500">Cargando pedidos…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
            No hay pedidos todavía. Cuando lleguen mensajes por WhatsApp,
            aparecerán aquí.
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onUpdate={updateOrder} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
