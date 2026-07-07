// Verifica que la migración TN-1/TN-2 esté aplicada y que los dueños tengan fila owner.
// Uso: node scripts/verify-team-migration.mjs

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
    process.exit(1)
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { error: membersErr } = await admin.from('business_members').select('id').limit(1)

  if (membersErr) {
    console.error('❌ Tabla business_members no accesible:', membersErr.message)
    const ref = url ? new URL(url).hostname.split('.')[0] : null
    if (ref) {
      console.error(`\nSQL Editor: https://supabase.com/dashboard/project/${ref}/sql/new`)
    }
    console.error('\nPega y ejecuta el contenido de:')
    console.error('  supabase/migrations/20260706160000_team_notifications_catalog.sql')
    console.error('\nO añade DATABASE_URL al .env y ejecuta:')
    console.error('  node scripts/apply-team-migration.mjs')
    process.exit(1)
  }

  const { data: businesses, error: bizErr } = await admin
    .from('businesses')
    .select('id, name, owner_user_id, notify_new_orders')
    .order('name')

  if (bizErr) throw bizErr

  const { data: members, error: memErr } = await admin
    .from('business_members')
    .select('business_id, user_id, role, invited_email')

  if (memErr) throw memErr

  const ownerRows = (members ?? []).filter((m) => m.role === 'owner')
  const missing = (businesses ?? []).filter(
    (b) =>
      b.owner_user_id &&
      !ownerRows.some((m) => m.business_id === b.id && m.user_id === b.owner_user_id)
  )

  console.log('✓ business_members existe')
  console.log(`  Negocios: ${businesses?.length ?? 0}`)
  console.log(`  Miembros: ${members?.length ?? 0} (${ownerRows.length} owners)`)

  if (missing.length > 0) {
    console.warn('\n⚠ Dueños sin fila owner en business_members:')
    for (const b of missing) {
      console.warn(`  - ${b.name} (${b.id})`)
      const { error } = await admin.from('business_members').insert({
        business_id: b.id,
        user_id: b.owner_user_id,
        role: 'owner',
      })
      if (error && error.code !== '23505') {
        console.error(`    Error al bootstrap: ${error.message}`)
      } else {
        console.log(`    ✓ Bootstrap owner insertado`)
      }
    }
  } else {
    console.log('✓ Todos los dueños tienen fila owner')
  }

  const notifyCol = businesses?.every((b) => typeof b.notify_new_orders === 'boolean')
  if (notifyCol) {
    console.log('✓ Columna notify_new_orders presente')
  } else {
    console.warn('⚠ notify_new_orders no visible — ¿migración incompleta?')
  }

  const team = (members ?? []).filter((m) => m.role !== 'owner')
  if (team.length > 0) {
    console.log('\nEquipo (no-owner):')
    console.table(
      team.map((m) => {
        const biz = businesses?.find((b) => b.id === m.business_id)
        return {
          negocio: biz?.name ?? m.business_id.slice(0, 8),
          rol: m.role,
          email: m.invited_email ?? '—',
        }
      })
    )
  }

  console.log('\nListo. Dueños pueden entrar al dashboard; invita catálogo desde Perfil → Equipo.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
