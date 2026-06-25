'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

function SignupForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [magic, setMagic] = useState(false)
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

    // Si el proyecto no exige confirmación de correo, hay sesión inmediata.
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

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const supabase = createBrowserSupabase()
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/dashboard`
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
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Crear cuenta</h1>
        <p className="mt-1 text-sm text-stone-500">
          {magic
            ? 'Te enviaremos un enlace mágico a tu correo.'
            : 'Regístrate con tu correo y una contraseña.'}
        </p>

        <form
          onSubmit={magic ? handleMagicLink : handlePasswordSignup}
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
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-stone-700">
                  Confirmar contraseña
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {busy ? 'Procesando…' : magic ? 'Enviar enlace de acceso' : 'Crear cuenta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMagic((v) => !v)
            setMessage(null)
          }}
          className="mt-4 w-full text-center text-sm text-stone-500 hover:text-stone-800"
        >
          {magic ? 'Usar contraseña' : 'Registrarme con enlace mágico'}
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

        <p className="mt-6 text-center text-sm text-stone-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-stone-900 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
