import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signup')

  // Si ya tiene negocio, no debe pasar por onboarding.
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .maybeSingle()
  if (business) redirect('/dashboard')

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-stone-900">Crea tu negocio</h1>
        <p className="mt-1 text-sm text-stone-600">
          Un último paso para empezar a usar Aynibot.
        </p>
        <OnboardingForm />
      </div>
    </main>
  )
}
