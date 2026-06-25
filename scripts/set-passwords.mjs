// Asigna una contraseña por defecto a los usuarios seed (pruebas).
// Uso: node scripts/set-passwords.mjs
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

const DEFAULT_PASSWORD = 'password2026'
const EMAILS = ['acgl2015@gmail.com', 'albertogandarillas@hotmail.com']

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 1000) break
  }
  return null
}

for (const email of EMAILS) {
  const user = await findUserByEmail(email)
  if (!user) {
    console.log(`✗ No encontrado: ${email}`)
    continue
  }
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: DEFAULT_PASSWORD,
    email_confirm: true,
  })
  if (error) {
    console.log(`✗ ${email}: ${error.message}`)
  } else {
    console.log(`✓ ${email} -> contraseña actualizada a "${DEFAULT_PASSWORD}"`)
  }
}

console.log('\nListo.')
