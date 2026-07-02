const LIMA_OFFSET = '-05:00'
export const PROMO_LABEL_MAX_LENGTH = 40

export interface PromoFieldsPayload {
  promo_price_soles: number | null
  promo_starts_at: string | null
  promo_ends_at: string | null
  promo_label: string | null
}

/** Interpreta datetime-local del formulario como hora de Lima. */
export function datetimeLocalToTimestamptz(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed
  const parsed = new Date(`${normalized}${LIMA_OFFSET}`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

/** Para input datetime-local al editar (zona Lima). */
export function timestamptzToDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')
  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function parsePromoFromFormData(
  formData: FormData,
  priceSoles: number
): { ok: true; data: PromoFieldsPayload } | { ok: false; error: string } {
  const removePromo = formData.get('remove_promo') === 'true'
  const rawPromo = String(formData.get('promo_price_soles') ?? '').trim()

  if (removePromo || !rawPromo) {
    return {
      ok: true,
      data: {
        promo_price_soles: null,
        promo_starts_at: null,
        promo_ends_at: null,
        promo_label: null,
      },
    }
  }

  const promoPrice = Number(rawPromo)
  if (Number.isNaN(promoPrice) || promoPrice < 0) {
    return { ok: false, error: 'Precio promocional inválido.' }
  }
  if (promoPrice >= priceSoles) {
    return {
      ok: false,
      error: 'El precio promocional debe ser menor que el precio normal.',
    }
  }

  const promoStarts = datetimeLocalToTimestamptz(
    String(formData.get('promo_starts_at') ?? '')
  )
  const promoEnds = datetimeLocalToTimestamptz(
    String(formData.get('promo_ends_at') ?? '')
  )

  if (
    promoStarts &&
    promoEnds &&
    new Date(promoEnds).getTime() < new Date(promoStarts).getTime()
  ) {
    return {
      ok: false,
      error: 'La fecha de fin debe ser posterior al inicio de la promoción.',
    }
  }

  const labelRaw = String(formData.get('promo_label') ?? '').trim()
  const promoLabel = labelRaw
    ? labelRaw.slice(0, PROMO_LABEL_MAX_LENGTH)
    : null

  return {
    ok: true,
    data: {
      promo_price_soles: promoPrice,
      promo_starts_at: promoStarts,
      promo_ends_at: promoEnds,
      promo_label: promoLabel,
    },
  }
}
