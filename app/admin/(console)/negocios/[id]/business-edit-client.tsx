'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import type { AdminBusinessRow } from '@/lib/admin-data'
import { maskSecret } from '@/lib/mask-secret'
import {
  assignBusinessOwner,
  updateBusinessGeneral,
  updateBusinessWhatsApp,
  type AdminBusinessState,
} from '../actions'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'

const initialState: AdminBusinessState = { error: null, ok: false }

function TabLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}

function GeneralForm({ business }: { business: AdminBusinessRow }) {
  const [state, formAction, pending] = useActionState(updateBusinessGeneral, initialState)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (state.ok) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state.ok])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={business.id} />
      <Field label="Nombre" htmlFor="name">
        <Input id="name" name="name" required defaultValue={business.name} />
      </Field>
      <Field label="Slug" htmlFor="slug">
        <Input id="slug" name="slug" required defaultValue={business.slug} />
      </Field>
      <Field label="Origen catálogo" htmlFor="catalog_source">
        <select
          id="catalog_source"
          name="catalog_source"
          defaultValue={business.catalog_source}
          className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="manual">Manual</option>
          <option value="shopify">Shopify</option>
        </select>
      </Field>
      <Field label="Dominio Shopify" htmlFor="shopify_domain">
        <Input
          id="shopify_domain"
          name="shopify_domain"
          defaultValue={business.shopify_domain ?? ''}
          placeholder="tienda.myshopify.com"
        />
      </Field>
      <Field label="WhatsApp del dueño" htmlFor="owner_whatsapp_number">
        <Input
          id="owner_whatsapp_number"
          name="owner_whatsapp_number"
          defaultValue={business.owner_whatsapp_number ?? ''}
        />
      </Field>
      <Field label="Prompt custom" htmlFor="system_prompt_custom">
        <Textarea
          id="system_prompt_custom"
          name="system_prompt_custom"
          rows={5}
          defaultValue={business.system_prompt_custom ?? ''}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="supports_custom_orders"
          defaultChecked={business.supports_custom_orders}
          className="h-4 w-4 accent-primary"
        />
        Acepta encargos a medida
      </label>
      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
      {saved && (
        <Alert tone="success" live>
          Cambios guardados.
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar general'}
      </Button>
    </form>
  )
}

function WhatsAppForm({ business }: { business: AdminBusinessRow }) {
  const [state, formAction, pending] = useActionState(updateBusinessWhatsApp, initialState)
  const [saved, setSaved] = useState(false)
  const [revealToken, setRevealToken] = useState(false)

  useEffect(() => {
    if (state.ok) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state.ok])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={business.id} />
      <p className="text-sm text-muted">
        Credenciales del número de WhatsApp del bot. Actual:{' '}
        <span className="font-medium text-foreground">
          {business.whatsapp_phone_number_id
            ? maskSecret(business.whatsapp_phone_number_id, 6)
            : 'sin phone number ID'}
        </span>
        {business.whatsapp_token ? ' · token configurado' : ' · sin token'}
      </p>
      <Field label="Phone Number ID (Meta)" htmlFor="whatsapp_phone_number_id">
        <Input
          id="whatsapp_phone_number_id"
          name="whatsapp_phone_number_id"
          defaultValue={business.whatsapp_phone_number_id ?? ''}
          placeholder="123456789012345"
        />
      </Field>
      <Field label="Token de acceso (Meta)" htmlFor="whatsapp_token">
        <Input
          id="whatsapp_token"
          name="whatsapp_token"
          type={revealToken ? 'text' : 'password'}
          defaultValue={business.whatsapp_token ?? ''}
          placeholder="EAA…"
          autoComplete="off"
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRevealToken((v) => !v)}
      >
        {revealToken ? 'Ocultar token' : 'Mostrar token'}
      </Button>
      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
      {saved && (
        <Alert tone="success" live>
          Credenciales guardadas.
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar WhatsApp'}
      </Button>
    </form>
  )
}

function OwnerForm({ business }: { business: AdminBusinessRow }) {
  const [state, formAction, pending] = useActionState(assignBusinessOwner, initialState)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (state.ok) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state.ok])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={business.id} />
      <p className="text-sm text-muted">
        Vincula la cuenta Supabase Auth del dueño para que pueda entrar al dashboard.
        {business.owner_user_id ? (
          <>
            {' '}
            Dueño actual:{' '}
            <span className="font-mono text-xs text-foreground">
              {business.owner_user_id}
            </span>
          </>
        ) : (
          <> Este negocio aún no tiene dueño vinculado.</>
        )}
      </p>
      <Field label="Correo del dueño" htmlFor="owner_email">
        <Input
          id="owner_email"
          name="owner_email"
          type="email"
          required
          placeholder="dueño@ejemplo.com"
        />
      </Field>
      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
      {saved && (
        <Alert tone="success" live>
          Dueño vinculado. El cliente puede iniciar sesión de nuevo.
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Vinculando…' : 'Vincular dueño'}
      </Button>
    </form>
  )
}

export function BusinessEditClient({ business }: { business: AdminBusinessRow }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab =
    tabParam === 'whatsapp' ? 'whatsapp' : tabParam === 'owner' ? 'owner' : 'general'
  const base = `/admin/negocios/${business.id}`

  return (
    <>
      <div className="mt-6 flex gap-1 border-b border-border">
        <TabLink href={base} active={tab === 'general'}>
          General
        </TabLink>
        <TabLink href={`${base}?tab=whatsapp`} active={tab === 'whatsapp'}>
          WhatsApp
        </TabLink>
        <TabLink href={`${base}?tab=owner`} active={tab === 'owner'}>
          Dueño
        </TabLink>
      </div>
      <div className="mt-6 max-w-xl">
        {tab === 'whatsapp' ? (
          <WhatsAppForm business={business} />
        ) : tab === 'owner' ? (
          <OwnerForm business={business} />
        ) : (
          <GeneralForm business={business} />
        )}
      </div>
    </>
  )
}
