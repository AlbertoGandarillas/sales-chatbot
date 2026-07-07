// Crea (o reutiliza) un usuario de prueba con rol catalog en un negocio.
// Uso:
//   node scripts/setup-catalog-test-user.mjs
//   node scripts/setup-catalog-test-user.mjs --email catalogo.test@ejemplo.com --business Cruje
//
// Requiere migración aplicada (verify-team-migration.mjs primero).

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
    if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim()
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const testEmail = arg('--email', 'catalogo.test@uru.local')
const businessName = arg('--business', 'Cruje')

if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

async function ensureUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'CatalogTest2026!',
  })
  if (!error && data?.user) return { user: data.user, created: true }

  const existing = await findUserByEmail(email)
  if (existing) return { user: existing, created: false }

  throw new Error(`No se pudo crear usuario ${email}: ${error?.message}`)
}

async function main() {
  const { data: business, error: bizErr } = await admin
    .from('businesses')
    .select('id, name, owner_user_id')
    .ilike('name', businessName)
    .maybeSingle()

  if (bizErr || !business) {
    console.error(`Negocio "${businessName}" no encontrado.`)
    process.exit(1)
  }

  const { user, created } = await ensureUser(testEmail)
  console.log(
    `${created ? 'Usuario creado' : 'Usuario existente'}: ${testEmail} (${user.id.slice(0, 8)}…)`
  )
  if (created) {
    console.log('  Contraseña temporal: CatalogTest2026!')
    console.log('  (Cámbiala en Perfil → Seguridad tras el primer login)')
  }

  const { error: memberErr } = await admin.from('business_members').upsert(
    {
      business_id: business.id,
      user_id: user.id,
      role: 'catalog',
      invited_email: testEmail,
    },
    { onConflict: 'business_id,user_id' }
  )

  if (memberErr) {
    console.error('Error al agregar miembro:', memberErr.message)
    if (memberErr.message.includes('business_members')) {
      console.error('Ejecuta primero: node scripts/verify-team-migration.mjs')
    }
    process.exit(1)
  }

  console.log(`✓ Rol catalog en "${business.name}"`)
  console.log('\nPrueba manual:')
  console.log(`  1. Login en /login con ${testEmail}`)
  console.log('  2. Debe ver solo Resumen + Catálogo en el nav')
  console.log('  3. /dashboard/bot y /dashboard/perfil deben redirigir')
  console.log('  4. Editar precio/disponibilidad inline en catálogo')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
