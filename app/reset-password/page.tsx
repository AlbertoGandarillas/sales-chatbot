'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
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
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage({ kind: 'error', text: error.message })
      return
    }
    setMessage({ kind: 'ok', text: 'Contraseña actualizada. Redirigiendo…' })
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1200)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-stone-900">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-stone-500">
          Define tu nueva contraseña para acceder.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">
              Nueva contraseña
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

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar contraseña'}
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
      </div>
    </main>
  )
}
