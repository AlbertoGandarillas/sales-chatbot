import { createServiceClient } from '@/lib/supabase'

export interface IngestResult {
  inserted: number
  updated: number
  needsReviewCount: number
  errors: string[]
}

interface ShopifyVariant {
  id: number
  price: string
  option1: string | null
  option2: string | null
  option3: string | null
  available: boolean
}

interface ShopifyImage {
  src: string
}

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  body_html: string | null
  images: ShopifyImage[]
  variants: ShopifyVariant[]
}

export interface ProductRow {
  business_id: string
  external_id: string
  name: string
  description: string | null
  category: 'retail'
  price_soles: number
  available: boolean
  image_url: string | null
  talla_range: string | null
  color_o_material: string | null
  source: 'shopify'
  needs_review: true
  attributes: Record<string, unknown>
}

/** Normaliza un dominio a host (sin protocolo, sin ruta, sin slash final). */
export function normalizeShopifyHost(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

/** Quita HTML básico y normaliza espacios. */
export function htmlToText(html: string | null): string | null {
  if (!html) return null
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.slice(0, 1000) : null
}

/** Extrae rango de talla del cuerpo del producto, si se puede. */
export function parseSize(
  option1: string | null,
  bodyText: string | null
): { tallaRange: string | null; parsedFrom: 'option1' | 'body_html' | 'none' } {
  if (option1 && option1.trim() && option1.trim().toLowerCase() !== 'default title') {
    return { tallaRange: option1.trim(), parsedFrom: 'option1' }
  }
  const text = bodyText ?? ''
  const m =
    text.match(/del\s*(\d{2})\s*al\s*(\d{2})/i) ?? text.match(/(\d{2})\s*al\s*(\d{2})/i)
  if (m) {
    return { tallaRange: `${m[1]} AL ${m[2]}`, parsedFrom: 'body_html' }
  }
  return { tallaRange: null, parsedFrom: 'none' }
}

/** Convierte productos de Shopify en filas de `products` (función pura). */
export function mapShopifyProductsToRows(
  products: ShopifyProduct[],
  businessId: string
): ProductRow[] {
  const rows: ProductRow[] = []

  for (const product of products) {
    const bodyText = htmlToText(product.body_html)
    const imageUrl = product.images?.[0]?.src ?? null

    for (const variant of product.variants ?? []) {
      const { tallaRange, parsedFrom } = parseSize(variant.option1, bodyText)
      const price = Number(variant.price)

      const attributes: Record<string, unknown> = {
        shopify_product_id: product.id,
        shopify_variant_id: variant.id,
        handle: product.handle,
        raw_option1: variant.option1 ?? null,
        raw_option2: variant.option2 ?? null,
        size_parsed_from: parsedFrom,
      }
      if (parsedFrom === 'none') {
        attributes.review_note =
          'No se pudo extraer rango de talla automáticamente'
      }

      rows.push({
        business_id: businessId,
        external_id: `shopify_${variant.id}`,
        name: product.title,
        description: bodyText,
        category: 'retail',
        price_soles: Number.isFinite(price) && price >= 0 ? price : 0,
        available: Boolean(variant.available),
        image_url: imageUrl,
        talla_range: tallaRange,
        color_o_material: variant.option2?.trim() || null,
        source: 'shopify',
        needs_review: true,
        attributes,
      })
    }
  }

  return rows
}

/** Descarga todos los productos de una tienda Shopify pública (paginado). */
export async function fetchShopifyProducts(
  shopifyDomain: string
): Promise<ShopifyProduct[]> {
  const host = normalizeShopifyHost(shopifyDomain)
  const all: ShopifyProduct[] = []
  const limit = 250
  const maxPages = 20

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://${host}/products.json?limit=${limit}&page=${page}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      throw new Error(`Shopify respondió ${res.status} en ${host}/products.json`)
    }
    const json = (await res.json()) as { products?: ShopifyProduct[] }
    const batch = json.products ?? []
    all.push(...batch)
    if (batch.length < limit) break
  }

  return all
}

/**
 * Ingesta el catálogo Shopify de un negocio y hace upsert por
 * (business_id, external_id). Usa service-role (no depende de RLS del usuario).
 */
export async function ingestShopifyCatalog(
  businessId: string,
  shopifyDomain: string
): Promise<IngestResult> {
  const errors: string[] = []

  let products: ShopifyProduct[]
  try {
    products = await fetchShopifyProducts(shopifyDomain)
  } catch (err) {
    return {
      inserted: 0,
      updated: 0,
      needsReviewCount: 0,
      errors: [err instanceof Error ? err.message : 'Error descargando Shopify'],
    }
  }

  const rows = mapShopifyProductsToRows(products, businessId)
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, needsReviewCount: 0, errors: ['Catálogo vacío.'] }
  }

  const db = createServiceClient()
  const externalIds = rows.map((r) => r.external_id)

  // Clasificar insert vs update consultando los external_id existentes.
  const existing = new Set<string>()
  for (let i = 0; i < externalIds.length; i += 500) {
    const chunk = externalIds.slice(i, i + 500)
    const { data, error } = await db
      .from('products')
      .select('external_id')
      .eq('business_id', businessId)
      .in('external_id', chunk)
    if (error) {
      errors.push(`Lectura de existentes: ${error.message}`)
      continue
    }
    for (const row of data ?? []) {
      if (row.external_id) existing.add(row.external_id)
    }
  }

  const inserted = externalIds.filter((id) => !existing.has(id)).length
  const updated = externalIds.length - inserted

  // Upsert por (business_id, external_id) en lotes.
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await db
      .from('products')
      .upsert(chunk, { onConflict: 'business_id,external_id' })
    if (error) {
      errors.push(`Upsert lote ${i / 100 + 1}: ${error.message}`)
    }
  }

  return {
    inserted,
    updated,
    needsReviewCount: rows.length,
    errors,
  }
}
