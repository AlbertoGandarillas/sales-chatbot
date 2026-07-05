#!/usr/bin/env node
/**
 * Importa Bot Studio desde JSON para cualquier negocio.
 *
 * Uso:
 *   node scripts/import-bot-knowledge.mjs --business-id=<uuid> --file=cliente.json
 *   node scripts/import-bot-knowledge.mjs --business-id=<uuid> --file=cliente.json --replace-faqs
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)

const businessId = args['business-id']
const file = args.file
const replaceFaqs = args['replace-faqs'] === true
const replaceArticles = args['replace-articles'] === true

if (!businessId || !file) {
  console.error(
    'Uso: node scripts/import-bot-knowledge.mjs --business-id=<uuid> --file=cliente.json'
  )
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const payload = JSON.parse(fs.readFileSync(file, 'utf8'))
const db = createClient(url, key)

const businessUpdate = {}
const fields = [
  'bot_name',
  'bot_greeting',
  'bot_tone',
  'policy_shipping',
  'policy_payment',
  'policy_returns',
  'bot_extra_notes',
]
for (const f of fields) {
  if (f in payload) businessUpdate[f] = payload[f] ?? null
}
if (Object.keys(businessUpdate).length) {
  const { error } = await db
    .from('businesses')
    .update({ ...businessUpdate, updated_at: new Date().toISOString() })
    .eq('id', businessId)
  if (error) {
    console.error('Error actualizando negocio:', error.message)
    process.exit(1)
  }
}

if (payload.faqs?.length) {
  if (replaceFaqs) {
    await db.from('business_faqs').delete().eq('business_id', businessId)
  }
  const rows = payload.faqs.map((f, i) => ({
    business_id: businessId,
    category: f.category ?? 'general',
    question: String(f.question).trim(),
    answer: String(f.answer).trim(),
    sort_order: f.sort_order ?? i,
    is_active: f.is_active !== false,
  }))
  const { error } = await db.from('business_faqs').insert(rows)
  if (error) {
    console.error('Error insertando FAQs:', error.message)
    process.exit(1)
  }
  console.log(`FAQs importadas: ${rows.length}`)
}

if (payload.articles?.length) {
  if (replaceArticles) {
    await db.from('business_knowledge_articles').delete().eq('business_id', businessId)
  }
  const rows = payload.articles.map((a) => ({
    business_id: businessId,
    category: a.category ?? 'general',
    title: String(a.title).trim(),
    content: String(a.content).trim(),
    is_active: a.is_active !== false,
  }))
  const { error } = await db.from('business_knowledge_articles').insert(rows)
  if (error) {
    console.error('Error insertando artículos:', error.message)
    process.exit(1)
  }
  console.log(`Artículos importados: ${rows.length}`)
}

console.log('Importación OK para negocio', businessId)
