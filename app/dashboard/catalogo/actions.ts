'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  deleteProductImageFile,
  uploadProductImage,
} from '@/lib/supabase/product-image-storage'
import { ingestShopifyCatalog, type IngestResult } from '@/lib/shopify-ingestion'
import { getSupabaseProjectUrl } from '@/lib/product-image'
import { parsePromoFromFormData } from '@/lib/promo-form'

export type CatalogState = { error: string | null; ok: boolean }

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function nullable(formData: FormData, key: string): string | null {
  const v = str(formData, key)
  return v ? v : null
}

async function ownerBusiness() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('businesses').select('id').maybeSingle()
  return { supabase, business: data as { id: string } | null }
}

function imageFileFromForm(formData: FormData): File | null {
  const entry = formData.get('image_file')
  if (entry instanceof File && entry.size > 0) return entry
  return null
}

async function applyProductImageUpdates(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  businessId: string,
  productId: string,
  formData: FormData,
  existingStoragePath: string | null
): Promise<{ image_url?: string | null; image_storage_path?: string | null }> {
  const supabaseUrl = getSupabaseProjectUrl()
  const removeStored = formData.get('remove_stored_image') === 'true'
  const file = imageFileFromForm(formData)
  const urlInput = nullable(formData, 'image_url')
  const updates: { image_url?: string | null; image_storage_path?: string | null } =
    {}

  if (removeStored && existingStoragePath) {
    await deleteProductImageFile(supabase, existingStoragePath)
    updates.image_storage_path = null
  }

  if (file) {
    if (existingStoragePath && !removeStored) {
      await deleteProductImageFile(supabase, existingStoragePath)
    }
    const uploaded = await uploadProductImage(
      supabase,
      businessId,
      productId,
      file,
      supabaseUrl
    )
    updates.image_storage_path = uploaded.path
    updates.image_url = uploaded.publicUrl
    return updates
  }

  const storageStillActive =
    Boolean(existingStoragePath) && !removeStored

  if (!storageStillActive && urlInput !== null) {
    updates.image_url = urlInput
  } else if (!storageStillActive && removeStored) {
    updates.image_url = urlInput
  } else if (storageStillActive && urlInput !== null) {
    // Respaldo externo; la vista prioriza storage
    updates.image_url = urlInput
  }

  return updates
}

export async function saveProduct(
  _prev: CatalogState,
  formData: FormData
): Promise<CatalogState> {
  const { supabase, business } = await ownerBusiness()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const id = str(formData, 'id')
  const name = str(formData, 'name')
  if (!name) return { error: 'El nombre es obligatorio.', ok: false }

  const price = Number(formData.get('price_soles') ?? 0)
  if (Number.isNaN(price) || price < 0) {
    return { error: 'Precio inválido.', ok: false }
  }

  const category = str(formData, 'category') || 'otros'
  const urlInput = nullable(formData, 'image_url')
  const file = imageFileFromForm(formData)

  const promoParsed = parsePromoFromFormData(formData, price)
  if (!promoParsed.ok) {
    return { error: promoParsed.error, ok: false }
  }

  const isCustomOrder = formData.get('is_custom_order') != null
  const promoFields = isCustomOrder
    ? {
        promo_price_soles: null,
        promo_starts_at: null,
        promo_ends_at: null,
        promo_label: null,
      }
    : promoParsed.data

  const payload = {
    name,
    description: nullable(formData, 'description'),
    category,
    price_soles: price,
    available: formData.get('available') != null,
    is_custom_order: isCustomOrder,
    talla_range: nullable(formData, 'talla_range'),
    color_o_material: nullable(formData, 'color_o_material'),
    needs_review: false,
    ...promoFields,
  }

  try {
    if (id) {
      const { data: existing, error: fetchError } = await supabase
        .from('products')
        .select('image_storage_path')
        .eq('id', id)
        .eq('business_id', business.id)
        .maybeSingle()

      if (fetchError || !existing) {
        return { error: 'Producto no encontrado.', ok: false }
      }

      const imageUpdates = await applyProductImageUpdates(
        supabase,
        business.id,
        id,
        formData,
        existing.image_storage_path
      )

      const { error } = await supabase
        .from('products')
        .update({ ...payload, ...imageUpdates })
        .eq('id', id)
        .eq('business_id', business.id)

      if (error) return { error: error.message, ok: false }
    } else {
      const initialImageUrl = file ? null : urlInput

      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert({
          ...payload,
          image_url: initialImageUrl,
          business_id: business.id,
          source: 'manual',
        })
        .select('id')
        .single()

      if (insertError || !inserted) {
        return { error: insertError?.message ?? 'Error al crear.', ok: false }
      }

      if (file) {
        const imageUpdates = await applyProductImageUpdates(
          supabase,
          business.id,
          inserted.id,
          formData,
          null
        )
        const { error: updateError } = await supabase
          .from('products')
          .update(imageUpdates)
          .eq('id', inserted.id)

        if (updateError) {
          return { error: updateError.message, ok: false }
        }
      }
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al guardar imagen.',
      ok: false,
    }
  }

  revalidatePath('/dashboard/catalogo')
  return { error: null, ok: true }
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { supabase, business } = await ownerBusiness()
  if (!business) return

  const { data: product } = await supabase
    .from('products')
    .select('image_storage_path')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (product?.image_storage_path) {
    await deleteProductImageFile(supabase, product.image_storage_path)
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) {
    console.error('[catalog] Error eliminando producto:', error.message)
  }

  revalidatePath('/dashboard/catalogo')
}

export async function toggleAvailable(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const next = String(formData.get('next') ?? '') === 'true'
  if (!id) return
  const supabase = await createServerSupabase()
  await supabase.from('products').update({ available: next }).eq('id', id)
  revalidatePath('/dashboard/catalogo')
}

export type ResyncState = { error: string | null; result: IngestResult | null }

export async function resyncCatalog(
  _prev: ResyncState,
  _formData: FormData
): Promise<ResyncState> {
  const supabase = await createServerSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select('id, shopify_domain')
    .maybeSingle()

  if (!business) return { error: 'Sesión sin negocio.', result: null }
  if (!business.shopify_domain) {
    return { error: 'Este negocio no tiene dominio Shopify configurado.', result: null }
  }

  const result = await ingestShopifyCatalog(business.id, business.shopify_domain)

  if (result.inserted + result.updated > 0) {
    await supabase
      .from('businesses')
      .update({ catalog_source: 'shopify' })
      .eq('id', business.id)
    revalidatePath('/dashboard')
  }

  revalidatePath('/dashboard/catalogo')
  return { error: result.errors[0] ?? null, result }
}
