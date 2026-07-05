'use client'

import { useActionState, useEffect, useState } from 'react'
import type { OwnerBusiness } from '@/lib/dashboard'
import { updateBotConfig, type BotStudioState } from './actions'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'

const initialState: BotStudioState = { error: null, ok: false }

export function BotIdentityForm({ business }: { business: OwnerBusiness }) {
  const [state, formAction, pending] = useActionState(updateBotConfig, initialState)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (state.ok) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state.ok])

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Nombre del bot" htmlFor="bot_name" hint="Cómo se presenta a los clientes.">
        <Input
          id="bot_name"
          name="bot_name"
          defaultValue={business.bot_name ?? ''}
          placeholder={`Asistente de ${business.name}`}
        />
      </Field>

      <Field label="Saludo inicial" htmlFor="bot_greeting">
        <Textarea
          id="bot_greeting"
          name="bot_greeting"
          rows={4}
          defaultValue={business.bot_greeting ?? ''}
          placeholder="Instrucción para la primera interacción con el cliente…"
        />
      </Field>

      <Field label="Tono y personalidad" htmlFor="bot_tone">
        <Textarea
          id="bot_tone"
          name="bot_tone"
          rows={3}
          defaultValue={business.bot_tone ?? ''}
          placeholder="Cercano, formal, emojis moderados…"
        />
      </Field>

      <Field label="Política de envíos" htmlFor="policy_shipping">
        <Textarea
          id="policy_shipping"
          name="policy_shipping"
          rows={5}
          defaultValue={business.policy_shipping ?? ''}
          placeholder="Zonas, courier, costos, tiempos…"
        />
      </Field>

      <Field label="Formas de pago" htmlFor="policy_payment">
        <Textarea
          id="policy_payment"
          name="policy_payment"
          rows={4}
          defaultValue={business.policy_payment ?? ''}
          placeholder="Yape, Plin, restricciones (ej. no efectivo)…"
        />
      </Field>

      <Field label="Cambios y devoluciones" htmlFor="policy_returns">
        <Textarea
          id="policy_returns"
          name="policy_returns"
          rows={4}
          defaultValue={business.policy_returns ?? ''}
        />
      </Field>

      <Field
        label="Notas adicionales"
        htmlFor="bot_extra_notes"
        hint="Horarios, promos generales, excepciones."
      >
        <Textarea
          id="bot_extra_notes"
          name="bot_extra_notes"
          rows={3}
          defaultValue={business.bot_extra_notes ?? ''}
        />
      </Field>

      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
      {saved && (
        <Alert tone="success" live>
          Configuración del bot guardada.
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar configuración'}
      </Button>
    </form>
  )
}
