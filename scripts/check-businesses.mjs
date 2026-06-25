// Inspecciona credenciales WhatsApp por negocio.
// Uso: node scripts/check-businesses.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (!(k in process.env)) process.env[k] = v
  }
}
loadEnv()

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const { data, error } = await admin
  .from('businesses')
  .select('name, slug, vertical, whatsapp_phone_number_id, whatsapp_token, owner_whatsapp_number, shopify_domain')
  .order('name')

if (error) {
  console.error(error)
  process.exit(1)
}

for (const b of data) {
  console.log(`\n=== ${b.name} (${b.slug}) — ${b.vertical} ===`)
  console.log('  phone_number_id :', b.whatsapp_phone_number_id ?? '(NULL)')
  console.log('  whatsapp_token  :', b.whatsapp_token ? `set (${b.whatsapp_token.length} chars)` : '(NULL)')
  console.log('  owner_whatsapp  :', b.owner_whatsapp_number ?? '(NULL)')
  console.log('  shopify_domain  :', b.shopify_domain ?? '(NULL)')
}
