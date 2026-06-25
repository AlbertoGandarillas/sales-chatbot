import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabaseUrl: string = url
const supabaseAnonKey: string = anonKey

/**
 * Cliente de Supabase para componentes del navegador ('use client').
 * Mantiene la sesión en cookies para que el servidor (middleware/Server Actions)
 * pueda leerla. Respeta RLS.
 */
export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
