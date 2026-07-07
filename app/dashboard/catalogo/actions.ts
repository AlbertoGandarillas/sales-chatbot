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
import { requireCatalogWrite, requireOwnerRole } from '@/lib/team-access'

export type CatalogState = { error: string | null; ok: boolean }

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function nullable(formData: FormData, key: string): string | null {
  const v = str(formData, key)
  return v ? v : null
}

async function memberBusiness() {
  const membership = await requireCatalogWrite()
  const supabase = await createServerSupabase()
  return {
    supabase,
    business: { id: membership.businessId },
    membership,
  }
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
  const { supabase, business } = await memberBusiness()
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

  const { supabase, business } = await memberBusiness()
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

export async function patchProductQuick(
  _prev: CatalogState,
  formData: FormData
): Promise<CatalogState> {
  const { supabase, business } = await memberBusiness()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const id = str(formData, 'id')
  if (!id) return { error: 'Producto inválido.', ok: false }

  const hasPrice = formData.has('price_soles')
  const hasAvailable = formData.has('available')

  if (!hasPrice && !hasAvailable) {
    return { error: 'Nada que actualizar.', ok: false }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('is_custom_order')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (fetchError || !existing) {
    return { error: 'Producto no encontrado.', ok: false }
  }

  const updates: Record<string, unknown> = {}

  if (hasPrice) {
    if (existing.is_custom_order) {
      return { error: 'Los encargos a medida no tienen precio fijo.', ok: false }
    }
    const price = Number(formData.get('price_soles'))
    if (Number.isNaN(price) || price < 0) {
      return { error: 'Precio inválido.', ok: false }
    }
    updates.price_soles = price
  }

  if (hasAvailable) {
    updates.available = String(formData.get('available')) === 'true'
  }

  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) return { error: error.message, ok: false }

  revalidatePath('/dashboard/catalogo')
  return { error: null, ok: true }
}

export async function toggleAvailable(formData: FormData): Promise<void> {
  const { supabase, business } = await memberBusiness()
  const id = String(formData.get('id') ?? '')
  const next = String(formData.get('next') ?? '') === 'true'
  if (!id) return
  await supabase
    .from('products')
    .update({ available: next })
    .eq('id', id)
    .eq('business_id', business.id)
  revalidatePath('/dashboard/catalogo')
}

export type ResyncState = { error: string | null; result: IngestResult | null }

export async function resyncCatalog(
  _prev: ResyncState,
  _formData: FormData
): Promise<ResyncState> {
  const membership = await requireOwnerRole()
  const supabase = await createServerSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select('id, shopify_domain')
    .eq('id', membership.businessId)
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

export type BulkCatalogAction =
  | 'mark_reviewed'
  | 'set_available'
  | 'set_unavailable'
  | 'delete'

export type CatalogBulkState = {
  error: string | null
  ok: boolean
  affected?: number
}

const BULK_MAX_IDS = 200

function parseProductIds(formData: FormData): { ids: string[] } | { error: string } {
  const raw = str(formData, 'ids')
  if (!raw) return { error: 'Sin productos seleccionados.' }
  let ids: unknown
  try {
    ids = JSON.parse(raw)
  } catch {
    return { error: 'Selección inválida.' }
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'Sin productos seleccionados.' }
  }
  const parsed = ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
  if (parsed.length !== ids.length) return { error: 'Selección inválida.' }
  if (parsed.length > BULK_MAX_IDS) {
    return { error: `Máximo ${BULK_MAX_IDS} productos por lote.` }
  }
  return { ids: parsed }
}

async function validateOwnedProductIds(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  businessId: string,
  ids: string[]
): Promise<{ ok: true; rows: { id: string; image_storage_path: string | null; source: string }[] } | { error: string }> {
  const { data, error } = await supabase
    .from('products')
    .select('id, image_storage_path, source')
    .eq('business_id', businessId)
    .in('id', ids)

  if (error) return { error: error.message }
  if (!data || data.length !== ids.length) {
    return { error: 'Algunos productos no pertenecen a tu negocio.' }
  }
  return { ok: true, rows: data }
}

export async function markProductReviewed(
  _prev: CatalogState,
  formData: FormData
): Promise<CatalogState> {
  const { supabase, business } = await memberBusiness()
  const id = str(formData, 'id')
  if (!id) return { error: 'Producto inválido.', ok: false }

  const { error } = await supabase
    .from('products')
    .update({ needs_review: false })
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) return { error: error.message, ok: false }

  revalidatePath('/dashboard/catalogo')
  return { error: null, ok: true }
}

export async function markAllProductsReviewed(
  _prev: CatalogBulkState,
  _formData: FormData
): Promise<CatalogBulkState> {
  const { supabase, business } = await memberBusiness()

  const { data, error } = await supabase
    .from('products')
    .update({ needs_review: false })
    .eq('business_id', business.id)
    .eq('needs_review', true)
    .select('id')

  if (error) return { error: error.message, ok: false }

  revalidatePath('/dashboard/catalogo')
  return { error: null, ok: true, affected: data?.length ?? 0 }
}

export async function bulkCatalogProducts(
  _prev: CatalogBulkState,
  formData: FormData
): Promise<CatalogBulkState> {
  const { supabase, business } = await memberBusiness()
  const parsed = parseProductIds(formData)
  if ('error' in parsed) return { error: parsed.error, ok: false }

  const action = str(formData, 'action') as BulkCatalogAction
  if (
    action !== 'mark_reviewed' &&
    action !== 'set_available' &&
    action !== 'set_unavailable' &&
    action !== 'delete'
  ) {
    return { error: 'Acción inválida.', ok: false }
  }

  if (action === 'delete' && str(formData, 'confirm_token') !== 'ELIMINAR') {
    return { error: 'Confirmación requerida.', ok: false }
  }

  const owned = await validateOwnedProductIds(supabase, business.id, parsed.ids)
  if ('error' in owned) return { error: owned.error, ok: false }

  if (action === 'delete') {
    for (const row of owned.rows) {
      if (row.image_storage_path) {
        await deleteProductImageFile(supabase, row.image_storage_path)
      }
    }
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('business_id', business.id)
      .in('id', parsed.ids)

    if (error) return { error: error.message, ok: false }
    revalidatePath('/dashboard/catalogo')
    return { error: null, ok: true, affected: parsed.ids.length }
  }

  const payload =
    action === 'mark_reviewed'
      ? { needs_review: false }
      : action === 'set_available'
        ? { available: true }
        : { available: false }

  const { error } = await supabase
    .from('products')
    .update(payload)
    .eq('business_id', business.id)
    .in('id', parsed.ids)

  if (error) return { error: error.message, ok: false }

  revalidatePath('/dashboard/catalogo')
  return { error: null, ok: true, affected: parsed.ids.length }
}
