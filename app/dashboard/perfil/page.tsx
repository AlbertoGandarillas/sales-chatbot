import { getOwnerBusiness } from '@/lib/dashboard'
import { PerfilForm } from './perfil-form'
import { ChangePasswordForm } from './change-password-form'

export default async function PerfilPage() {
  const business = await getOwnerBusiness()
  if (!business) return null

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900">Perfil del negocio</h1>
      <p className="mt-1 text-sm text-stone-500">
        Ajusta la información que el agente usa al conversar con tus clientes.
      </p>
      <PerfilForm business={business} />
      <ChangePasswordForm />
    </main>
  )
}
