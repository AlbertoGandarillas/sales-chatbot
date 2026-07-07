import { createServiceClient } from '@/lib/supabase'

export type CatalogSource = 'manual' | 'shopify'

export interface Business {
  id: string
  name: string
  slug: string
  catalog_source: CatalogSource
  supports_custom_orders: boolean
  whatsapp_phone_number_id: string | null
  whatsapp_token: string | null
  owner_whatsapp_number: string | null
  notify_new_orders: boolean
  system_prompt_custom: string | null
  shopify_domain: string | null
  owner_user_id: string | null
  bot_name: string | null
  bot_greeting: string | null
  bot_tone: string | null
  policy_shipping: string | null
  policy_payment: string | null
  policy_returns: string | null
  bot_extra_notes: string | null
  bot_use_legacy_prompt: boolean | null
}

export const BUSINESS_COLUMNS =
  'id, name, slug, catalog_source, supports_custom_orders, whatsapp_phone_number_id, whatsapp_token, owner_whatsapp_number, notify_new_orders, system_prompt_custom, shopify_domain, owner_user_id, bot_name, bot_greeting, bot_tone, policy_shipping, policy_payment, policy_returns, bot_extra_notes, bot_use_legacy_prompt'

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
