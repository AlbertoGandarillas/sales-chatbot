// M1 — Alta de usuarios (magic link) y vinculación de negocios Cruje y Betta.
// Uso: node scripts/seed-tenants.mjs
// Requiere en .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TOKEN, OWNER_WHATSAPP_NUMBER

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!(key in process.env)) process.env[key] = value
    }
  } catch (err) {
    console.error('No se pudo leer .env:', err.message)
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRUJE_BUSINESS_ID = 'a0000000-0000-4000-8000-000000000001'

const TENANTS = [
  { label: 'Cruje', email: 'acgl2015@gmail.com' },
  { label: 'Betta', email: 'albertogandarillas@hotmail.com' },
]

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserByEmail(email) {
  // listUsers pagina; con pocos usuarios alcanza la primera página
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 1000) break
  }
  return null
}

async function ensureUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // permite login posterior por magic link sin password
  })
  if (!error && data?.user) return { user: data.user, created: true }

  // Si ya existe, buscarlo
  const existing = await findUserByEmail(email)
  if (existing) return { user: existing, created: false }

  throw new Error(`No se pudo crear ni encontrar el usuario ${email}: ${error?.message}`)
}

async function main() {
  const users = {}
  for (const t of TENANTS) {
    const { user, created } = await ensureUser(t.email)
    users[t.label] = user.id
    console.log(`${created ? 'Creado' : 'Existente'}: ${t.label} <${t.email}> -> ${user.id}`)
  }

  // Cruje: UPDATE sobre la fila existente (no recrear)
  const { error: crujeErr } = await admin
    .from('businesses')
    .update({
      vertical: 'bakery',
      owner_user_id: users.Cruje,
      whatsapp_phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
      whatsapp_token: process.env.WHATSAPP_TOKEN ?? null,
      owner_whatsapp_number: process.env.OWNER_WHATSAPP_NUMBER ?? null,
    })
    .eq('id', CRUJE_BUSINESS_ID)
  if (crujeErr) throw crujeErr
  console.log('Cruje vinculado (UPDATE) con owner_user_id y credenciales WhatsApp.')

  // Betta: fila nueva (idempotente por slug)
  const { data: existingBetta } = await admin
    .from('businesses')
    .select('id')
    .eq('slug', 'betta')
    .maybeSingle()

  if (existingBetta) {
    const { error } = await admin
      .from('businesses')
      .update({
        vertical: 'retail',
        shopify_domain: 'www.betta-footwear.com',
        owner_user_id: users.Betta,
      })
      .eq('id', existingBetta.id)
    if (error) throw error
    console.log(`Betta ya existía (${existingBetta.id}); actualizado owner y shopify_domain.`)
  } else {
    const { data: betta, error } = await admin
      .from('businesses')
      .insert({
        name: 'Betta',
        slug: 'betta',
        description: 'Tienda de zapatillas (retail) sobre Shopify',
        vertical: 'retail',
        shopify_domain: 'www.betta-footwear.com',
        owner_user_id: users.Betta,
      })
      .select('id')
      .single()
    if (error) throw error
    console.log(`Betta creado (INSERT) -> ${betta.id}`)
  }

  console.log('\nSeed de tenants completado.')
}

main().catch((err) => {
  console.error('Error en seed-tenants:', err.message ?? err)
  process.exit(1)
})
