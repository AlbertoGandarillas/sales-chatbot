import { createServerSupabase } from '@/lib/supabase/server'
import type { CatalogSource } from '@/lib/business-resolver'
import type { BotStudioFields } from '@/lib/bot-config'

export interface OwnerBusiness extends BotStudioFields {
  id: string
  name: string
  slug: string
  catalog_source: CatalogSource
  supports_custom_orders: boolean
  description: string | null
  owner_whatsapp_number: string | null
  shopify_domain: string | null
}

export interface BusinessFaqRow {
  id: string
  category: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

export interface KnowledgeArticleRow {
  id: string
  category: string
  title: string
  content: string
  is_active: boolean
}

const OWNER_BUSINESS_COLUMNS =
  'id, name, slug, catalog_source, supports_custom_orders, description, system_prompt_custom, owner_whatsapp_number, shopify_domain, bot_name, bot_greeting, bot_tone, policy_shipping, policy_payment, policy_returns, bot_extra_notes, bot_use_legacy_prompt'

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

export async function getOwnerFaqs(businessId: string): Promise<BusinessFaqRow[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('business_faqs')
    .select('id, category, question, answer, sort_order, is_active')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (data as BusinessFaqRow[]) ?? []
}

export async function getOwnerArticles(
  businessId: string
): Promise<KnowledgeArticleRow[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('business_knowledge_articles')
    .select('id, category, title, content, is_active')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  return (data as KnowledgeArticleRow[]) ?? []
}
