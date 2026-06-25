'use client'

import { useActionState, useEffect, useState } from 'react'
import type { OwnerBusiness } from '@/lib/dashboard'
import { updateProfile, type ProfileState } from './actions'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'

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
    <form action={formAction} className="space-y-5">
      <Field label="Nombre del negocio" htmlFor="name">
        <Input id="name" name="name" required defaultValue={business.name} />
      </Field>

      <Field
        label="Información específica del negocio"
        htmlFor="system_prompt_custom"
        hint="Horario, políticas, tono, datos de entrega/pago. El agente usa esto como contexto adicional. Las reglas base del bot no se editan aquí."
      >
        <Textarea
          id="system_prompt_custom"
          name="system_prompt_custom"
          rows={6}
          defaultValue={business.system_prompt_custom ?? ''}
          placeholder="Ej: Atendemos de lunes a sábado 9–18h. Envíos a todo Lima. Pagos por Yape al 999..."
        />
      </Field>

      <Field
        label="WhatsApp del dueño"
        htmlFor="owner_whatsapp_number"
        hint="Para recibir notificaciones (encargos, escalamientos). Formato internacional, ej. 51999000111."
      >
        <Input
          id="owner_whatsapp_number"
          name="owner_whatsapp_number"
          defaultValue={business.owner_whatsapp_number ?? ''}
        />
      </Field>

      {isRetail && (
        <Field
          label="Dominio Shopify"
          htmlFor="shopify_domain"
          hint="Para sincronizar el catálogo. Ej: www.tutienda.com"
        >
          <Input
            id="shopify_domain"
            name="shopify_domain"
            defaultValue={business.shopify_domain ?? ''}
          />
        </Field>
      )}

      <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted">
        No editable desde aquí: tipo de negocio ({isRetail ? 'retail' : 'panadería'}),
        número de WhatsApp del bot y credenciales técnicas.
      </div>

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
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
