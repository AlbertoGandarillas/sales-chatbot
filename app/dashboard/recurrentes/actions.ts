'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase'
import { EMPTY_BOT_FIELDS } from '@/lib/bot-config'
import {
  advanceNextRunOn,
  createOrderFromRecurring,
  normalizeCustomerPhone,
  parseRecurringItemsJson,
  sendRecurringReminder,
  todayInLima,
  type RecurringFrequency,
  type RecurringOrderRow,
} from '@/lib/recurring-orders'
import { isValidPeruWhatsAppPhone } from '@/lib/whatsapp-phone'

export type RecurringState = { error: string | null; ok: boolean }

async function ownerContext() {
  const supabase = await createServerSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select(
      'id, name, whatsapp_token, whatsapp_phone_number_id, owner_whatsapp_number'
    )
    .maybeSingle()
  return { supabase, business }
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function nullable(formData: FormData, key: string): string | null {
  const v = str(formData, key)
  return v ? v : null
}

function parseFrequency(value: string): RecurringFrequency | null {
  if (value === 'weekly' || value === 'biweekly' || value === 'monthly') {
    return value
  }
  return null
}

export async function saveRecurringOrder(
  _prev: RecurringState,
  formData: FormData
): Promise<RecurringState> {
  const { supabase, business } = await ownerContext()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const id = str(formData, 'id')
  const customerPhone = normalizeCustomerPhone(str(formData, 'customer_phone'))
  if (!customerPhone) {
    return { error: 'Teléfono del cliente es obligatorio.', ok: false }
  }
  if (!isValidPeruWhatsAppPhone(customerPhone)) {
    return {
      error:
        'Teléfono inválido. Usa formato Perú: 51999342668 (51 + 9 dígitos del móvil).',
      ok: false,
    }
  }

  const frequency = parseFrequency(str(formData, 'frequency'))
  if (!frequency) return { error: 'Frecuencia inválida.', ok: false }

  const nextRunOn = str(formData, 'next_run_on')
  if (!nextRunOn) return { error: 'Próxima fecha es obligatoria.', ok: false }

  let items
  try {
    items = parseRecurringItemsJson(str(formData, 'items_json'))
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Ítems inválidos.',
      ok: false,
    }
  }

  const dayOfWeekRaw = str(formData, 'day_of_week')
  const dayOfMonthRaw = str(formData, 'day_of_month')

  const payload: Record<string, unknown> = {
    customer_phone: customerPhone,
    customer_name: nullable(formData, 'customer_name'),
    frequency,
    next_run_on: nextRunOn,
    items,
    notes: nullable(formData, 'notes'),
  }

  if (frequency === 'monthly') {
    const dayOfMonth = Number(dayOfMonthRaw)
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
      return { error: 'Día del mes inválido (1–28).', ok: false }
    }
    payload.day_of_month = dayOfMonth
    payload.day_of_week = null
  } else {
    const dayOfWeek = Number(dayOfWeekRaw)
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return { error: 'Día de la semana inválido.', ok: false }
    }
    payload.day_of_week = dayOfWeek
    payload.day_of_month = null
  }

  if (id) {
    const { error } = await supabase
      .from('recurring_orders')
      .update(payload)
      .eq('id', id)
      .eq('business_id', business.id)
    if (error) return { error: error.message, ok: false }
  } else {
    const { error } = await supabase.from('recurring_orders').insert({
      ...payload,
      business_id: business.id,
      status: 'active',
    })
    if (error) return { error: error.message, ok: false }
  }

  revalidatePath('/dashboard/recurrentes')
  return { error: null, ok: true }
}

export async function setRecurringStatus(
  _prev: RecurringState,
  formData: FormData
): Promise<RecurringState> {
  const id = str(formData, 'id')
  const status = str(formData, 'status')
  if (!id || !['active', 'paused', 'cancelled'].includes(status)) {
    return { error: 'Solicitud inválida.', ok: false }
  }

  const { supabase, business } = await ownerContext()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const { error } = await supabase
    .from('recurring_orders')
    .update({ status })
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) return { error: error.message, ok: false }
  revalidatePath('/dashboard/recurrentes')
  return { error: null, ok: true }
}

export async function generateRecurringOrderNow(
  _prev: RecurringState,
  formData: FormData
): Promise<RecurringState> {
  const id = str(formData, 'id')
  if (!id) return { error: 'ID inválido.', ok: false }

  const { supabase, business } = await ownerContext()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const { data: recurring, error } = await supabase
    .from('recurring_orders')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (error || !recurring) {
    return { error: 'Pedido recurrente no encontrado.', ok: false }
  }

  const row = recurring as RecurringOrderRow
  const db = createServiceClient()

  try {
    await createOrderFromRecurring(db, business, row, {
      notifyOwnerMessage: `🔄 Pedido recurrente (manual) — ${business.name}

Cliente: ${row.customer_phone}
Generado desde el dashboard.
Pedido creado con ítems de la plantilla.`,
    })
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al crear pedido.',
      ok: false,
    }
  }

  revalidatePath('/dashboard/recurrentes')
  revalidatePath('/dashboard/conversaciones')
  return { error: null, ok: true }
}

export async function sendRecurringReminderNow(
  _prev: RecurringState,
  formData: FormData
): Promise<RecurringState> {
  const id = str(formData, 'id')
  if (!id) return { error: 'ID inválido.', ok: false }

  const { supabase, business } = await ownerContext()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const { data: recurring, error } = await supabase
    .from('recurring_orders')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (error || !recurring) {
    return { error: 'Pedido recurrente no encontrado.', ok: false }
  }

  const row = recurring as RecurringOrderRow
  const db = createServiceClient()
  const scheduledFor = row.next_run_on || todayInLima()

  if (!business.whatsapp_token || !business.whatsapp_phone_number_id) {
    return {
      error:
        'WhatsApp no está configurado para este negocio. Revisa token y phone_number_id en la base de datos o Perfil.',
      ok: false,
    }
  }

  try {
    const result = await sendRecurringReminder(
      db,
      {
        id: business.id,
        name: business.name,
        whatsapp_token: business.whatsapp_token,
        whatsapp_phone_number_id: business.whatsapp_phone_number_id,
        owner_whatsapp_number: business.owner_whatsapp_number,
        slug: '',
        catalog_source: 'manual',
        supports_custom_orders: false,
        system_prompt_custom: null,
        shopify_domain: null,
        owner_user_id: null,
        ...EMPTY_BOT_FIELDS,
      },
      row,
      scheduledFor
    )
    if (!result.sent) {
      return {
        error: 'Ya se envió un recordatorio para esta fecha.',
        ok: false,
      }
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al enviar recordatorio.',
      ok: false,
    }
  }

  revalidatePath('/dashboard/recurrentes')
  return { error: null, ok: true }
}

export async function bumpRecurringNextRun(
  formData: FormData
): Promise<RecurringState> {
  const id = str(formData, 'id')
  if (!id) return { error: 'ID inválido.', ok: false }

  const { supabase, business } = await ownerContext()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const { data: recurring, error: fetchError } = await supabase
    .from('recurring_orders')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (fetchError || !recurring) {
    return { error: 'Pedido recurrente no encontrado.', ok: false }
  }

  const nextRun = advanceNextRunOn(recurring as RecurringOrderRow)
  const { error } = await supabase
    .from('recurring_orders')
    .update({ next_run_on: nextRun })
    .eq('id', id)

  if (error) return { error: error.message, ok: false }
  revalidatePath('/dashboard/recurrentes')
  return { error: null, ok: true }
}
