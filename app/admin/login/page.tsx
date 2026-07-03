'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth-shell'
import { Alert, Button, Field, Input } from '@/components/ui'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(
    errorParam === 'forbidden'
      ? { kind: 'error', text: 'Esta cuenta no tiene acceso de administrador.' }
      : null
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)

    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setBusy(false)
      setMessage({ kind: 'error', text: 'Correo o contraseña incorrectos.' })
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setBusy(false)
      setMessage({ kind: 'error', text: 'Correo o contraseña incorrectos.' })
      return
    }

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!admin) {
      await supabase.auth.signOut()
      setBusy(false)
      setMessage({
        kind: 'error',
        text: 'Esta cuenta no tiene acceso de administrador.',
      })
      return
    }

    router.push('/admin/overview')
    router.refresh()
  }

  return (
    <AuthShell
      title="Admin Uru"
      subtitle="Acceso restringido al operador de la plataforma."
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <Field label="Correo" htmlFor="admin-email">
          <Input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Contraseña" htmlFor="admin-password">
          <Input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Ingresando…' : 'Entrar'}
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  )
}
