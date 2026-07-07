'use server'

import { revalidatePath } from 'next/cache'
import { findAuthUserIdByEmail } from '@/lib/auth-lookup'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireOwnerRole } from '@/lib/team-access'

export type TeamState = { error: string | null; ok: boolean }

const ok: TeamState = { error: null, ok: true }
const fail = (error: string): TeamState => ({ error, ok: false })

export async function inviteTeamMember(
  _prev: TeamState,
  formData: FormData
): Promise<TeamState> {
  const membership = await requireOwnerRole()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? 'catalog').trim()

  if (!email) return fail('El correo es obligatorio.')
  if (role !== 'catalog' && role !== 'operator') {
    return fail('Rol inválido.')
  }

  const userId = await findAuthUserIdByEmail(email)
  if (!userId) {
    return fail(
      'No hay usuario con ese correo. Pídele que cree cuenta en /signup y vuelve a invitar.'
    )
  }

  if (userId === membership.userId) {
    return fail('Ya eres el dueño de este negocio.')
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('business_members').insert({
    business_id: membership.businessId,
    user_id: userId,
    role,
    invited_email: email,
  })

  if (error) {
    if (error.code === '23505') {
      return fail('Ese usuario ya es miembro del equipo.')
    }
    return fail(error.message)
  }

  revalidatePath('/dashboard/perfil')
  return ok
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const membership = await requireOwnerRole()
  const memberId = String(formData.get('member_id') ?? '').trim()
  if (!memberId) return

  const supabase = await createServerSupabase()
  await supabase
    .from('business_members')
    .delete()
    .eq('id', memberId)
    .eq('business_id', membership.businessId)
    .neq('role', 'owner')

  revalidatePath('/dashboard/perfil')
}
