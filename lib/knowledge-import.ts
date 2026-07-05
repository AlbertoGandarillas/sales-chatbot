import type { FaqCategory } from '@/lib/bot-config'
import { BOT_FIELD_LIMITS, trimBotField } from '@/lib/bot-config'
import { createServiceClient } from '@/lib/supabase'

export interface BotKnowledgeImportPayload {
  bot_name?: string | null
  bot_greeting?: string | null
  bot_tone?: string | null
  policy_shipping?: string | null
  policy_payment?: string | null
  policy_returns?: string | null
  bot_extra_notes?: string | null
  faqs?: Array<{
    category?: string
    question: string
    answer: string
    sort_order?: number
    is_active?: boolean
  }>
  articles?: Array<{
    category?: string
    title: string
    content: string
    is_active?: boolean
  }>
}

function clampImportString(
  value: unknown,
  max: number
): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, max)
}

export async function importBotKnowledge(
  businessId: string,
  payload: BotKnowledgeImportPayload,
  options: { replaceFaqs?: boolean; replaceArticles?: boolean } = {}
): Promise<{ faqsImported: number; articlesImported: number }> {
  const db = createServiceClient()

  const businessUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if ('bot_name' in payload)
    businessUpdate.bot_name = clampImportString(payload.bot_name, BOT_FIELD_LIMITS.bot_name)
  if ('bot_greeting' in payload)
    businessUpdate.bot_greeting = clampImportString(
      payload.bot_greeting,
      BOT_FIELD_LIMITS.bot_greeting
    )
  if ('bot_tone' in payload)
    businessUpdate.bot_tone = clampImportString(payload.bot_tone, BOT_FIELD_LIMITS.bot_tone)
  if ('policy_shipping' in payload)
    businessUpdate.policy_shipping = clampImportString(
      payload.policy_shipping,
      BOT_FIELD_LIMITS.policy_shipping
    )
  if ('policy_payment' in payload)
    businessUpdate.policy_payment = clampImportString(
      payload.policy_payment,
      BOT_FIELD_LIMITS.policy_payment
    )
  if ('policy_returns' in payload)
    businessUpdate.policy_returns = clampImportString(
      payload.policy_returns,
      BOT_FIELD_LIMITS.policy_returns
    )
  if ('bot_extra_notes' in payload)
    businessUpdate.bot_extra_notes = clampImportString(
      payload.bot_extra_notes,
      BOT_FIELD_LIMITS.bot_extra_notes
    )

  if (Object.keys(businessUpdate).length > 1) {
    const { error } = await db
      .from('businesses')
      .update(businessUpdate)
      .eq('id', businessId)
    if (error) throw new Error(error.message)
  }

  let faqsImported = 0
  let articlesImported = 0

  if (payload.faqs?.length) {
    if (options.replaceFaqs) {
      await db.from('business_faqs').delete().eq('business_id', businessId)
    }
    const rows = payload.faqs.map((f, i) => ({
      business_id: businessId,
      category: (f.category ?? 'general') as FaqCategory,
      question: String(f.question).trim().slice(0, BOT_FIELD_LIMITS.faq_question),
      answer: String(f.answer).trim().slice(0, BOT_FIELD_LIMITS.faq_answer),
      sort_order: f.sort_order ?? i,
      is_active: f.is_active !== false,
    }))
    const { error } = await db.from('business_faqs').insert(rows)
    if (error) throw new Error(error.message)
    faqsImported = rows.length
  }

  if (payload.articles?.length) {
    if (options.replaceArticles) {
      await db.from('business_knowledge_articles').delete().eq('business_id', businessId)
    }
    const rows = payload.articles.map((a) => ({
      business_id: businessId,
      category: a.category ?? 'general',
      title: String(a.title).trim().slice(0, BOT_FIELD_LIMITS.article_title),
      content: String(a.content).trim().slice(0, BOT_FIELD_LIMITS.article_content),
      is_active: a.is_active !== false,
    }))
    const { error } = await db.from('business_knowledge_articles').insert(rows)
    if (error) throw new Error(error.message)
    articlesImported = rows.length
  }

  return { faqsImported, articlesImported }
}

export function parseBotConfigFromForm(formData: FormData) {
  return {
    bot_name: trimBotField(formData.get('bot_name'), BOT_FIELD_LIMITS.bot_name),
    bot_greeting: trimBotField(formData.get('bot_greeting'), BOT_FIELD_LIMITS.bot_greeting),
    bot_tone: trimBotField(formData.get('bot_tone'), BOT_FIELD_LIMITS.bot_tone),
    policy_shipping: trimBotField(
      formData.get('policy_shipping'),
      BOT_FIELD_LIMITS.policy_shipping
    ),
    policy_payment: trimBotField(
      formData.get('policy_payment'),
      BOT_FIELD_LIMITS.policy_payment
    ),
    policy_returns: trimBotField(
      formData.get('policy_returns'),
      BOT_FIELD_LIMITS.policy_returns
    ),
    bot_extra_notes: trimBotField(
      formData.get('bot_extra_notes'),
      BOT_FIELD_LIMITS.bot_extra_notes
    ),
  }
}
