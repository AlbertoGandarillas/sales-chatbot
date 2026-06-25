'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input } from '@/components/ui'

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
    <AuthShell
      title="Nueva contraseña"
      subtitle="Define tu nueva contraseña para acceder."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nueva contraseña" htmlFor="password">
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
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>

      {message && (
        <Alert tone={message.kind === 'error' ? 'danger' : 'success'} live className="mt-4">
          {message.text}
        </Alert>
      )}
    </AuthShell>
  )
}
