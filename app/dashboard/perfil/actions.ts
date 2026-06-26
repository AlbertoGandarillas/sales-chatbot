'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'

export type ProfileState = { error: string | null; ok: boolean }

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createServerSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .maybeSingle()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'El nombre es obligatorio.', ok: false }

  const systemPrompt = String(formData.get('system_prompt_custom') ?? '').trim()
  const ownerWhatsapp = String(formData.get('owner_whatsapp_number') ?? '').trim()
  const shopify = String(formData.get('shopify_domain') ?? '').trim()

  const payload: Record<string, unknown> = {
    name,
    system_prompt_custom: systemPrompt || null,
    owner_whatsapp_number: ownerWhatsapp || null,
    supports_custom_orders: formData.get('supports_custom_orders') != null,
    // El dominio Shopify se puede agregar en cualquier momento (catálogo propio →
    // Shopify). El cambio de catalog_source ocurre al sincronizar el catálogo.
    shopify_domain: shopify || null,
  }

  const { error } = await supabase
    .from('businesses')
    .update(payload)
    .eq('id', business.id)

  if (error) return { error: error.message, ok: false }

  revalidatePath('/dashboard/perfil')
  revalidatePath('/dashboard')
  return { error: null, ok: true }
}
