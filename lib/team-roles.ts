export type TeamRole = 'owner' | 'catalog' | 'operator'

export interface TeamMemberRow {
  id: string
  user_id: string
  role: TeamRole
  invited_email: string | null
  created_at: string
}

const ROUTE_ACCESS: Record<string, TeamRole[]> = {
  '/dashboard': ['owner', 'catalog', 'operator'],
  '/dashboard/catalogo': ['owner', 'catalog', 'operator'],
  '/dashboard/conversaciones': ['owner', 'operator'],
  '/dashboard/recurrentes': ['owner', 'operator'],
  '/dashboard/bot': ['owner'],
  '/dashboard/perfil': ['owner'],
}

export function canAccessRoute(role: TeamRole, pathname: string): boolean {
  const base =
    Object.keys(ROUTE_ACCESS).find(
      (route) => pathname === route || pathname.startsWith(route + '/')
    ) ?? '/dashboard'
  const allowed = ROUTE_ACCESS[base] ?? ['owner']
  return allowed.includes(role)
}

export function redirectPathForRole(role: TeamRole): string {
  if (role === 'catalog') return '/dashboard/catalogo'
  return '/dashboard'
}

export function canWriteCatalog(role: TeamRole): boolean {
  return role === 'owner' || role === 'catalog'
}

export function navItemsForRole(role: TeamRole) {
  const all = [
    { href: '/dashboard', label: 'Resumen' },
    { href: '/dashboard/conversaciones', label: 'Conversaciones' },
    { href: '/dashboard/catalogo', label: 'Catálogo' },
    { href: '/dashboard/recurrentes', label: 'Recurrentes' },
    { href: '/dashboard/bot', label: 'Bot' },
    { href: '/dashboard/perfil', label: 'Perfil' },
  ]
  return all.filter((item) => canAccessRoute(role, item.href))
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Dueño',
  catalog: 'Catálogo',
  operator: 'Operador',
}
