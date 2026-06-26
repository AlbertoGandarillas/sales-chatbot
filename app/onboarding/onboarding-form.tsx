'use client'

import { useActionState, useState } from 'react'
import { createBusiness, type OnboardingState } from './actions'
import { Alert, Button, Field, Input } from '@/components/ui'

const initialState: OnboardingState = { error: null }

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createBusiness, initialState)
  const [catalogSource, setCatalogSource] = useState('')

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <Field label="Nombre del negocio" htmlFor="name">
        <Input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Ej: Panadería La Espiga"
        />
      </Field>

      <Field
        label="¿Cómo gestionarás tu catálogo?"
        htmlFor="catalog_source"
        hint="Podrás conectar Shopify más adelante desde tu perfil."
      >
        <select
          id="catalog_source"
          name="catalog_source"
          required
          value={catalogSource}
          onChange={(e) => setCatalogSource(e.target.value)}
          className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground transition-colors focus-visible:border-primary"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          <option value="manual">
            Catálogo propio (lo cargo a mano)
          </option>
          <option value="shopify">Tienda Shopify (lo sincronizo)</option>
        </select>
      </Field>

      {catalogSource === 'shopify' && (
        <Field
          label="Dominio Shopify (opcional)"
          htmlFor="shopify_domain"
          hint="Puedes completarlo después en tu perfil."
        >
          <Input
            id="shopify_domain"
            name="shopify_domain"
            type="text"
            placeholder="www.tutienda.com"
          />
        </Field>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creando…' : 'Crear negocio'}
      </Button>

      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
    </form>
  )
}
