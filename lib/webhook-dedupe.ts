import { createServiceClient } from '@/lib/supabase'

/**
 * Intenta registrar un wamid antes de procesar el mensaje.
 * @returns true si es nuevo (procesar), false si ya fue procesado (duplicado).
 */
export async function claimWhatsAppMessage(
  businessId: string,
  whatsappMessageId: string
): Promise<boolean> {
  const db = createServiceClient()
  const { error } = await db.from('processed_whatsapp_messages').insert({
    business_id: businessId,
    whatsapp_message_id: whatsappMessageId,
  })

  if (!error) return true

  // 23505 = unique_violation → reintento de Meta
  if (error.code === '23505') return false

  // Fail-open: ante error de BD, procesar para no perder mensajes legítimos.
  console.error('[webhook-dedupe] Error registrando wamid:', error.message)
  return true
}
