import { createServiceClient } from '@/lib/supabase'
import {
  isWithinWhatsAppSession,
  WHATSAPP_SESSION_CLOSED_MESSAGE,
  WHATSAPP_SESSION_MS,
} from '@/lib/whatsapp-session-window'

export {
  isWithinWhatsAppSession,
  WHATSAPP_SESSION_CLOSED_MESSAGE,
  WHATSAPP_SESSION_MS,
}

export async function getLastCustomerMessageAt(
  conversationId: string
): Promise<Date | null> {
  const db = createServiceClient()
  const { data } = await db
    .from('messages')
    .select('created_at')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.created_at) return null
  return new Date(data.created_at)
}

export async function isConversationSessionOpen(
  conversationId: string
): Promise<boolean> {
  const last = await getLastCustomerMessageAt(conversationId)
  return isWithinWhatsAppSession(last)
}

export async function findConversationId(
  businessId: string,
  customerPhone: string
): Promise<string | null> {
  const db = createServiceClient()
  const { data } = await db
    .from('conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)
    .maybeSingle()
  return data?.id ?? null
}
