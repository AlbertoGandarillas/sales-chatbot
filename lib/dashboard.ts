import { createServerSupabase } from '@/lib/supabase/server'
import type { CatalogSource } from '@/lib/business-resolver'

export interface OwnerBusiness {
  id: string
  name: string
  slug: string
  catalog_source: CatalogSource
  supports_custom_orders: boolean
  description: string | null
  system_prompt_custom: string | null
  owner_whatsapp_number: string | null
  shopify_domain: string | null
}

const OWNER_BUSINESS_COLUMNS =
  'id, name, slug, catalog_source, supports_custom_orders, description, system_prompt_custom, owner_whatsapp_number, shopify_domain'

/**
 * Devuelve el negocio del usuario autenticado (RLS limita a su propia fila).
 * null si no hay sesión o el usuario aún no tiene negocio.
 */
export async function getOwnerBusiness(): Promise<OwnerBusiness | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('businesses')
    .select(OWNER_BUSINESS_COLUMNS)
    .maybeSingle()

  return (data as OwnerBusiness | null) ?? null
}
