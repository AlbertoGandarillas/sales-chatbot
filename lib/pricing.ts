export interface ProductPromoFields {
  price_soles: number | string
  promo_price_soles?: number | string | null
  promo_starts_at?: string | null
  promo_ends_at?: string | null
  promo_label?: string | null
  is_custom_order?: boolean
}

export interface EffectivePrice {
  price: number
  compareAt: number | null
  onPromo: boolean
  promoLabel: string | null
}

export function toPriceNumber(value: number | string | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Precio vigente para catálogo, bot y pedidos (no persiste en BD). */
export function effectivePrice(
  product: ProductPromoFields,
  at: Date = new Date()
): EffectivePrice {
  const basePrice = toPriceNumber(product.price_soles)

  if (product.is_custom_order) {
    return {
      price: basePrice,
      compareAt: null,
      onPromo: false,
      promoLabel: null,
    }
  }

  const promoPriceRaw = product.promo_price_soles
  if (promoPriceRaw == null || promoPriceRaw === '') {
    return {
      price: basePrice,
      compareAt: null,
      onPromo: false,
      promoLabel: null,
    }
  }

  const promoPrice = toPriceNumber(promoPriceRaw)
  const startOk =
    !product.promo_starts_at || at >= new Date(product.promo_starts_at)
  const endOk = !product.promo_ends_at || at <= new Date(product.promo_ends_at)

  if (startOk && endOk && promoPrice < basePrice) {
    return {
      price: promoPrice,
      compareAt: basePrice,
      onPromo: true,
      promoLabel: product.promo_label?.trim() || null,
    }
  }

  return {
    price: basePrice,
    compareAt: null,
    onPromo: false,
    promoLabel: null,
  }
}

export function mapProductForSearch<T extends ProductPromoFields>(
  row: T,
  at: Date = new Date()
) {
  const pricing = effectivePrice(row, at)
  return {
    ...row,
    effective_price_soles: pricing.price,
    compare_at_soles: pricing.compareAt,
    on_promo: pricing.onPromo,
    promo_label: pricing.promoLabel,
    promo_ends_at:
      pricing.onPromo && row.promo_ends_at ? row.promo_ends_at : null,
  }
}
