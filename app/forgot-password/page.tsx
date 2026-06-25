'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input } from '@/components/ui'

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
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva contraseña."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Enviando…' : 'Enviar enlace'}
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
