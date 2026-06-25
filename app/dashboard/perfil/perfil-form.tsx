'use client'

import { useActionState, useEffect, useState } from 'react'
import type { OwnerBusiness } from '@/lib/dashboard'
import { updateProfile, type ProfileState } from './actions'

const initialState: ProfileState = { error: null, ok: false }

export function PerfilForm({ business }: { business: OwnerBusiness }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState)
  const [saved, setSaved] = useState(false)
  const isRetail = business.vertical === 'retail'

  useEffect(() => {
    if (state.ok) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state.ok])

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <label className="block text-sm">
        <span className="font-medium text-stone-700">Nombre del negocio</span>
        <input
          name="name"
          required
          defaultValue={business.name}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-stone-700">
          Información específica del negocio
        </span>
        <span className="mt-0.5 block text-xs text-stone-400">
          Horario, políticas, tono, datos de entrega/pago. El agente usa esto como
          contexto adicional. Las reglas base del bot no se editan aquí.
        </span>
        <textarea
          name="system_prompt_custom"
          rows={6}
          defaultValue={business.system_prompt_custom ?? ''}
          placeholder="Ej: Atendemos de lunes a sábado 9–18h. Envíos a todo Lima. Pagos por Yape al 999..."
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-stone-700">WhatsApp del dueño</span>
        <span className="mt-0.5 block text-xs text-stone-400">
          Para recibir notificaciones (encargos, escalamientos). Formato internacional, ej. 51999000111.
        </span>
        <input
          name="owner_whatsapp_number"
          defaultValue={business.owner_whatsapp_number ?? ''}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      {isRetail && (
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Dominio Shopify</span>
          <span className="mt-0.5 block text-xs text-stone-400">
            Para sincronizar el catálogo. Ej: www.tutienda.com
          </span>
          <input
            name="shopify_domain"
            defaultValue={business.shopify_domain ?? ''}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      )}

      <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
        No editable desde aquí: tipo de negocio ({isRetail ? 'retail' : 'panadería'}),
        número de WhatsApp del bot y credenciales técnicas.
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {saved && <p className="text-sm text-green-700">Cambios guardados.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
