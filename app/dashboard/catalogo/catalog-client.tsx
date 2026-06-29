'use client'

import { useActionState, useEffect, useState } from 'react'
import type { CatalogSource } from '@/lib/business-resolver'
import {
  saveProduct,
  deleteProduct,
  toggleAvailable,
  resyncCatalog,
  type CatalogState,
  type ResyncState,
} from './actions'
import { Alert, Badge, Button, Field, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'

export interface Product {
  id: string
  name: string
  description: string | null
  category: string
  price_soles: number
  is_custom_order: boolean
  available: boolean
  needs_review: boolean
  talla_range: string | null
  color_o_material: string | null
  image_url: string | null
  source: string
}

const initialState: CatalogState = { error: null, ok: false }
const resyncInitial: ResyncState = { error: null, result: null }

function ResyncButton() {
  const [state, formAction, pending] = useActionState(resyncCatalog, resyncInitial)
  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? 'Sincronizando…' : 'Resincronizar catálogo'}
        </Button>
      </form>
      {state.result && (
        <p className="text-xs text-success" role="status" aria-live="polite">
          {state.result.inserted} nuevos · {state.result.updated} actualizados ·{' '}
          {state.result.needsReviewCount} por revisar
        </p>
      )}
      {state.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </div>
  )
}

const CATEGORY_SUGGESTIONS = [
  'destacados',
  'ofertas',
  'bebidas',
  'comida',
  'abarrotes',
  'ropa',
  'calzado',
  'accesorios',
  'otros',
]

function formatSoles(n: number) {
  return `S/ ${Number(n).toFixed(2)}`
}

function ProductForm({
  product,
  onDone,
}: {
  product?: Product
  onDone: () => void
}) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState)

  useEffect(() => {
    if (state.ok) onDone()
  }, [state.ok, onDone])

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-card border border-border-strong bg-surface-muted p-4"
    >
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="name">
          <Input id="name" name="name" required defaultValue={product?.name ?? ''} />
        </Field>
        <Field label="Precio (S/)" htmlFor="price_soles">
          <Input
            id="price_soles"
            name="price_soles"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.price_soles ?? 0}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Categoría" htmlFor="category" hint="Texto libre.">
          <Input
            id="category"
            name="category"
            list="category-suggestions"
            placeholder="Ej: bebidas, calzado, otros"
            defaultValue={product?.category ?? 'otros'}
          />
          <datalist id="category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <label className="flex items-center gap-2 pt-6 text-sm text-foreground">
          <input
            type="checkbox"
            name="is_custom_order"
            defaultChecked={product?.is_custom_order ?? false}
            className="h-4 w-4 accent-primary"
          />
          Es encargo a medida (sin precio fijo)
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Rango de tallas"
          htmlFor="talla_range"
          hint="Opcional."
        >
          <Input
            id="talla_range"
            name="talla_range"
            placeholder="Ej: 38 al 43"
            defaultValue={product?.talla_range ?? ''}
          />
        </Field>
        <Field label="Color / material" htmlFor="color_o_material" hint="Opcional.">
          <Input
            id="color_o_material"
            name="color_o_material"
            defaultValue={product?.color_o_material ?? ''}
          />
        </Field>
        <Field label="Imagen (URL)" htmlFor="image_url" hint="Opcional.">
          <Input
            id="image_url"
            name="image_url"
            defaultValue={product?.image_url ?? ''}
          />
        </Field>
      </div>

      <Field label="Descripción" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={product?.description ?? ''}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="available"
          defaultChecked={product?.available ?? true}
          className="h-4 w-4 accent-primary"
        />
        Disponible
      </label>

      {state.error && (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-surface text-muted ring-1 ring-border hover:bg-surface-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function CatalogClient({
  products,
  catalogSource,
  shopifyDomain,
}: {
  products: Product[]
  catalogSource: CatalogSource
  shopifyDomain: string | null
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [onlyReview, setOnlyReview] = useState(false)

  const reviewCount = products.filter((p) => p.needs_review).length
  const visible = onlyReview ? products.filter((p) => p.needs_review) : products
  const canResync = catalogSource === 'shopify' || Boolean(shopifyDomain)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Catálogo</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canResync && <ResyncButton />}
          <Button
            type="button"
            onClick={() => {
              setEditingId(null)
              setShowCreate((v) => !v)
            }}
          >
            Nuevo producto
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <FilterChip active={!onlyReview} onClick={() => setOnlyReview(false)}>
          Todos ({products.length})
        </FilterChip>
        <FilterChip active={onlyReview} onClick={() => setOnlyReview(true)}>
          Por revisar ({reviewCount})
        </FilterChip>
      </div>

      {showCreate && (
        <div className="mb-5">
          <ProductForm onDone={() => setShowCreate(false)} />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong bg-surface p-8 text-center text-muted">
          No hay productos {onlyReview ? 'por revisar' : 'todavía'}.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((p) =>
            editingId === p.id ? (
              <ProductForm
                key={p.id}
                product={p}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <article
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{p.name}</p>
                    {p.needs_review && (
                      <Badge tone="warning" dot>
                        Por revisar
                      </Badge>
                    )}
                    {!p.available && <Badge tone="neutral">No disponible</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {[
                      p.talla_range && `Tallas ${p.talla_range}`,
                      p.color_o_material,
                      !p.talla_range && !p.color_o_material
                        ? p.is_custom_order
                          ? 'Encargo a medida'
                          : p.category
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mr-1 text-sm font-semibold text-foreground">
                    {p.is_custom_order ? '—' : formatSoles(p.price_soles)}
                  </span>
                  <form action={toggleAvailable}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="next" value={String(!p.available)} />
                    <Button type="submit" variant="outline" size="sm">
                      {p.available ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </form>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreate(false)
                      setEditingId(p.id)
                    }}
                  >
                    Editar
                  </Button>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="danger" size="sm">
                      Eliminar
                    </Button>
                  </form>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  )
}
