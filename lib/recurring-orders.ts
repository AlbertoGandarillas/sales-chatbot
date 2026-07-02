import type { SupabaseClient } from '@supabase/supabase-js'
import type { Business } from '@/lib/business-resolver'
import {
  createCatalogOrder,
  formatOrderItemsSummary,
  formatSoles,
} from '@/lib/order-create'
import { notifyOwner, sendWhatsAppMessage } from '@/lib/whatsapp'

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly'
export type RecurringStatus = 'active' | 'paused' | 'cancelled'
export type RecurringRunStatus =
  | 'pending'
  | 'reminded'
  | 'confirmed'
  | 'skipped'
  | 'expired'

export interface RecurringOrderItem {
  product_id: string
  name: string
  quantity: number
  unit_price_soles?: number | null
}

export interface RecurringOrderRow {
  id: string
  business_id: string
  conversation_id: string | null
  customer_phone: string
  customer_name: string | null
  status: RecurringStatus
  frequency: RecurringFrequency
  day_of_week: number | null
  day_of_month: number | null
  next_run_on: string
  items: RecurringOrderItem[]
  notes: string | null
  last_reminder_at: string | null
  last_confirmed_at: string | null
}

const LIMA_TZ = 'America/Lima'
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function normalizeCustomerPhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function todayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TZ }).format(
    new Date()
  )
}

export function formatRecurringSchedule(
  row: Pick<
    RecurringOrderRow,
    'frequency' | 'day_of_week' | 'day_of_month'
  >
): string {
  if (row.frequency === 'monthly') {
    return `${FREQUENCY_LABELS.monthly}, día ${row.day_of_month}`
  }
  const day = row.day_of_week != null ? DAY_LABELS[row.day_of_week] : '?'
  return `${FREQUENCY_LABELS[row.frequency]}, ${day}`
}

export function summarizeRecurringItems(
  items: Pick<RecurringOrderItem, 'quantity' | 'name'>[]
): string {
  return items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
}

export function advanceNextRunOn(row: RecurringOrderRow): string {
  const base = new Date(`${row.next_run_on}T12:00:00-05:00`)
  if (row.frequency === 'weekly') {
    base.setDate(base.getDate() + 7)
  } else if (row.frequency === 'biweekly') {
    base.setDate(base.getDate() + 14)
  } else {
    base.setMonth(base.getMonth() + 1)
    if (row.day_of_month != null) {
      base.setDate(Math.min(row.day_of_month, 28))
    }
  }
  return base.toISOString().slice(0, 10)
}

export async function getOrCreateConversationId(
  db: SupabaseClient,
  businessId: string,
  customerPhone: string
): Promise<string> {
  const phone = normalizeCustomerPhone(customerPhone)
  const { data: existing } = await db
    .from('conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_phone', phone)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await db
    .from('conversations')
    .insert({
      business_id: businessId,
      customer_phone: phone,
      status: 'active',
      mode: 'bot',
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'No se pudo crear conversación')
  }
  return created.id
}

export function buildReminderMessage(row: RecurringOrderRow): string {
  const name = row.customer_name?.trim() || 'Hola'
  const summary = summarizeRecurringItems(row.items)
  return `${name} 👋 ¿Confirmas tu pedido de hoy? ${summary}. Responde *sí* para confirmar o cuéntanos si quieres cambiar algo.`
}

export async function createOrderFromRecurring(
  db: SupabaseClient,
  business: Pick<Business, 'id' | 'name' | 'whatsapp_token' | 'whatsapp_phone_number_id' | 'owner_whatsapp_number'>,
  recurring: RecurringOrderRow,
  opts: {
    conversationId?: string
    runId?: string
    customerNotes?: string
    notifyOwnerMessage?: string
  } = {}
): Promise<{ order_id: string; total_soles: number }> {
  const conversationId =
    opts.conversationId ??
    recurring.conversation_id ??
    (await getOrCreateConversationId(
      db,
      business.id,
      recurring.customer_phone
    ))

  const order = await createCatalogOrder({
    db,
    businessId: business.id,
    conversationId,
    items: recurring.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    source: 'recurring',
    recurring_order_id: recurring.id,
    notes: opts.customerNotes ?? recurring.notes,
  })

  if (opts.runId) {
    await db
      .from('recurring_order_runs')
      .update({ status: 'confirmed', order_id: order.order_id })
      .eq('id', opts.runId)
  }

  const nextRun = advanceNextRunOn(recurring)
  await db
    .from('recurring_orders')
    .update({
      next_run_on: nextRun,
      last_confirmed_at: new Date().toISOString(),
      conversation_id: conversationId,
    })
    .eq('id', recurring.id)

  const ownerMessage =
    opts.notifyOwnerMessage ??
    `🔄 Pedido recurrente confirmado — ${business.name}

Cliente: ${recurring.customer_phone}
${summarizeRecurringItems(order.items)}
Total: ${formatSoles(order.total_soles)}
Pedido ID: ${order.order_id}`

  try {
    await notifyOwner(ownerMessage, {
      token: business.whatsapp_token,
      phoneNumberId: business.whatsapp_phone_number_id,
      ownerNumber: business.owner_whatsapp_number,
    })
  } catch (err) {
    console.error('[recurring-orders] notifyOwner failed:', err)
  }

  return { order_id: order.order_id, total_soles: order.total_soles }
}

export async function skipRecurringRun(
  db: SupabaseClient,
  recurring: RecurringOrderRow,
  runId: string
): Promise<void> {
  await db
    .from('recurring_order_runs')
    .update({ status: 'skipped' })
    .eq('id', runId)

  const nextRun = advanceNextRunOn(recurring)
  await db
    .from('recurring_orders')
    .update({ next_run_on: nextRun })
    .eq('id', recurring.id)
}

