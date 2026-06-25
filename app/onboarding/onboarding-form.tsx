'use client'

import { useActionState, useState } from 'react'
import { createBusiness, type OnboardingState } from './actions'

const initialState: OnboardingState = { error: null }

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createBusiness, initialState)
  const [vertical, setVertical] = useState('')

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700">
          Nombre del negocio
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Ej: Panadería La Espiga"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      <div>
        <label htmlFor="vertical" className="block text-sm font-medium text-stone-700">
          Tipo de negocio
        </label>
        <select
          id="vertical"
          name="vertical"
          required
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          <option value="bakery">Panadería / Pastelería</option>
          <option value="retail">Retail / Tienda</option>
        </select>
      </div>

      {vertical === 'retail' && (
        <div>
          <label
            htmlFor="shopify_domain"
            className="block text-sm font-medium text-stone-700"
          >
            Dominio Shopify <span className="text-stone-600">(opcional)</span>
          </label>
          <input
            id="shopify_domain"
            name="shopify_domain"
            type="text"
            placeholder="www.tutienda.com"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
          <p className="mt-1 text-xs text-stone-600">
            Puedes completarlo después en tu perfil.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? 'Creando…' : 'Crear negocio'}
      </button>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
