import { getOwnerBusiness } from '@/lib/dashboard'
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from '@/components/ui'
import { PerfilForm } from './perfil-form'
import { ChangePasswordForm } from './change-password-form'

export default async function PerfilPage() {
  const business = await getOwnerBusiness()
  if (!business) return null

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
