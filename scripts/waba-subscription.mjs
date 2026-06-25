// Verifica (y opcionalmente crea) la suscripción del app a la WABA de un negocio.
// Uso:
//   node scripts/waba-subscription.mjs check            -> Betta por defecto
//   node scripts/waba-subscription.mjs check cruje
//   node scripts/waba-subscription.mjs subscribe betta  -> POST /subscribed_apps
//
// Lee el whatsapp_token del negocio desde la tabla businesses (Supabase).

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

const GRAPH = 'https://graph.facebook.com/v25.0'

// WABA IDs conocidos (de la consola de Meta). Ajustar si cambian.
const WABA_BY_SLUG = {
  betta: '1019361140742767',
  // cruje: '...'  // completar si se quiere chequear Cruje
}

const action = process.argv[2] ?? 'check'
const slug = (process.argv[3] ?? 'betta').toLowerCase()

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const { data: biz, error } = await admin
  .from('businesses')
  .select('name, slug, whatsapp_token, whatsapp_phone_number_id')
  .eq('slug', slug)
  .maybeSingle()

if (error || !biz) {
  console.error('No se encontró el negocio:', slug, error?.message ?? '')
  process.exit(1)
}

const token = biz.whatsapp_token
const wabaId = WABA_BY_SLUG[slug]
if (!token) {
  console.error(`El negocio ${slug} no tiene whatsapp_token en la base.`)
  process.exit(1)
}
if (!wabaId) {
  console.error(`No tengo el WABA ID de ${slug}. Agrégalo en WABA_BY_SLUG.`)
  process.exit(1)
}

console.log(`Negocio: ${biz.name} (${biz.slug})`)
console.log(`WABA ID: ${wabaId}`)
console.log(`phone_number_id: ${biz.whatsapp_phone_number_id}`)
console.log('---')

async function getSubscribedApps() {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  console.log('GET /subscribed_apps ->', res.status)
  console.log(JSON.stringify(json, null, 2))
  return json
}

async function subscribeApp() {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  console.log('POST /subscribed_apps ->', res.status)
  console.log(JSON.stringify(json, null, 2))
  return json
}

if (action === 'subscribe') {
  await subscribeApp()
  console.log('\nEstado tras suscribir:')
  await getSubscribedApps()
} else {
  await getSubscribedApps()
}
