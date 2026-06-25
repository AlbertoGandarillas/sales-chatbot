import { createServiceClient } from '@/lib/supabase'

export type Vertical = 'bakery' | 'retail'

export interface Business {
  id: string
  name: string
  slug: string
  vertical: Vertical
  whatsapp_phone_number_id: string | null
  whatsapp_token: string | null
  owner_whatsapp_number: string | null
  system_prompt_custom: string | null
  shopify_domain: string | null
  owner_user_id: string | null
}

const BUSINESS_COLUMNS =
  'id, name, slug, vertical, whatsapp_phone_number_id, whatsapp_token, owner_whatsapp_number, system_prompt_custom, shopify_domain, owner_user_id'

export async function getBusinessByPhoneNumberId(
  phoneNumberId: string
): Promise<Business | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .maybeSingle()

  if (error) {
    console.error('[business-resolver] Error consultando negocio:', error)
    return null
  }
  return (data as Business | null) ?? null
}

/**
 * Extrae el phone_number_id del payload de Meta y resuelve el negocio.
 * Estructura: entry[].changes[].value.metadata.phone_number_id
 */
export function extractPhoneNumberId(payload: unknown): string | null {
  try {
    const entries = (payload as { entry?: unknown[] })?.entry ?? []
    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] })?.changes ?? []
      for (const change of changes) {
        const phoneNumberId = (
          change as { value?: { metadata?: { phone_number_id?: string } } }
        )?.value?.metadata?.phone_number_id
        if (phoneNumberId) return phoneNumberId
      }
    }
  } catch (err) {
    console.error('[business-resolver] Error extrayendo phone_number_id:', err)
  }
  return null
}

export async function resolveBusinessFromWebhook(
  payload: unknown
): Promise<Business | null> {
  const phoneNumberId = extractPhoneNumberId(payload)
  if (!phoneNumberId) return null
  return getBusinessByPhoneNumberId(phoneNumberId)
}
