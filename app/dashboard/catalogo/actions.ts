'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { ingestShopifyCatalog, type IngestResult } from '@/lib/shopify-ingestion'

const BAKERY_CATEGORIES = ['panes', 'pasteleria', 'tortas', 'bebidas', 'otros']

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
  const { data } = await supabase.from('businesses').select('id, vertical').maybeSingle()
  return { supabase, business: data as { id: string; vertical: string } | null }
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

  const isRetail = business.vertical === 'retail'
  const category = isRetail ? 'retail' : str(formData, 'category') || 'otros'
  if (!isRetail && !BAKERY_CATEGORIES.includes(category)) {
    return { error: 'Categoría inválida.', ok: false }
  }

  const payload = {
    name,
    description: nullable(formData, 'description'),
    category,
    price_soles: price,
    available: formData.get('available') != null,
    is_custom_order: !isRetail && formData.get('is_custom_order') != null,
    talla_range: isRetail ? nullable(formData, 'talla_range') : null,
    color_o_material: isRetail ? nullable(formData, 'color_o_material') : null,
    image_url: isRetail ? nullable(formData, 'image_url') : null,
    needs_review: false,
  }

  if (id) {
    const { error } = await supabase.from('products').update(payload).eq('id', id)
    if (error) return { error: error.message, ok: false }
  } else {
    const { error } = await supabase.from('products').insert({
      ...payload,
      business_id: business.id,
      source: 'manual',
    })
    if (error) return { error: error.message, ok: false }
  }

  revalidatePath('/dashboard/catalogo')
  return { error: null, ok: true }
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await createServerSupabase()
  await supabase.from('products').delete().eq('id', id)
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
  // RLS garantiza que solo se obtiene el negocio del usuario autenticado.
  const { data: business } = await supabase
    .from('businesses')
    .select('id, shopify_domain')
    .maybeSingle()

  if (!business) return { error: 'Sesión sin negocio.', result: null }
  if (!business.shopify_domain) {
    return { error: 'Este negocio no tiene dominio Shopify configurado.', result: null }
  }

  const result = await ingestShopifyCatalog(business.id, business.shopify_domain)
  revalidatePath('/dashboard/catalogo')
  return { error: result.errors[0] ?? null, result }
}
