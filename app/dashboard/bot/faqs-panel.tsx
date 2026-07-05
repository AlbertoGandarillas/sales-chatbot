'use client'

import { useActionState, useEffect, useState } from 'react'
import type { BusinessFaqRow } from '@/lib/dashboard'
import { FAQ_CATEGORIES } from '@/lib/bot-config'
import { deleteFaq, saveFaq, type BotStudioState } from './actions'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'

const initialState: BotStudioState = { error: null, ok: false }

function FaqEditor({
  faq,
  onCancel,
}: {
  faq?: BusinessFaqRow
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(saveFaq, initialState)

  useEffect(() => {
    if (state.ok) onCancel()
  }, [state.ok, onCancel])

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-border bg-surface p-4">
      {faq && <input type="hidden" name="id" value={faq.id} />}
      <Field label="Categoría" htmlFor="faq_category">
        <select
          id="faq_category"
          name="category"
          defaultValue={faq?.category ?? 'general'}
          className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm"
        >
          {FAQ_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Pregunta" htmlFor="faq_question">
        <Input
          id="faq_question"
          name="question"
          required
          defaultValue={faq?.question ?? ''}
        />
      </Field>
      <Field label="Respuesta" htmlFor="faq_answer">
        <Textarea
          id="faq_answer"
          name="answer"
          rows={5}
          required
          defaultValue={faq?.answer ?? ''}
        />
      </Field>
      <Field label="Orden" htmlFor="faq_sort">
        <Input
          id="faq_sort"
          name="sort_order"
          type="number"
          defaultValue={faq?.sort_order ?? 0}
          className="max-w-[120px]"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={faq?.is_active ?? true}
          className="h-4 w-4 accent-primary"
        />
        Activa
      </label>
      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : faq ? 'Actualizar' : 'Agregar FAQ'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function FaqRowActions({ faq }: { faq: BusinessFaqRow }) {
  const [state, formAction, pending] = useActionState(deleteFaq, initialState)

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={faq.id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Eliminar
      </Button>
      {state.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}

export function FaqsPanel({ faqs }: { faqs: BusinessFaqRow[] }) {
  const [editing, setEditing] = useState<BusinessFaqRow | 'new' | null>(null)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Preguntas que el bot consulta con la herramienta de conocimiento antes de
        improvisar. Ideal para envíos, pagos, horarios y casos frecuentes.
      </p>

      {editing ? (
        <FaqEditor
          faq={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" onClick={() => setEditing('new')}>
          Nueva pregunta frecuente
        </Button>
      )}

      {faqs.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted">
          Sin FAQs todavía. Agrega preguntas como &quot;¿Hacen envíos?&quot; o
          &quot;¿Qué formas de pago aceptan?&quot;
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border">
          {faqs.map((faq) => (
            <li key={faq.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {faq.category}
                  {!faq.is_active && ' · inactiva'}
                </p>
                <p className="mt-1 font-medium text-foreground">{faq.question}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(faq)}
                >
                  Editar
                </Button>
                <FaqRowActions faq={faq} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
