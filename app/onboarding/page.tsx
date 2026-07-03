import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { tenantHasLinkedBusiness } from '@/lib/tenant-routing'
import { OnboardingForm } from './onboarding-form'
import { Alert } from '@/components/ui'

export default async function OnboardingPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signup')

  if (await tenantHasLinkedBusiness(supabase)) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configura tu acceso
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tu cuenta aún no está vinculada a un negocio en Uru.
        </p>

        <Alert tone="warning" className="mt-5">
          <strong>¿Ya eres cliente (Cruje, Betta u otro)?</strong> No crees un negocio
          nuevo aquí. El administrador debe vincular tu correo{' '}
          <span className="font-medium">{user.email}</span> al negocio existente desde el
          panel admin. Luego vuelve a iniciar sesión.
        </Alert>

        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Negocio nuevo</h2>
          <p className="mt-1 text-xs text-muted">
            Solo si acabas de registrarte y aún no existe tu negocio en la plataforma.
          </p>
          <OnboardingForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <form action="/auth/signout" method="post" className="inline">
            <button type="submit" className="font-medium text-primary hover:underline">
              Cerrar sesión
            </button>
          </form>
        </p>
      </div>
    </main>
  )
}
