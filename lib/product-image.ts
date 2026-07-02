export const PRODUCT_IMAGE_BUCKET = 'product-images'
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const PRODUCT_IMAGE_MAX_MB = 2

export const PRODUCT_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type ProductImageMime = (typeof PRODUCT_IMAGE_ALLOWED_TYPES)[number]

export interface ProductImageFields {
  image_url: string | null
  image_storage_path: string | null
}

export type ImageSource = 'storage' | 'external' | 'none'

function normalizeSupabaseUrl(supabaseUrl: string): string {
  return supabaseUrl.replace(/\/$/, '')
}

export function storagePathToPublicUrl(
  supabaseUrl: string,
  storagePath: string
): string {
  const base = normalizeSupabaseUrl(supabaseUrl)
  const encoded = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${encoded}`
}

export function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

/** URL pública efectiva para <img> y APIs externas. Storage gana sobre URL externa. */
export function resolveProductImage(
  product: ProductImageFields,
  supabaseUrl = getSupabaseProjectUrl()
): { url: string | null; source: ImageSource } {
  if (product.image_storage_path) {
    return {
      url: storagePathToPublicUrl(supabaseUrl, product.image_storage_path),
      source: 'storage',
    }
  }
  if (product.image_url?.trim()) {
    return { url: product.image_url.trim(), source: 'external' }
  }
  return { url: null, source: 'none' }
}

export function extensionForMime(mime: string): string | null {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return null
  }
}

/** Tamaño legible, ej. "1.4 MB" o "850 KB". */
export function formatFileSizeBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function validateProductImageFile(
  file: File,
  maxBytes = PRODUCT_IMAGE_MAX_BYTES
): string | null {
  if (
    !PRODUCT_IMAGE_ALLOWED_TYPES.includes(file.type as ProductImageMime)
  ) {
    return 'Formato no permitido. Usa JPEG, PNG o WebP.'
  }
  if (file.size > maxBytes) {
    return `La imagen pesa ${formatFileSizeBytes(file.size)}; el máximo permitido es ${PRODUCT_IMAGE_MAX_MB} MB. Elige otra imagen o comprímela.`
  }
  return null
}
