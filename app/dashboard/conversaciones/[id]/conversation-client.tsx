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
import { Badge, Button, Input } from '@/components/ui'
import type { ButtonProps } from '@/components/ui'

function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText ?? 'Procesando…' : children}
    </Button>
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
        size="sm"
        pendingText="Cambiando…"
        className="border-0 bg-surface text-foreground hover:bg-surface-muted"
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
      <div className="border-t border-border bg-surface px-4 py-3 text-sm text-muted">
        El bot está atendiendo esta conversación. Pulsa{' '}
        <span className="font-medium text-foreground">
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
      className="border-t border-border bg-surface px-4 py-3"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2">
        <textarea
          name="text"
          rows={1}
          required
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje para el cliente"
          className="min-h-[42px] flex-1 resize-y rounded-2xl border border-border-strong bg-surface px-4 py-2 text-sm text-foreground transition-colors placeholder:text-muted focus-visible:border-primary"
        />
        <SubmitButton variant="success" pendingText="Enviando…" className="rounded-2xl">
          Enviar
        </SubmitButton>
      </div>
      {state.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
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
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {order.is_custom_order ? 'Encargo especial' : 'Pedido'}
          </p>
          <p className="text-xs text-muted">{order.items_summary || '—'}</p>
        </div>
        <p className="text-sm font-semibold text-foreground">
          {order.is_custom_order ? '—' : `S/ ${order.total_soles.toFixed(2)}`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="neutral">{order.status}</Badge>
        <Badge tone={paid ? 'success' : 'warning'} dot>
          {paid ? 'Pagado' : 'Pago pendiente'}
        </Badge>
      </div>

      {/* Fecha estimada de entrega */}
      <form action={setDeliveryDate} className="mt-4">
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="conversationId" value={conversationId} />
        <label
          htmlFor={`date-${order.id}`}
          className="block text-xs font-medium text-foreground"
        >
          Fecha estimada de entrega
        </label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            id={`date-${order.id}`}
            type="date"
            name="date"
            defaultValue={order.estimated_delivery_date ?? ''}
            className="h-9 w-auto"
          />
          <SubmitButton variant="outline" size="sm" pendingText="Guardando…">
            Guardar
          </SubmitButton>
        </div>
      </form>

      {/* Confirmación de pago manual */}
      {paid ? (
        <div className="mt-4 rounded-lg bg-success-surface px-3 py-2 text-xs text-success">
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
          <label
            htmlFor={`note-${order.id}`}
            className="block text-xs font-medium text-foreground"
          >
            Nota de pago (opcional)
          </label>
          <Input
            id={`note-${order.id}`}
            type="text"
            name="note"
            placeholder="Ej. Yape de Juan, código 4521, S/ 45.00"
            className="mt-1 h-9"
          />
          <SubmitButton variant="success" size="sm" pendingText="Confirmando…" className="mt-2">
            Confirmar pago
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
