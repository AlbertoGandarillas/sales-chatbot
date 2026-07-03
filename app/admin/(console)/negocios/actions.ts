'use server'

import { revalidatePath } from 'next/cache'
import { requirePlatformAdminWithClient } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'

export type AdminBusinessState = { error: string | null; ok: boolean }

const initial: AdminBusinessState = { error: null, ok: false }

export async function updateBusinessGeneral(
  _prev: AdminBusinessState,
  formData: FormData
): Promise<AdminBusinessState> {
  const { supabase, session } = await requirePlatformAdminWithClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'ID inválido.', ok: false }

  const name = String(formData.get('name') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim()
  const catalogSource = String(formData.get('catalog_source') ?? 'manual')
  const shopifyDomain = String(formData.get('shopify_domain') ?? '').trim() || null
  const ownerWhatsapp = String(formData.get('owner_whatsapp_number') ?? '').trim() || null
  const systemPrompt = String(formData.get('system_prompt_custom') ?? '').trim() || null
  const supportsCustom = formData.get('supports_custom_orders') === 'on'

  if (!name || !slug) {
    return { error: 'Nombre y slug son obligatorios.', ok: false }
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      name,
      slug,
      catalog_source: catalogSource === 'shopify' ? 'shopify' : 'manual',
      shopify_domain: shopifyDomain,
      owner_whatsapp_number: ownerWhatsapp,
      system_prompt_custom: systemPrompt,
      supports_custom_orders: supportsCustom,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message, ok: false }

  await logAdminAction(session.userId, 'business.update_general', 'business', id, {
    name,
    slug,
  })

  revalidatePath('/admin/negocios')
  revalidatePath(`/admin/negocios/${id}`)
  return { ...initial, ok: true }
}

export async function updateBusinessWhatsApp(
  _prev: AdminBusinessState,
  formData: FormData
): Promise<AdminBusinessState> {
  const { supabase, session } = await requirePlatformAdminWithClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'ID inválido.', ok: false }

  const phoneNumberId = String(formData.get('whatsapp_phone_number_id') ?? '').trim() || null
  const token = String(formData.get('whatsapp_token') ?? '').trim() || null

  const { error } = await supabase
    .from('businesses')
    .update({
      whatsapp_phone_number_id: phoneNumberId,
      whatsapp_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message, ok: false }

  await logAdminAction(session.userId, 'business.update_whatsapp', 'business', id, {
    whatsapp_phone_number_id: phoneNumberId,
    token_updated: Boolean(token),
  })

  revalidatePath('/admin/negocios')
  revalidatePath(`/admin/negocios/${id}`)
  return { ...initial, ok: true }
}