export async function listRecurringForCustomer(
  db: SupabaseClient,
  businessId: string,
  customerPhone: string
) {
  const phone = normalizeCustomerPhone(customerPhone)
  const { data, error } = await db
    .from('recurring_orders')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_phone', phone)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as RecurringOrderRow[]
}

export async function getActiveReminderRun(
  db: SupabaseClient,
  businessId: string,
  customerPhone: string
) {
  const phone = normalizeCustomerPhone(customerPhone)
  const today = todayInLima()

  const { data: recurringRows, error } = await db
    .from('recurring_orders')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_phone', phone)
    .eq('status', 'active')

  if (error) throw error
  if (!recurringRows?.length) return null

  for (const row of recurringRows as RecurringOrderRow[]) {
    const { data: run } = await db
      .from('recurring_order_runs')
      .select('*')
      .eq('recurring_order_id', row.id)
      .eq('scheduled_for', today)
      .eq('status', 'reminded')
      .maybeSingle()

    if (run) {
      return { recurring: row, run }
    }
  }
  return null
}

export async function sendRecurringReminder(
  db: SupabaseClient,
  business: Business,
  recurring: RecurringOrderRow,
  scheduledFor: string
): Promise<{ run_id: string; sent: boolean }> {
  const { data: existing } = await db
    .from('recurring_order_runs')
    .select('id, status')
    .eq('recurring_order_id', recurring.id)
    .eq('scheduled_for', scheduledFor)
    .maybeSingle()

  let runId = existing?.id
  let runStatus = existing?.status

  if (!existing) {
    const { data: inserted, error: insertError } = await db
      .from('recurring_order_runs')
      .insert({
        recurring_order_id: recurring.id,
        scheduled_for: scheduledFor,
        status: 'pending',
      })
      .select('id, status')
      .single()

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? 'No se pudo crear run')
    }
    runId = inserted.id
    runStatus = inserted.status
  }

  if (!runId || runStatus !== 'pending') {
    return { run_id: runId ?? '', sent: false }
  }

  const message = buildReminderMessage(recurring)
  await sendWhatsAppMessage(recurring.customer_phone, message, {
    token: business.whatsapp_token,
    phoneNumberId: business.whatsapp_phone_number_id,
  })

  const now = new Date().toISOString()
  await db
    .from('recurring_order_runs')
    .update({ status: 'reminded' })
    .eq('id', runId)

  await db
    .from('recurring_orders')
    .update({ last_reminder_at: now })
    .eq('id', recurring.id)

  try {
    await notifyOwner(
      `📅 Recordatorio recurrente enviado — ${business.name}

Cliente: ${recurring.customer_phone}
${summarizeRecurringItems(recurring.items)}`,
      {
        token: business.whatsapp_token,
        phoneNumberId: business.whatsapp_phone_number_id,
        ownerNumber: business.owner_whatsapp_number,
      }
    )
  } catch (err) {
    console.error('[recurring-orders] notifyOwner reminder failed:', err)
  }

  return { run_id: runId, sent: true }
}

export async function processRecurringRemindersForBusiness(
  db: SupabaseClient,
  business: Business
): Promise<{ sent: number; expired: number }> {
  const today = todayInLima()
  let sent = 0
  let expired = 0

  const { data: dueRows, error } = await db
    .from('recurring_orders')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .eq('next_run_on', today)

  if (error) throw error

  for (const row of (dueRows ?? []) as RecurringOrderRow[]) {
    const result = await sendRecurringReminder(db, business, row, today)
    if (result.sent) sent++
  }

  const cutoff = new Date(Date.now() - REMINDER_WINDOW_MS).toISOString()

  const { data: remindedRuns } = await db
    .from('recurring_order_runs')
    .select('id, recurring_order_id, scheduled_for')
    .eq('status', 'reminded')

  for (const run of remindedRuns ?? []) {
    const { data: recurring } = await db
      .from('recurring_orders')
      .select('*')
      .eq('id', run.recurring_order_id)
      .eq('business_id', business.id)
      .maybeSingle()

    if (!recurring) continue
    const row = recurring as RecurringOrderRow
    if (!row.last_reminder_at || row.last_reminder_at > cutoff) continue

    await db
      .from('recurring_order_runs')
      .update({ status: 'expired' })
      .eq('id', run.id)

    const nextRun = advanceNextRunOn(row)
    await db
      .from('recurring_orders')
      .update({ next_run_on: nextRun })
      .eq('id', row.id)

    expired++

    try {
      await notifyOwner(
        `⏰ Pedido recurrente sin confirmación — ${business.name}

Cliente: ${row.customer_phone} no respondió al recordatorio del ${run.scheduled_for}.
Próximo intento: ${nextRun}`,
        {
          token: business.whatsapp_token,
          phoneNumberId: business.whatsapp_phone_number_id,
          ownerNumber: business.owner_whatsapp_number,
        }
      )
    } catch (err) {
      console.error('[recurring-orders] notifyOwner expired failed:', err)
    }
  }

  return { sent, expired }
}

export function parseRecurringItemsJson(raw: string): RecurringOrderItem[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Ítems inválidos.')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Agrega al menos un producto.')
  }

  return parsed.map((entry, index) => {
    const item = entry as Record<string, unknown>
    const productId = String(item.product_id ?? '').trim()
    const name = String(item.name ?? '').trim()
    const quantity = Number(item.quantity ?? 0)
    if (!productId || !name || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Ítem ${index + 1} inválido.`)
    }
    return { product_id: productId, name, quantity }
  })
}

export function formatOrderItemsSummaryFromRecurring(items: RecurringOrderItem[]) {
  return formatOrderItemsSummary(
    items.map((i) => ({ quantity: i.quantity, name: i.name }))
  )
}
