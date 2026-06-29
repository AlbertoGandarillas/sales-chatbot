import { createHmac, timingSafeEqual } from 'crypto'

export function isProductionEnv(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  )
}

/** Valida el header X-Hub-Signature-256 de Meta (HMAC-SHA256 del body crudo). */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expectedHex = signatureHeader.slice(7)
  const computedHex = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

  try {
    const a = Buffer.from(computedHex, 'hex')
    const b = Buffer.from(expectedHex, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
