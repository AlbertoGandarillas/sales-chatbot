import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Acceso estático obligatorio: Next.js solo inyecta NEXT_PUBLIC_* en el bundle
// del navegador cuando se leen así, no vía process.env[name].
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

const url: string = supabaseUrl
const anonKey: string = supabaseAnonKey

export const supabase = createClient(url, anonKey)

let serviceClient: SupabaseClient | null = null

export function createServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return serviceClient
}

export const CRUJE_BUSINESS_ID = 'a0000000-0000-4000-8000-000000000001'
