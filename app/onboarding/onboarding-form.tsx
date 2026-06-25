'use client'

import { useActionState, useState } from 'react'
import { createBusiness, type OnboardingState } from './actions'
import { Alert, Button, Field, Input } from '@/components/ui'

const initialState: OnboardingState = { error: null }

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createBusiness, initialState)
  const [vertical, setVertical] = useState('')

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

      <Field label="Tipo de negocio" htmlFor="vertical">
        <select
          id="vertical"
          name="vertical"
          required
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
          className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground transition-colors focus-visible:border-primary"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          <option value="bakery">Panadería / Pastelería</option>
          <option value="retail">Retail / Tienda</option>
        </select>
      </Field>

      {vertical === 'retail' && (
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
