import type { SupabaseClient } from '@supabase/supabase-js'
import { effectivePrice } from '@/lib/pricing'

export type OrderSource = 'chat' | 'recurring' | 'manual'

export interface OrderLineItem {
  product_id: string
  name: string
  quantity: number
  unit_price: number
  compare_at_soles?: number
  promo_label?: string | null
  talla_solicitada?: string
  color_solicitado?: string
}

export interface CreateCatalogOrderInput {
  db: SupabaseClient
  businessId: string
  conversationId: string
  items: {
    product_id: string
    quantity: number
    talla_solicitada?: string
    color_solicitado?: string
  }[]
  source?: OrderSource
  recurring_order_id?: string | null
  notes?: string | null
}

export interface CreateCatalogOrderResult {
  order_id: string
  total_soles: number
  items: OrderLineItem[]
  status: 'pending'
}

export async function createCatalogOrder(
  input: CreateCatalogOrderInput
): Promise<CreateCatalogOrderResult> {
  const {
    db,
    businessId,
    conversationId,
    items,
    source = 'chat',
    recurring_order_id = null,
    notes = null,
  } = input

  const orderItems: OrderLineItem[] = []
  let totalSoles = 0
  const now = new Date()

  for (const item of items) {
    const { data: product, error } = await db
      .from('products')
      .select(
        'id, name, price_soles, is_custom_order, available, promo_price_soles, promo_starts_at, promo_ends_at, promo_label'
      )
      .eq('id', item.product_id)
      .eq('business_id', businessId)
      .single()

    if (error || !product) {
      throw new Error(`Producto no encontrado: ${item.product_id}`)
    }
    if (!product.available) {
      throw new Error(`Producto no disponible: ${product.name}`)
    }
    if (product.is_custom_order) {
      throw new Error(
        `${product.name} requiere encargo personalizado, no pedido directo`
      )
    }

    const pricing = effectivePrice(product, now)
    const orderItem: OrderLineItem = {
      product_id: product.id,
      name: product.name,
      quantity: item.quantity,
      unit_price: pricing.price,
    }
    if (pricing.onPromo && pricing.compareAt != null) {
      orderItem.compare_at_soles = pricing.compareAt
    }
    if (pricing.promoLabel) {
      orderItem.promo_label = pricing.promoLabel
    }
    if (item.talla_solicitada) {
      orderItem.talla_solicitada = item.talla_solicitada
    }
    if (item.color_solicitado) {
      orderItem.color_solicitado = item.color_solicitado
    }
    orderItems.push(orderItem)
    totalSoles += pricing.price * item.quantity
  }

  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
      business_id: businessId,
      conversation_id: conversationId,
      status: 'pending',
      items: orderItems,
      total_soles: totalSoles,
      is_custom_order: false,
      source,
      recurring_order_id,
      notes,
    })
    .select('id')
    .single()

  if (orderError) throw orderError

  return {
    order_id: order.id,
    total_soles: totalSoles,
    items: orderItems,
    status: 'pending',
  }
}

export function formatOrderItemsSummary(
  items: { quantity: number; name: string }[]
): string {
  return items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
}

export function formatSoles(total: number): string {
  return `S/ ${total.toFixed(2)}`
}
