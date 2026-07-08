'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input } from '@/components/ui'

function SignupForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)

  async function handlePasswordSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setMessage({ kind: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (password !== confirm) {
      setMessage({ kind: 'error', text: 'Las contraseñas no coinciden.' })
      return
    }

    setBusy(true)
    setMessage(null)
    const supabase = createBrowserSupabase()
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/onboarding`
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo },
    })
    setBusy(false)

    if (error) {
      setMessage({ kind: 'error', text: error.message })
      return
    }

    if (data.session) {
      router.push('/onboarding')
      router.refresh()
      return
    }
    setMessage({
      kind: 'ok',
      text: 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.',
    })
  }

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Regístrate con tu correo y una contraseña."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handlePasswordSignup} className="space-y-4">
        <Field label="Correo" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Contraseña" htmlFor="password">
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Procesando…' : 'Crear cuenta'}
        </Button>

        <p className="mt-3 text-center text-xs text-muted">
          Al registrarte aceptas los{' '}
          <Link href="/terminos" className="text-primary hover:underline">
            Términos
          </Link>{' '}
          y la{' '}
          <Link href="/privacidad" className="text-primary hover:underline">
            Política de privacidad
          </Link>
          .
        </p>
      </form>

      {message && (
        <Alert tone={message.kind === 'error' ? 'danger' : 'success'} live className="mt-4">
          {message.text}
        </Alert>
      )}
    </AuthShell>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
