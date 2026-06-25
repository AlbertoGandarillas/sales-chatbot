// Verificación de M1: estado de businesses y conteos de Cruje.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!(t.slice(0, eq).trim() in process.env)) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const CRUJE = 'a0000000-0000-4000-8000-000000000001'

const { data: businesses } = await admin
  .from('businesses')
  .select('id, name, slug, vertical, whatsapp_phone_number_id, shopify_domain, owner_user_id')
  .order('created_at', { ascending: true })

console.log('businesses:')
console.table(
  businesses.map((b) => ({
    name: b.name,
    vertical: b.vertical,
    phone_id: b.whatsapp_phone_number_id ?? '—',
    shopify: b.shopify_domain ?? '—',
    owner: b.owner_user_id ? b.owner_user_id.slice(0, 8) : '—',
  }))
)

const { count: prodCount } = await admin
  .from('products')
  .select('*', { count: 'exact', head: true })
  .eq('business_id', CRUJE)
const { count: convCount } = await admin
  .from('conversations')
  .select('*', { count: 'exact', head: true })
  .eq('business_id', CRUJE)
const { count: orderCount } = await admin
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .eq('business_id', CRUJE)

console.log(`\nCruje intacto -> productos: ${prodCount}, conversaciones: ${convCount}, pedidos: ${orderCount}`)
