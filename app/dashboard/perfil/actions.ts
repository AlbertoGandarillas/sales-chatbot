'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireOwnerRole } from '@/lib/team-access'

export type ProfileState = { error: string | null; ok: boolean }

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const membership = await requireOwnerRole()
  const supabase = await createServerSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', membership.businessId)
    .maybeSingle()
  if (!business) return { error: 'Sesión sin negocio.', ok: false }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'El nombre es obligatorio.', ok: false }

  const ownerWhatsapp = String(formData.get('owner_whatsapp_number') ?? '').trim()
  const shopify = String(formData.get('shopify_domain') ?? '').trim()

  const payload: Record<string, unknown> = {
    name,
    owner_whatsapp_number: ownerWhatsapp || null,
    supports_custom_orders: formData.get('supports_custom_orders') != null,
    shopify_domain: shopify || null,
    notify_new_orders: formData.get('notify_new_orders') != null,
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
