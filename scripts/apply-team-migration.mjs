// Aplica la migración team_notifications_catalog vía conexión Postgres directa.
// Uso: node scripts/apply-team-migration.mjs
//
// Requiere en .env una de:
//   DATABASE_URL=postgresql://postgres.[ref]:[password]@...
//   SUPABASE_DB_URL=... (mismo formato)

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

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

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('Falta DATABASE_URL o SUPABASE_DB_URL en .env')
  console.error('\nObtén la connection string en Supabase → Project Settings → Database')
  console.error('Formato: postgresql://postgres.[project-ref]:[password]@...pooler.supabase.com:6543/postgres')
  console.error('\nAlternativa: pega el SQL en Supabase → SQL Editor:')
  console.error('  supabase/migrations/20260706160000_team_notifications_catalog.sql')
  process.exit(1)
}

const sql = readFileSync(
  new URL('../supabase/migrations/20260706160000_team_notifications_catalog.sql', import.meta.url),
  'utf8'
)

async function main() {
  let pg
  try {
    const require = createRequire(import.meta.url)
    pg = require('pg')
  } catch {
    console.error('Instala pg: npm install pg')
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('Conectado. Aplicando migración…')

  try {
    await client.query(sql)
    console.log('✓ Migración aplicada')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
