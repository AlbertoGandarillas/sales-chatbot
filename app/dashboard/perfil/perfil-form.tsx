'use client'

import { useActionState, useEffect, useState } from 'react'
import type { OwnerBusiness } from '@/lib/dashboard'
import { updateProfile, type ProfileState } from './actions'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'

const initialState: ProfileState = { error: null, ok: false }

export function PerfilForm({ business }: { business: OwnerBusiness }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState)
  const [saved, setSaved] = useState(false)
  const isShopify = business.catalog_source === 'shopify'

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

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="supports_custom_orders"
          defaultChecked={business.supports_custom_orders}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>
          Acepto encargos a medida
          <span className="block text-xs text-muted">
            El agente podrá tomar pedidos personalizados (tortas, arreglos, pedidos
            por encargo) y avisarte.
          </span>
        </span>
      </label>

      <div className="rounded-card border border-border bg-surface-muted p-4">
        <p className="text-sm font-semibold text-foreground">Origen del catálogo</p>
        <p className="mt-1 text-xs text-muted">
          Actualmente:{' '}
          <span className="font-medium text-foreground">
            {isShopify ? 'Tienda Shopify (sincronizado)' : 'Catálogo propio (manual)'}
          </span>
          .
        </p>
        <div className="mt-3">
          <Field
            label="Dominio Shopify"
            htmlFor="shopify_domain"
            hint={
              isShopify
                ? 'Catálogo sincronizado. Ej: www.tutienda.com'
                : 'Conecta Shopify: agrega tu dominio, guarda y luego pulsa “Resincronizar catálogo” en la sección Catálogo. Tus productos manuales se conservan.'
            }
          >
            <Input
              id="shopify_domain"
              name="shopify_domain"
              placeholder="www.tutienda.com"
              defaultValue={business.shopify_domain ?? ''}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted">
        No editable desde aquí: número de WhatsApp del bot y credenciales técnicas.
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
