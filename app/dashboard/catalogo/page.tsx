import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'
import { CatalogClient, type Product } from './catalog-client'

export const maxDuration = 60

export default async function CatalogoPage() {
  const business = await getOwnerBusiness()
  if (!business) return null
  const supabase = await createServerSupabase()

  const { data } = await supabase
    .from('products')
    .select(
      'id, name, description, category, price_soles, is_custom_order, available, needs_review, talla_range, color_o_material, image_url, image_storage_path, source, promo_price_soles, promo_starts_at, promo_ends_at, promo_label'
    )
    .eq('business_id', business.id)
    .order('needs_review', { ascending: false })
    .order('name', { ascending: true })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <CatalogClient
        products={(data as Product[]) ?? []}
        catalogSource={business.catalog_source}
        shopifyDomain={business.shopify_domain}
      />
    </main>
  )
}
