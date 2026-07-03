/** Ventana de mensajería libre de Meta (24 h desde el último mensaje del cliente). */
export const WHATSAPP_SESSION_MS = 24 * 60 * 60 * 1000

export function isWithinWhatsAppSession(
  lastCustomerMessageAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!lastCustomerMessageAt) return false
  return now.getTime() - lastCustomerMessageAt.getTime() < WHATSAPP_SESSION_MS
}

export const WHATSAPP_SESSION_CLOSED_MESSAGE =
  'No se puede enviar: pasaron más de 24 horas desde el último mensaje del cliente. ' +
  'WhatsApp solo permite plantillas aprobadas fuera de esa ventana (aún no configuradas en Uru). ' +
  'Pídele al cliente que te escriba de nuevo para reabrir la conversación.'
