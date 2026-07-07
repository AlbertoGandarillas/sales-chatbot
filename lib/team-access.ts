import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  canAccessRoute,
  canWriteCatalog,
  redirectPathForRole,
  type TeamRole,
} from '@/lib/team-roles'

export type { TeamMemberRow, TeamRole } from '@/lib/team-roles'
export {
  canAccessRoute,
  canWriteCatalog,
  navItemsForRole,
  redirectPathForRole,
  ROLE_LABELS,
} from '@/lib/team-roles'

export interface Membership {
  businessId: string
  role: TeamRole
  userId: string
}

export async function getMembership(): Promise<Membership | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('business_members')
    .select('business_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return null

  return {
    businessId: data.business_id,
    role: data.role as TeamRole,
    userId: user.id,
  }
}

export async function requireMembership(): Promise<Membership> {
  const membership = await getMembership()
  if (!membership) redirect('/onboarding')
  return membership
}

export async function requireOwnerRole(): Promise<Membership> {
  const membership = await requireMembership()
  if (membership.role !== 'owner') {
    redirect(redirectPathForRole(membership.role))
  }
  return membership
}

export async function requireCatalogWrite(): Promise<Membership> {
  const membership = await requireMembership()
  if (!canWriteCatalog(membership.role)) {
    redirect(redirectPathForRole(membership.role))
  }
  return membership
}

export async function requireOpsRole(): Promise<Membership> {
  const membership = await requireMembership()
  if (membership.role !== 'owner' && membership.role !== 'operator') {
    redirect(redirectPathForRole(membership.role))
  }
  return membership
}

export async function assertRouteAccess(pathname: string): Promise<Membership> {
  const membership = await requireMembership()
  if (!canAccessRoute(membership.role, pathname)) {
    redirect(redirectPathForRole(membership.role))
  }
  return membership
}
