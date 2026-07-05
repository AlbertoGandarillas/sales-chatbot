'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { BOT_FIELD_LIMITS, FAQ_CATEGORIES } from '@/lib/bot-config'
import { parseBotConfigFromForm } from '@/lib/knowledge-import'

export type BotStudioState = { error: string | null; ok: boolean }

const ok: BotStudioState = { error: null, ok: true }
const fail = (error: string): BotStudioState => ({ error, ok: false })

async function requireBusinessId(): Promise<
  { businessId: string } | { error: string }
> {
  const supabase = await createServerSupabase()
  const { data: business } = await supabase.from('businesses').select('id').maybeSingle()
  if (!business) return { error: 'Sesión sin negocio.' }
  return { businessId: business.id }
}

export async function updateBotConfig(
  _prev: BotStudioState,
  formData: FormData
): Promise<BotStudioState> {
  const biz = await requireBusinessId()
  if ('error' in biz) return fail(biz.error)

  const supabase = await createServerSupabase()
  const payload = parseBotConfigFromForm(formData)

  const { error } = await supabase
    .from('businesses')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', biz.businessId)

  if (error) return fail(error.message)

  revalidatePath('/dashboard/bot')
  return ok
}

export async function saveFaq(
  _prev: BotStudioState,
  formData: FormData
): Promise<BotStudioState> {
  const biz = await requireBusinessId()
  if ('error' in biz) return fail(biz.error)

  const id = String(formData.get('id') ?? '').trim()
  const category = String(formData.get('category') ?? 'general').trim()
  const question = String(formData.get('question') ?? '').trim()
  const answer = String(formData.get('answer') ?? '').trim()
  const isActive = formData.get('is_active') != null
  const sortOrder = Number(formData.get('sort_order') ?? 0)

  if (!question || !answer) return fail('Pregunta y respuesta son obligatorias.')
  if (!FAQ_CATEGORIES.includes(category as (typeof FAQ_CATEGORIES)[number])) {
    return fail('Categoría inválida.')
  }

  const row = {
    category,
    question: question.slice(0, BOT_FIELD_LIMITS.faq_question),
    answer: answer.slice(0, BOT_FIELD_LIMITS.faq_answer),
    is_active: isActive,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    updated_at: new Date().toISOString(),
  }

  const supabase = await createServerSupabase()

  if (id) {
    const { error } = await supabase
      .from('business_faqs')
      .update(row)
      .eq('id', id)
      .eq('business_id', biz.businessId)
    if (error) return fail(error.message)
  } else {
    const { error } = await supabase.from('business_faqs').insert({
      ...row,
      business_id: biz.businessId,
    })
    if (error) return fail(error.message)
  }

  revalidatePath('/dashboard/bot')
  return ok
}

export async function deleteFaq(
  _prev: BotStudioState,
  formData: FormData
): Promise<BotStudioState> {
  const biz = await requireBusinessId()
  if ('error' in biz) return fail(biz.error)

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return fail('FAQ inválida.')

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('business_faqs')
    .delete()
    .eq('id', id)
    .eq('business_id', biz.businessId)

  if (error) return fail(error.message)
  revalidatePath('/dashboard/bot')
  return ok
}

export async function saveArticle(
  _prev: BotStudioState,
  formData: FormData
): Promise<BotStudioState> {
  const biz = await requireBusinessId()
  if ('error' in biz) return fail(biz.error)

  const id = String(formData.get('id') ?? '').trim()
  const category = String(formData.get('category') ?? 'general').trim()
  const title = String(formData.get('title') ?? '').trim()
  const content = String(formData.get('content') ?? '').trim()
  const isActive = formData.get('is_active') != null

  if (!title || !content) return fail('Título y contenido son obligatorios.')

  const row = {
    category,
    title: title.slice(0, BOT_FIELD_LIMITS.article_title),
    content: content.slice(0, BOT_FIELD_LIMITS.article_content),
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }

  const supabase = await createServerSupabase()

  if (id) {
    const { error } = await supabase
      .from('business_knowledge_articles')
      .update(row)
      .eq('id', id)
      .eq('business_id', biz.businessId)
    if (error) return fail(error.message)
  } else {
    const { error } = await supabase.from('business_knowledge_articles').insert({
      ...row,
      business_id: biz.businessId,
    })
    if (error) return fail(error.message)
  }

  revalidatePath('/dashboard/bot')
  return ok
}

export async function deleteArticle(
  _prev: BotStudioState,
  formData: FormData
): Promise<BotStudioState> {
  const biz = await requireBusinessId()
  if ('error' in biz) return fail(biz.error)

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return fail('Artículo inválido.')

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('business_knowledge_articles')
    .delete()
    .eq('id', id)
    .eq('business_id', biz.businessId)

  if (error) return fail(error.message)
  revalidatePath('/dashboard/bot')
  return ok
}
