'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { Alert, Button, Field, Input } from '@/components/ui'

export function ChangePasswordForm() {
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
    setPassword('')
    setConfirm('')
    setMessage({ kind: 'ok', text: 'Contraseña actualizada.' })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <Field label="Nueva contraseña" htmlFor="new-password">
        <Input
          id="new-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirmar contraseña" htmlFor="confirm-password">
        <Input
          id="confirm-password"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </Field>

      {message && (
        <Alert tone={message.kind === 'error' ? 'danger' : 'success'} live>
          {message.text}
        </Alert>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  )
}
