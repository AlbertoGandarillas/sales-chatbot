export interface CatalogProduct {
  id: string
  name: string
  description: string | null
  category: string
  price_soles: number
  is_custom_order: boolean
  available: boolean
  needs_review: boolean
  talla_range: string | null
  color_o_material: string | null
  image_url: string | null
  image_storage_path: string | null
  source: string
  promo_price_soles: number | null
  promo_starts_at: string | null
  promo_ends_at: string | null
  promo_label: string | null
}
