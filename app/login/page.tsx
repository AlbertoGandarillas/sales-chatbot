'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input } from '@/components/ui'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const initialError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magic, setMagic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(
    initialError ? { kind: 'error', text: 'No pudimos validar el enlace. Intenta de nuevo.' } : null
  )

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (error) {
      setMessage({ kind: 'error', text: 'Correo o contraseña incorrectos.' })
      return
    }
    router.push(next)
    router.refresh()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const supabase = createBrowserSupabase()
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo },
    })
    setBusy(false)
    if (error) {
      setMessage({ kind: 'error', text: error.message })
      return
    }
    setMessage({ kind: 'ok', text: 'Te enviamos un enlace de acceso a tu correo.' })
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle={
        magic
          ? 'Te enviaremos un enlace mágico a tu correo.'
          : 'Ingresa con tu correo y contraseña.'
      }
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form
        onSubmit={magic ? handleMagicLink : handlePasswordLogin}
        className="space-y-4"
      >
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

        {!magic && (
          <Field htmlFor="password">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted hover:text-foreground"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Procesando…' : magic ? 'Enviar enlace de acceso' : 'Iniciar sesión'}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setMagic((v) => !v)
          setMessage(null)
        }}
        className="mt-3 w-full"
      >
        {magic ? 'Usar contraseña' : 'Entrar con enlace mágico'}
      </Button>

      {message && (
        <Alert tone={message.kind === 'error' ? 'danger' : 'success'} live className="mt-4">
          {message.text}
        </Alert>
      )}
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
