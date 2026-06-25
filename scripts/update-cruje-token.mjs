// Actualiza el whatsapp_token (y phone_number_id / owner) de Cruje en la BD
// tomando los valores actuales del .env. Útil cuando el token temporal de Meta
// expira y hay que rotarlo.
// Uso: node scripts/update-cruje-token.mjs

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!(t.slice(0, eq).trim() in process.env)) {
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
}

const CRUJE_BUSINESS_ID = 'a0000000-0000-4000-8000-000000000001'
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const token = process.env.WHATSAPP_TOKEN
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
const owner = process.env.OWNER_WHATSAPP_NUMBER

if (!token) {
  console.error('Falta WHATSAPP_TOKEN en .env')
  process.exit(1)
}

const { error } = await admin
  .from('businesses')
  .update({
    whatsapp_token: token,
    whatsapp_phone_number_id: phoneId ?? null,
    owner_whatsapp_number: owner ?? null,
  })
  .eq('id', CRUJE_BUSINESS_ID)

if (error) {
  console.error('Error actualizando token de Cruje:', error.message)
  process.exit(1)
}

console.log('Token de Cruje actualizado en la BD.')
console.log(`  phone_number_id: ${phoneId}`)
console.log(`  token: ...${token.slice(-8)}`)
