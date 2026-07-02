import type { SupabaseClient } from '@supabase/supabase-js'
import {
  extensionForMime,
  PRODUCT_IMAGE_BUCKET,
  storagePathToPublicUrl,
  validateProductImageFile,
} from '@/lib/product-image'

export function productImageStoragePath(
  businessId: string,
  productId: string,
  ext: string
): string {
  return `${businessId}/${productId}/main.${ext}`
}

export async function uploadProductImage(
  supabase: SupabaseClient,
  businessId: string,
  productId: string,
  file: File,
  supabaseUrl: string
): Promise<{ path: string; publicUrl: string }> {
  const validationError = validateProductImageFile(file)
  if (validationError) throw new Error(validationError)

  const ext = extensionForMime(file.type)
  if (!ext) throw new Error('Formato de imagen no soportado.')

  const path = productImageStoragePath(businessId, productId, ext)
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) throw new Error(error.message)

  return {
    path,
    publicUrl: storagePathToPublicUrl(supabaseUrl, path),
  }
}

export async function deleteProductImageFile(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove([storagePath])

  if (error) {
    console.error('[storage] Error eliminando imagen:', error.message)
  }
}
