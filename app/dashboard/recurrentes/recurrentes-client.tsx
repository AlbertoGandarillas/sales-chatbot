'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import {
  saveRecurringOrder,
  setRecurringStatus,
  generateRecurringOrderNow,
  sendRecurringReminderNow,
  type RecurringState,
} from './actions'
import {
  FREQUENCY_LABELS,
  formatRecurringSchedule,
  summarizeRecurringItems,
  todayInLima,
  type RecurringFrequency,
  type RecurringOrderItem,
} from '@/lib/recurring-orders'
import { Alert, Badge, Button, Field, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'

export interface RecurringOrderView {
  id: string
  customer_phone: string
  customer_name: string | null
  status: 'active' | 'paused' | 'cancelled'
  frequency: RecurringFrequency
  day_of_week: number | null
  day_of_month: number | null
  next_run_on: string
  items: RecurringOrderItem[]
  notes: string | null
}

interface ProductOption {
  id: string
  name: string
  price_soles: number
}

const initialState: RecurringState = { error: null, ok: false }

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

type Filter = 'all' | 'active' | 'paused' | 'upcoming'

function statusBadge(status: RecurringOrderView['status']) {
  if (status === 'active') return <Badge tone="success">Activo</Badge>
  if (status === 'paused') return <Badge tone="warning">Pausado</Badge>
  return <Badge tone="neutral">Cancelado</Badge>
}

function ItemEditor({
  products,
  items,
  onChange,
}: {
  products: ProductOption[]
  items: RecurringOrderItem[]
  onChange: (items: RecurringOrderItem[]) => void
}) {
  function updateRow(index: number, patch: Partial<RecurringOrderItem>) {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  function addRow() {
    const first = products[0]
    if (!first) return
    onChange([
      ...items,
      { product_id: first.id, name: first.name, quantity: 1 },
    ])
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted">
        Agrega productos disponibles al catálogo primero.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((row, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <Field label={index === 0 ? 'Producto' : undefined} htmlFor={`item-${index}`}>
            <select
              id={`item-${index}`}
              className="min-w-[180px] rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={row.product_id}
              onChange={(e) => {
                const product = products.find((p) => p.id === e.target.value)
                if (product) {
                  updateRow(index, {
                    product_id: product.id,
                    name: product.name,
                  })
                }
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={index === 0 ? 'Cant.' : undefined} htmlFor={`qty-${index}`}>
            <Input
              id={`qty-${index}`}
              type="number"
              min={1}
              className="w-20"
              value={row.quantity}
              onChange={(e) =>
                updateRow(index, { quantity: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </Field>
          {items.length > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={() => removeRow(index)}>
              Quitar
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + Producto
      </Button>
    </div>
  )
}

function RecurringForm({
  recurring,
  products,
  onDone,
}: {
  recurring?: RecurringOrderView
  products: ProductOption[]
  onDone: () => void
}) {
  const [state, formAction, pending] = useActionState(saveRecurringOrder, initialState)
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    recurring?.frequency ?? 'weekly'
  )
  const [items, setItems] = useState<RecurringOrderItem[]>(
    recurring?.items?.length
      ? recurring.items
      : products[0]
        ? [{ product_id: products[0].id, name: products[0].name, quantity: 1 }]
        : []
  )

  useEffect(() => {
    if (state.ok) onDone()
  }, [state.ok, onDone])

  const defaultDayOfWeek =
    recurring?.day_of_week ?? (new Date().getDay() === 0 ? 1 : new Date().getDay())

  return (
    <form action={formAction} className="space-y-3 rounded-card border border-border-strong bg-surface-muted p-4">
      {recurring && <input type="hidden" name="id" value={recurring.id} />}
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Teléfono WhatsApp"
          htmlFor="customer_phone"
          hint="Formato internacional Perú: 51999342668. Si pones 999342668, se agrega el 51 automáticamente."
        >
          <Input
            id="customer_phone"
            name="customer_phone"
            required
            placeholder="51999342668"
            defaultValue={recurring?.customer_phone ?? ''}
          />
        </Field>
        <Field label="Nombre cliente" htmlFor="customer_name" hint="Opcional">
          <Input
            id="customer_name"
            name="customer_name"
            defaultValue={recurring?.customer_name ?? ''}
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Productos del pedido</p>
        <ItemEditor products={products} items={items} onChange={setItems} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Frecuencia" htmlFor="frequency">
          <select
            id="frequency"
            name="frequency"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
          >
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
          </select>
        </Field>

        {frequency === 'monthly' ? (
          <Field label="Día del mes" htmlFor="day_of_month" hint="1–28">
            <Input
              id="day_of_month"
              name="day_of_month"
              type="number"
              min={1}
              max={28}
              defaultValue={recurring?.day_of_month ?? 1}
            />
          </Field>
        ) : (
          <Field label="Día" htmlFor="day_of_week">
            <select
              id="day_of_week"
              name="day_of_week"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              defaultValue={String(defaultDayOfWeek)}
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Próxima fecha" htmlFor="next_run_on">
          <Input
            id="next_run_on"
            name="next_run_on"
            type="date"
            required
            defaultValue={recurring?.next_run_on ?? todayInLima()}
          />
        </Field>
      </div>

      <Field label="Notas internas" htmlFor="notes" hint="Entrega, preferencias…">
        <Textarea id="notes" name="notes" rows={2} defaultValue={recurring?.notes ?? ''} />
      </Field>

      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || items.length === 0}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function ActionForm({
  action,
  id,
  label,
  variant = 'outline',
  hidden,
}: {
  action: (_prev: RecurringState, formData: FormData) => Promise<RecurringState>
  id: string
  label: string
  variant?: 'outline' | 'danger'
  hidden?: Record<string, string>
}) {
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        {pending ? '…' : label}
      </Button>
      {state.error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}

export function RecurrentesClient({
  recurring,
  products,
}: {
  recurring: RecurringOrderView[]
  products: ProductOption[]
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const today = todayInLima()

  const visible = useMemo(() => {
    const inSevenDays = (date: string) => {
      const end = new Date(`${today}T12:00:00-05:00`)
      end.setDate(end.getDate() + 7)
      return date >= today && date <= end.toISOString().slice(0, 10)
    }
    switch (filter) {
      case 'active':
        return recurring.filter((r) => r.status === 'active')
      case 'paused':
        return recurring.filter((r) => r.status === 'paused')
      case 'upcoming':
        return recurring.filter(
          (r) => r.status === 'active' && inSevenDays(r.next_run_on)
        )
      default:
        return recurring.filter((r) => r.status !== 'cancelled')
    }
  }, [filter, recurring, today])

  const dueToday = recurring.filter(
    (r) => r.status === 'active' && r.next_run_on === today
  )

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pedidos recurrentes
          </h1>
          <p className="mt-1 text-sm text-muted">
            Plantillas para clientes habituales. El cliente confirma por WhatsApp antes de
            crear el pedido.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingId(null)
            setShowCreate((v) => !v)
          }}
        >
          Nuevo recurrente
        </Button>
      </div>

      {dueToday.length > 0 && (
        <Alert tone="info" live className="mb-4">
          Hoy tocan {dueToday.length} pedido(s) recurrente(s):{' '}
          {dueToday.map((r) => r.customer_phone).join(', ')}
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['all', `Todos (${recurring.filter((r) => r.status !== 'cancelled').length})`],
            ['active', 'Activos'],
            ['paused', 'Pausados'],
            ['upcoming', 'Próximos 7 días'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === key
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                : 'bg-surface text-muted ring-1 ring-border hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="mb-5">
          <RecurringForm
            products={products}
            onDone={() => setShowCreate(false)}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong bg-surface p-8 text-center text-muted">
          No hay pedidos recurrentes en esta vista.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((r) =>
            editingId === r.id ? (
              <RecurringForm
                key={r.id}
                recurring={r}
                products={products}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <article
                key={r.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {r.customer_name || r.customer_phone}
                      </p>
                      {statusBadge(r.status)}
                      {r.next_run_on === today && r.status === 'active' && (
                        <Badge tone="primary" dot>
                          Hoy
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted">{r.customer_phone}</p>
                    <p className="mt-1 text-sm text-foreground">
                      {summarizeRecurringItems(r.items)}
                    </p>
                    <p className="text-xs text-muted">
                      {formatRecurringSchedule(r)} · Próximo: {r.next_run_on}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === 'active' && (
                      <>
                        <ActionForm
                          action={generateRecurringOrderNow}
                          id={r.id}
                          label="Generar pedido"
                        />
                        <ActionForm
                          action={sendRecurringReminderNow}
                          id={r.id}
                          label="Enviar recordatorio"
                        />
                        <ActionForm
                          action={setRecurringStatus}
                          id={r.id}
                          label="Pausar"
                          hidden={{ status: 'paused' }}
                        />
                      </>
                    )}
                    {r.status === 'paused' && (
                      <ActionForm
                        action={setRecurringStatus}
                        id={r.id}
                        label="Reactivar"
                        hidden={{ status: 'active' }}
                      />
                    )}
                    {r.status !== 'cancelled' && (
                      <ActionForm
                        action={setRecurringStatus}
                        id={r.id}
                        label="Cancelar"
                        variant="danger"
                        hidden={{ status: 'cancelled' }}
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreate(false)
                        setEditingId(r.id)
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  )
}
