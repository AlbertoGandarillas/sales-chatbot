'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { sendWhatsAppSessionMessage, isWhatsAppSessionClosedError } from '@/lib/whatsapp'
import { requireOpsRole } from '@/lib/team-access'

function detailPath(conversationId: string) {
  return `/dashboard/conversaciones/${conversationId}`
}

export async function toggleMode(formData: FormData) {
  await requireOpsRole()
  const conversationId = String(formData.get('conversationId') ?? '')
  const nextMode = String(formData.get('nextMode') ?? '')
  if (!conversationId || (nextMode !== 'bot' && nextMode !== 'human')) return

  const supabase = await createServerSupabase()
  // RLS limita el update al negocio del dueño autenticado.
  await supabase
    .from('conversations')
    .update({ mode: nextMode })
    .eq('id', conversationId)

  revalidatePath(detailPath(conversationId))
}

export type ReplyState = { error?: string; ok?: boolean }

export async function sendManualReply(
  _prev: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  await requireOpsRole()
  const conversationId = String(formData.get('conversationId') ?? '')
  const text = String(formData.get('text') ?? '').trim()
  if (!conversationId) return { error: 'Conversación inválida.' }
  if (!text) return { error: 'Escribe un mensaje.' }

  const supabase = await createServerSupabase()

  const { data: convo } = await supabase
    .from('conversations')
    .select('id, customer_phone, business_id, mode')
    .eq('id', conversationId)
    .maybeSingle()

  if (!convo) return { error: 'Conversación no encontrada.' }
  if (convo.mode !== 'human') {
    return { error: 'Pausa el bot (tomar control) antes de responder manualmente.' }
  }

  const { data: biz } = await supabase
    .from('businesses')
    .select('whatsapp_token, whatsapp_phone_number_id')
    .eq('id', convo.business_id)
    .maybeSingle()

  try {
    await sendWhatsAppSessionMessage(conversationId, convo.customer_phone, text, {
      token: biz?.whatsapp_token,
      phoneNumberId: biz?.whatsapp_phone_number_id,
    })
  } catch (err) {
    if (isWhatsAppSessionClosedError(err)) {
      return { error: err instanceof Error ? err.message : 'Ventana de 24 h cerrada.' }
    }
    return {
      error:
        'No se pudo enviar por WhatsApp: ' +
        (err instanceof Error ? err.message : 'error desconocido'),
    }
  }

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'human_agent',
    content: text,
  })

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath(detailPath(conversationId))
  return { ok: true }
}

export async function setDeliveryDate(formData: FormData) {
  await requireOpsRole()
  const orderId = String(formData.get('orderId') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  const date = String(formData.get('date') ?? '').trim()
  if (!orderId || !conversationId) return

  const supabase = await createServerSupabase()
  await supabase
    .from('orders')
    .update({ estimated_delivery_date: date || null })
    .eq('id', orderId)

  revalidatePath(detailPath(conversationId))
}

export async function confirmPayment(formData: FormData) {
  await requireOpsRole()
  const orderId = String(formData.get('orderId') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  const note = String(formData.get('note') ?? '').trim()
  if (!orderId || !conversationId) return

  const supabase = await createServerSupabase()
  await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_confirmed_at: new Date().toISOString(),
      payment_note: note || null,
    })
    .eq('id', orderId)

  revalidatePath(detailPath(conversationId))
}

export type OrderActionState = { error: string | null }

async function applyOrderStatus(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  orderId: string,
  conversationId: string,
  nextStatus: 'confirmed' | 'cancelled',
  cancelReason?: string
): Promise<OrderActionState> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { error: 'Pedido no encontrado.' }

  if (order.status === 'cancelled') {
    return { error: 'Este pedido ya está cancelado.' }
  }
  if (nextStatus === 'confirmed' && order.status !== 'pending') {
    return { error: 'Solo se pueden confirmar pedidos pendientes.' }
  }
  if (
    nextStatus === 'cancelled' &&
    order.status !== 'pending' &&
    order.status !== 'confirmed'
  ) {
    return { error: 'No se puede cancelar este pedido.' }
  }

  const payload: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === 'cancelled') {
    payload.notes = `Cancelado: ${cancelReason}`
  }

  const { error } = await supabase.from('orders').update(payload).eq('id', orderId)
  if (error) return { error: error.message }

  revalidatePath(detailPath(conversationId))
  return { error: null }
}

export async function confirmOrder(formData: FormData) {
  await requireOpsRole()
  const orderId = String(formData.get('orderId') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  if (!orderId || !conversationId) return

  const supabase = await createServerSupabase()
  await applyOrderStatus(supabase, orderId, conversationId, 'confirmed')
}

export async function updateOrderStatus(
  _prev: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  await requireOpsRole()
  const orderId = String(formData.get('orderId') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  const cancelReason = String(formData.get('cancelReason') ?? '').trim()

  if (!orderId || !conversationId) {
    return { error: 'Pedido inválido.' }
  }
  if (!cancelReason) {
    return { error: 'El motivo de cancelación es obligatorio.' }
  }

  const supabase = await createServerSupabase()
  return applyOrderStatus(supabase, orderId, conversationId, 'cancelled', cancelReason)
}

export async function markOrderDelivered(formData: FormData) {
  await requireOpsRole()
  const orderId = String(formData.get('orderId') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  if (!orderId || !conversationId) return

  const supabase = await createServerSupabase()

  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order || order.status !== 'confirmed') return

  await supabase
    .from('orders')
    .update({ delivery_status: 'delivered' })
    .eq('id', orderId)

  revalidatePath(detailPath(conversationId))
}
