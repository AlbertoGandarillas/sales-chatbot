import { redirect } from 'next/navigation'

// /login es alias histórico; el formulario canónico vive en /signup.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.next) qs.set('next', params.next)
  if (params.error) qs.set('error', params.error)
  const suffix = qs.toString()
  redirect(`/signup${suffix ? `?${suffix}` : ''}`)
}
