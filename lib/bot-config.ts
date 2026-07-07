import type { Business, CatalogSource } from '@/lib/business-resolver'

export const BOT_FIELD_LIMITS = {
  bot_name: 80,
  bot_greeting: 800,
  bot_tone: 500,
  policy_shipping: 3000,
  policy_payment: 2000,
  policy_returns: 2000,
  bot_extra_notes: 1500,
  faq_question: 500,
  faq_answer: 4000,
  article_title: 200,
  article_content: 12000,
} as const

export const FAQ_CATEGORIES = [
  'general',
  'producto',
  'envios',
  'pagos',
  'devoluciones',
  'horario',
  'tienda',
  'ofertas',
  'otros',
] as const

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]

export interface BotStudioFields {
  bot_name: string | null
  bot_greeting: string | null
  bot_tone: string | null
  policy_shipping: string | null
  policy_payment: string | null
  policy_returns: string | null
  bot_extra_notes: string | null
  bot_use_legacy_prompt: boolean | null
  system_prompt_custom: string | null
}

export function trimBotField(
  value: FormDataEntryValue | null | undefined,
  max: number
): string | null {
  const s = String(value ?? '').trim()
  if (!s) return null
  return s.slice(0, max)
}

export function defaultBotName(businessName: string): string {
  return `asistente de ventas de ${businessName}`
}

export function defaultBotTone(catalogSource: CatalogSource): string {
  if (catalogSource === 'shopify') {
    return 'Hablas en español peruano, cercano y con buena onda. Tuteas al cliente. Mensajes cortos, ideales para WhatsApp. Usas "S/" para precios.'
  }
  return 'Hablas en español peruano, de forma cercana y cálida. Tuteas al cliente. Eres paciente, servicial y conoces bien el catálogo. Usas "S/" para precios. Mensajes cortos, ideales para WhatsApp.'
}

export function defaultBotGreeting(
  businessName: string,
  catalogSource: CatalogSource
): string {
  if (catalogSource === 'shopify') {
    return `Cuando el cliente salude por primera vez, dale la bienvenida y pregúntale qué busca o para qué ocasión.`
  }
  return `Cuando el cliente salude por primera vez, dale la bienvenida a ${businessName} y pregúntale en qué puedes ayudarle hoy.`
}

export function defaultPolicyPayment(catalogSource: CatalogSource): string | null {
  if (catalogSource === 'shopify') {
    return 'Yape, Plin, transferencia o efectivo, según coordine el equipo.'
  }
  return null
}

export function resolveExtraNotes(fields: BotStudioFields): string | null {
  const notes = fields.bot_extra_notes?.trim()
  if (notes) return notes
  return fields.system_prompt_custom?.trim() || null
}

export const EMPTY_BOT_FIELDS: Pick<
  Business,
  | 'bot_name'
  | 'bot_greeting'
  | 'bot_tone'
  | 'policy_shipping'
  | 'policy_payment'
  | 'policy_returns'
  | 'bot_extra_notes'
  | 'bot_use_legacy_prompt'
> = {
  bot_name: null,
  bot_greeting: null,
  bot_tone: null,
  policy_shipping: null,
  policy_payment: null,
  policy_returns: null,
  bot_extra_notes: null,
  bot_use_legacy_prompt: false,
}

export function ownerBusinessAsPromptBusiness(
  b: BotStudioFields & {
    id: string
    name: string
    catalog_source: CatalogSource
    supports_custom_orders: boolean
  }
): Business {
  return {
    id: b.id,
    name: b.name,
    slug: '',
    catalog_source: b.catalog_source,
    supports_custom_orders: b.supports_custom_orders,
    whatsapp_phone_number_id: null,
    whatsapp_token: null,
    owner_whatsapp_number: null,
    notify_new_orders: true,
    shopify_domain: null,
    owner_user_id: null,
    system_prompt_custom: b.system_prompt_custom,
    bot_name: b.bot_name,
    bot_greeting: b.bot_greeting,
    bot_tone: b.bot_tone,
    policy_shipping: b.policy_shipping,
    policy_payment: b.policy_payment,
    policy_returns: b.policy_returns,
    bot_extra_notes: b.bot_extra_notes,
    bot_use_legacy_prompt: b.bot_use_legacy_prompt === true,
  }
}
