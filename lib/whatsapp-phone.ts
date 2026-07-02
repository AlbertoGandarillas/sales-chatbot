/**
 * Normaliza teléfonos para la API de WhatsApp (solo dígitos, con código de país).
 * Meta envía/recibe ej. 51999342668 (Perú: 51 + 9 dígitos móvil).
 */
export function normalizeWhatsAppPhone(
  raw: string,
  defaultCountryCode = '51'
): string {
  let digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  if (defaultCountryCode === '51') {
    // 999342668 → 51999342668
    if (digits.length === 9 && digits.startsWith('9')) {
      digits = `51${digits}`
    }
    // 0999342668 → 51999342668
    if (digits.length === 10 && digits.startsWith('0')) {
      digits = `51${digits.slice(1)}`
    }
  }

  return digits
}

/** Alias usado en pedidos recurrentes y conversaciones. */
export const normalizeCustomerPhone = normalizeWhatsAppPhone

export function isValidPeruWhatsAppPhone(phone: string): boolean {
  const n = normalizeWhatsAppPhone(phone)
  return /^519\d{8}$/.test(n)
}

export function formatWhatsAppPhoneHint(phone: string): string {
  const n = normalizeWhatsAppPhone(phone)
  if (!n) return 'vacío'
  if (n !== phone.replace(/\D/g, '')) {
    return `${n} (normalizado desde ${phone.trim()})`
  }
  return n
}
