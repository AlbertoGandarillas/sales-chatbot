'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import {
  confirmPayment,
  sendManualReply,
  setDeliveryDate,
  toggleMode,
  type ReplyState,
} from './actions'

function SubmitButton({
  children,
  className,
  pendingText,
}: {
  children: React.ReactNode
  className: string
  pendingText?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText ?? 'Procesando…' : children}
    </button>
  )
}

export function ModeToggle({
  conversationId,
  mode,
}: {
  conversationId: string
  mode: 'bot' | 'human'
}) {
  const nextMode = mode === 'human' ? 'bot' : 'human'
  return (
    <form action={toggleMode}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="nextMode" value={nextMode} />
      <SubmitButton
        pendingText="Cambiando…"
        className={
          mode === 'human'
            ? 'rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800'
            : 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100'
        }
      >
        {mode === 'human' ? 'Devolver al bot' : 'Pausar bot (tomar control)'}
      </SubmitButton>
    </form>
  )
}

export function ReplyBox({
  conversationId,
  mode,
}: {
  conversationId: string
  mode: 'bot' | 'human'
}) {
  const [state, formAction] = useActionState<ReplyState, FormData>(
    sendManualReply,
    {}
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  if (mode !== 'human') {
    return (
      <div className="border-t border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
        El bot está atendiendo esta conversación. Pulsa{' '}
        <span className="font-medium text-stone-900">
          “Pausar bot (tomar control)”
        </span>{' '}
        arriba para responder tú.
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-stone-200 bg-white px-4 py-3"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2">
        <textarea
          name="text"
          rows={1}
          required
          placeholder="Escribe un mensaje…"
          className="min-h-[42px] flex-1 resize-y rounded-2xl border border-stone-300 px-4 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
        <SubmitButton
          pendingText="Enviando…"
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Enviar
        </SubmitButton>
      </div>
      {state.error && (
        <p className="mt-2 text-sm text-red-700">{state.error}</p>
      )}
    </form>
  )
}

export interface OrderView {
  id: string
  is_custom_order: boolean
  items_summary: string
  total_soles: number
  status: string
  payment_status: string
  estimated_delivery_date: string | null
  payment_confirmed_at: string | null
  payment_note: string | null
}

export function OrderCard({
  order,
  conversationId,
}: {
  order: OrderView
  conversationId: string
}) {
  const paid = order.payment_status === 'paid'
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-stone-900">
            {order.is_custom_order ? 'Encargo especial' : 'Pedido'}
          </p>
          <p className="text-xs text-stone-600">
            {order.items_summary || '—'}
          </p>
        </div>
        <p className="text-sm font-semibold text-stone-900">
          {order.is_custom_order ? '—' : `S/ ${order.total_soles.toFixed(2)}`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
          {order.status}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            paid
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {paid ? 'Pagado' : 'Pago pendiente'}
        </span>
      </div>

      {/* Fecha estimada de entrega */}
      <form action={setDeliveryDate} className="mt-4">
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="conversationId" value={conversationId} />
        <label className="block text-xs font-medium text-stone-700">
          Fecha estimada de entrega
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={order.estimated_delivery_date ?? ''}
            className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
          <SubmitButton
            pendingText="Guardando…"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            Guardar
          </SubmitButton>
        </div>
      </form>

      {/* Confirmación de pago manual */}
      {paid ? (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Pago confirmado
          {order.payment_confirmed_at
            ? ` el ${new Date(order.payment_confirmed_at).toLocaleString('es-PE', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}`
            : ''}
          {order.payment_note ? ` · ${order.payment_note}` : ''}
        </div>
      ) : (
        <form action={confirmPayment} className="mt-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="conversationId" value={conversationId} />
          <label className="block text-xs font-medium text-stone-700">
            Nota de pago (opcional)
          </label>
          <input
            type="text"
            name="note"
            placeholder="Ej. Yape de Juan, código 4521, S/ 45.00"
            className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
          <SubmitButton
            pendingText="Confirmando…"
            className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Confirmar pago
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
