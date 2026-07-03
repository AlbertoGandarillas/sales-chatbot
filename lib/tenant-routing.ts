import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ruta post-login para dueños de negocio.
 * Onboarding solo si no tienen fila en businesses con su owner_user_id (RLS).
 */
export async function resolveTenantPostLoginPath(
  supabase: SupabaseClient,
  next?: string | null
): Promise<string> {
  const requested = next?.trim() || '/dashboard'

  // Rutas explícitas (ej. reset-password, conversación) se respetan.
  if (
    requested !== '/dashboard' &&
    requested !== '/onboarding' &&
    !requested.startsWith('/dashboard')
  ) {
    return requested
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .maybeSingle()

  return business ? '/dashboard' : '/onboarding'
}

export async function tenantHasLinkedBusiness(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .maybeSingle()

  return Boolean(business)
}
