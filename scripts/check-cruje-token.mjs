// Inspecciona el token guardado de Cruje (sin exponerlo completo).
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

const { data } = await admin
  .from('businesses')
  .select('name, whatsapp_phone_number_id, whatsapp_token')
  .eq('id', CRUJE)
  .single()

const tok = data.whatsapp_token ?? ''
const envTok = process.env.WHATSAPP_TOKEN ?? ''

console.log('=== Cruje en BD ===')
console.log('phone_number_id:', JSON.stringify(data.whatsapp_phone_number_id))
console.log('token length   :', tok.length)
console.log('token starts   :', JSON.stringify(tok.slice(0, 6)))
console.log('token ends     :', JSON.stringify(tok.slice(-10)))
console.log('tiene espacios :', /\s/.test(tok))
console.log('empieza con EAA:', tok.startsWith('EAA'))
console.log('')
console.log('=== .env local ===')
console.log('env token length:', envTok.length)
console.log('env token ends  :', JSON.stringify(envTok.slice(-10)))
console.log('BD == .env       :', tok === envTok)
