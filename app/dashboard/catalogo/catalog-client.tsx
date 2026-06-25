'use client'

import { useActionState, useEffect, useState } from 'react'
import type { Vertical } from '@/lib/business-resolver'
import {
  saveProduct,
  deleteProduct,
  toggleAvailable,
  resyncCatalog,
  type CatalogState,
  type ResyncState,
} from './actions'

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
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50"
        >
          {pending ? 'Sincronizando…' : 'Resincronizar catálogo'}
        </button>
      </form>
      {state.result && (
        <p className="text-xs text-green-700">
          {state.result.inserted} nuevos · {state.result.updated} actualizados ·{' '}
          {state.result.needsReviewCount} por revisar
        </p>
      )}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  )
}

const BAKERY_CATEGORIES = [
  ['panes', 'Panes'],
  ['pasteleria', 'Pastelería'],
  ['tortas', 'Tortas'],
  ['bebidas', 'Bebidas'],
  ['otros', 'Otros'],
] as const

function formatSoles(n: number) {
  return `S/ ${Number(n).toFixed(2)}`
}

function ProductForm({
  vertical,
  product,
  onDone,
}: {
  vertical: Vertical
  product?: Product
  onDone: () => void
}) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState)
  const isRetail = vertical === 'retail'

  useEffect(() => {
    if (state.ok) onDone()
  }, [state.ok, onDone])

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-stone-300 bg-stone-50 p-4"
    >
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-stone-700">Nombre</span>
          <input
            name="name"
            required
            defaultValue={product?.name ?? ''}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Precio (S/)</span>
          <input
            name="price_soles"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.price_soles ?? 0}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {!isRetail && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-stone-700">Categoría</span>
            <select
              name="category"
              defaultValue={product?.category ?? 'otros'}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {BAKERY_CATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              name="is_custom_order"
              defaultChecked={product?.is_custom_order ?? false}
            />
            <span className="text-stone-700">Es encargo personalizado (sin precio fijo)</span>
          </label>
        </div>
      )}

      {isRetail && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-stone-700">Rango de tallas</span>
            <input
              name="talla_range"
              placeholder="Ej: 38 al 43"
              defaultValue={product?.talla_range ?? ''}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-700">Color / material</span>
            <input
              name="color_o_material"
              defaultValue={product?.color_o_material ?? ''}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-700">Imagen (URL)</span>
            <input
              name="image_url"
              defaultValue={product?.image_url ?? ''}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      <label className="block text-sm">
        <span className="text-stone-700">Descripción</span>
        <textarea
          name="description"
          rows={2}
          defaultValue={product?.description ?? ''}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="available"
          defaultChecked={product?.available ?? true}
        />
        <span className="text-stone-700">Disponible</span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function CatalogClient({
  products,
  vertical,
  shopifyDomain,
}: {
  products: Product[]
  vertical: Vertical
  shopifyDomain: string | null
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [onlyReview, setOnlyReview] = useState(false)

  const reviewCount = products.filter((p) => p.needs_review).length
  const visible = onlyReview ? products.filter((p) => p.needs_review) : products
  const isRetail = vertical === 'retail'

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Catálogo</h1>
        <div className="flex flex-wrap items-center gap-2">
          {shopifyDomain && <ResyncButton />}
          <button
            type="button"
            onClick={() => {
              setEditingId(null)
              setShowCreate((v) => !v)
            }}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Nuevo producto
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setOnlyReview(false)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            !onlyReview ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'
          }`}
        >
          Todos ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setOnlyReview(true)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            onlyReview ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'
          }`}
        >
          Por revisar ({reviewCount})
        </button>
      </div>

      {showCreate && (
        <div className="mb-5">
          <ProductForm vertical={vertical} onDone={() => setShowCreate(false)} />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
          No hay productos {onlyReview ? 'por revisar' : 'todavía'}.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((p) =>
            editingId === p.id ? (
              <ProductForm
                key={p.id}
                vertical={vertical}
                product={p}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <article
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900">{p.name}</p>
                    {p.needs_review && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Por revisar
                      </span>
                    )}
                    {!p.available && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                        No disponible
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500">
                    {isRetail
                      ? [p.talla_range && `Tallas ${p.talla_range}`, p.color_o_material]
                          .filter(Boolean)
                          .join(' · ') || '—'
                      : p.is_custom_order
                        ? 'Encargo personalizado'
                        : p.category}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-stone-900">
                    {p.is_custom_order ? '—' : formatSoles(p.price_soles)}
                  </span>
                  <form action={toggleAvailable}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="next" value={String(!p.available)} />
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
                    >
                      {p.available ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false)
                      setEditingId(p.id)
                    }}
                    className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
                  >
                    Editar
                  </button>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
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
