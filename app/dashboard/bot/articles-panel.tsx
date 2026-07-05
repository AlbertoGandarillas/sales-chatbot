'use client'

import { useActionState, useEffect, useState } from 'react'
import type { KnowledgeArticleRow } from '@/lib/dashboard'
import { FAQ_CATEGORIES } from '@/lib/bot-config'
import { deleteArticle, saveArticle, type BotStudioState } from './actions'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'

const initialState: BotStudioState = { error: null, ok: false }

function ArticleEditor({
  article,
  onCancel,
}: {
  article?: KnowledgeArticleRow
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(saveArticle, initialState)

  useEffect(() => {
    if (state.ok) onCancel()
  }, [state.ok, onCancel])

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-border bg-surface p-4">
      {article && <input type="hidden" name="id" value={article.id} />}
      <Field label="Categoría" htmlFor="article_category">
        <select
          id="article_category"
          name="category"
          defaultValue={article?.category ?? 'general'}
          className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm"
        >
          {FAQ_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Título" htmlFor="article_title">
        <Input
          id="article_title"
          name="title"
          required
          defaultValue={article?.title ?? ''}
        />
      </Field>
      <Field label="Contenido" htmlFor="article_content">
        <Textarea
          id="article_content"
          name="content"
          rows={10}
          required
          defaultValue={article?.content ?? ''}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={article?.is_active ?? true}
          className="h-4 w-4 accent-primary"
        />
        Activo
      </label>
      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : article ? 'Actualizar' : 'Agregar artículo'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function ArticleRowActions({ article }: { article: KnowledgeArticleRow }) {
  const [state, formAction, pending] = useActionState(deleteArticle, initialState)

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={article.id} />
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

export function ArticlesPanel({ articles }: { articles: KnowledgeArticleRow[] }) {
  const [editing, setEditing] = useState<KnowledgeArticleRow | 'new' | null>(null)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Bloques de conocimiento largos (guías, listas, políticas extensas). El bot
        los busca bajo demanda igual que las FAQs.
      </p>

      {editing ? (
        <ArticleEditor
          article={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" onClick={() => setEditing('new')}>
          Nuevo artículo
        </Button>
      )}

      {articles.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted">
          Sin artículos. Úsalos para contenido extenso que no cabe en una FAQ.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border">
          {articles.map((article) => (
            <li
              key={article.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {article.category}
                  {!article.is_active && ' · inactivo'}
                </p>
                <p className="mt-1 font-medium text-foreground">{article.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{article.content}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(article)}
                >
                  Editar
                </Button>
                <ArticleRowActions article={article} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
