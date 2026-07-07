import { getOwnerBusiness } from '@/lib/dashboard'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireOwnerRole } from '@/lib/team-access'
import type { TeamMemberRow } from '@/lib/team-roles'
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from '@/components/ui'
import { PerfilForm } from './perfil-form'
import { ChangePasswordForm } from './change-password-form'
import { TeamSection } from './team-section'

export default async function PerfilPage() {
  await requireOwnerRole()
  const business = await getOwnerBusiness()
  if (!business) return null

  const supabase = await createServerSupabase()
  const { data: members } = await supabase
    .from('business_members')
    .select('id, user_id, role, invited_email, created_at')
    .order('created_at', { ascending: true })

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader
        title="Perfil del negocio"
        description="Datos operativos del negocio. La voz y conocimiento del bot están en Bot Studio."
      />

      <Card>
        <CardContent>
          <PerfilForm business={business} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipo</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Invita colaboradores con acceso limitado al catálogo u operaciones.
          </p>
        </CardHeader>
        <CardContent>
          <TeamSection members={(members as TeamMemberRow[]) ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <p className="mt-1 text-sm text-muted">Cambia tu contraseña de acceso.</p>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </main>
  )
}
