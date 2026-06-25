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
    .select('id, vertical')
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
  }
  // shopify_domain solo aplica a retail
  if (business.vertical === 'retail') {
    payload.shopify_domain = shopify || null
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
