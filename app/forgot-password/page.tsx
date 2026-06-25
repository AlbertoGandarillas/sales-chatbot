'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const supabase = createBrowserSupabase()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })
    setBusy(false)
    if (error) {
      setMessage({ kind: 'error', text: error.message })
      return
    }
    setMessage({
      kind: 'ok',
      text: 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.',
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-lg font-bold tracking-tight text-stone-900">
          Aynibot
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-stone-500">
          Te enviaremos un enlace para crear una nueva contraseña.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>

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
          <Link href="/login" className="font-medium text-stone-900 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
