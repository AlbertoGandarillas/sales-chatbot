import { createServiceClient } from '@/lib/supabase'
import type { Business } from '@/lib/business-resolver'
import { defaultPolicyPayment, resolveExtraNotes } from '@/lib/bot-config'

export interface KnowledgeHit {
  type: 'faq' | 'policy' | 'article'
  category: string
  title: string
  content: string
}

export interface KnowledgeSearchResult {
  query: string
  hits: KnowledgeHit[]
}

const POLICY_KEYWORDS: { keys: string[]; field: keyof Business; label: string }[] = [
  {
    keys: ['envio', 'envío', 'delivery', 'courier', 'olva', 'shalom', 'delivery'],
    field: 'policy_shipping',
    label: 'Política de envíos',
  },
  {
    keys: ['pago', 'yape', 'plin', 'tarjeta', 'efectivo', 'transferencia', 'contraentrega'],
    field: 'policy_payment',
    label: 'Formas de pago',
  },
  {
    keys: ['devoluc', 'cambio', 'reclamo', 'garant'],
    field: 'policy_returns',
    label: 'Cambios y devoluciones',
  },
]

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

function policySnippets(business: Business, query: string): KnowledgeHit[] {
  const q = normalizeQuery(query)
  const hits: KnowledgeHit[] = []

  for (const rule of POLICY_KEYWORDS) {
    if (!rule.keys.some((k) => q.includes(k))) continue
    let text: string | null = null
    if (rule.field === 'policy_shipping') text = business.policy_shipping?.trim() || null
    if (rule.field === 'policy_payment') {
      text =
        business.policy_payment?.trim() ||
        defaultPolicyPayment(business.catalog_source)
    }
    if (rule.field === 'policy_returns') text = business.policy_returns?.trim() || null
    if (text) {
      hits.push({
        type: 'policy',
        category: rule.field.replace('policy_', ''),
        title: rule.label,
        content: text,
      })
    }
  }

  const extra = resolveExtraNotes(business)
  if (
    extra &&
    (q.includes('horario') ||
      q.includes('oferta') ||
      q.includes('promo') ||
      q.includes('nota'))
  ) {
    hits.push({
      type: 'policy',
      category: 'general',
      title: 'Notas del negocio',
      content: extra,
    })
  }

  return hits
}

export async function searchBusinessKnowledge(
  business: Business,
  query: string,
  category?: string | null
): Promise<KnowledgeSearchResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { query: trimmed, hits: [] }
  }

  const db = createServiceClient()
  const hits: KnowledgeHit[] = [...policySnippets(business, trimmed)]

  let faqQuery = db
    .from('business_faqs')
    .select('category, question, answer')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .limit(5)

  if (category) {
    faqQuery = faqQuery.eq('category', category)
  }

  const tsQuery = trimmed.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  if (tsQuery.length >= 2) {
    faqQuery = faqQuery.textSearch('search_vector', tsQuery, {
      type: 'plain',
      config: 'spanish',
    })
  } else {
    faqQuery = faqQuery.or(
      `question.ilike.%${trimmed}%,answer.ilike.%${trimmed}%`
    )
  }

  const { data: faqs } = await faqQuery

  for (const row of faqs ?? []) {
    hits.push({
      type: 'faq',
      category: row.category,
      title: row.question,
      content: row.answer,
    })
  }

  if (hits.filter((h) => h.type === 'faq').length < 3) {
    const { data: fallbackFaqs } = await db
      .from('business_faqs')
      .select('category, question, answer')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .or(`question.ilike.%${trimmed}%,answer.ilike.%${trimmed}%`)
      .limit(5)

    for (const row of fallbackFaqs ?? []) {
      if (hits.some((h) => h.type === 'faq' && h.title === row.question)) continue
      hits.push({
        type: 'faq',
        category: row.category,
        title: row.question,
        content: row.answer,
      })
    }
  }

  let articleQuery = db
    .from('business_knowledge_articles')
    .select('category, title, content')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .limit(3)

  if (category) {
    articleQuery = articleQuery.eq('category', category)
  }

  if (tsQuery.length >= 2) {
    articleQuery = articleQuery.textSearch('search_vector', tsQuery, {
      type: 'plain',
      config: 'spanish',
    })
  } else {
    articleQuery = articleQuery.or(
      `title.ilike.%${trimmed}%,content.ilike.%${trimmed}%`
    )
  }

  const { data: articles } = await articleQuery

  for (const row of articles ?? []) {
    hits.push({
      type: 'article',
      category: row.category,
      title: row.title,
      content: row.content.slice(0, 2000),
    })
  }

  const seen = new Set<string>()
  const deduped = hits.filter((h) => {
    const k = `${h.type}:${h.title}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return { query: trimmed, hits: deduped.slice(0, 8) }
}
