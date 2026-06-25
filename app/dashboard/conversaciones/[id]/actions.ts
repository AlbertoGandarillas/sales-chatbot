'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function detailPath(conversationId: string) {
  return `/dashboard/conversaciones/${conversationId}`
}

export async function toggleMode(formData: FormData) {
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
    await sendWhatsAppMessage(convo.customer_phone, text, {
      token: biz?.whatsapp_token,
      phoneNumberId: biz?.whatsapp_phone_number_id,
    })
  } catch (err) {
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
