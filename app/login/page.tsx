'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

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
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-lg font-bold tracking-tight text-stone-900">
          Aynibot
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-stone-600">
          {magic
            ? 'Te enviaremos un enlace mágico a tu correo.'
            : 'Ingresa con tu correo y contraseña.'}
        </p>

        <form
          onSubmit={magic ? handleMagicLink : handlePasswordLogin}
          className="mt-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>

          {!magic && (
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                  Contraseña
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-stone-600 hover:text-stone-800"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {busy ? 'Procesando…' : magic ? 'Enviar enlace de acceso' : 'Iniciar sesión'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMagic((v) => !v)
            setMessage(null)
          }}
          className="mt-4 w-full text-center text-sm text-stone-600 hover:text-stone-800"
        >
          {magic ? 'Usar contraseña' : 'Entrar con enlace mágico'}
        </button>

        {message && (
          <p
            className={`mt-4 text-sm ${
              message.kind === 'error' ? 'text-red-600' : 'text-green-700'
            }`}
          >
            {message.text}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-stone-600">
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="font-medium text-stone-900 hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
