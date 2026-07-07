'use client'

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CatalogSource } from '@/lib/business-resolver'
import {
  bulkCatalogProducts,
  markAllProductsReviewed,
  saveProduct,
  resyncCatalog,
  type CatalogBulkState,
  type CatalogState,
  type ResyncState,
} from './actions'
import { CatalogConfirmDialog } from './catalog-confirm-dialog'
import { CatalogFloatingBar } from './catalog-floating-bar'
import { CatalogProductCard } from './catalog-product-card'
import {
  CatalogSelectionProvider,
  useCatalogSelection,
} from './catalog-selection-context'
import type { CatalogProduct } from './catalog-types'
import { Alert, Button, Field, Input, Textarea } from '@/components/ui'
import { ProductImageField } from '@/components/catalog/product-image-field'
import { validateProductImageFile } from '@/lib/product-image'
import {
  PROMO_LABEL_MAX_LENGTH,
  timestamptzToDatetimeLocal,
} from '@/lib/promo-form'
import { cn } from '@/lib/cn'

export type { CatalogProduct } from './catalog-types'
/** @deprecated Use CatalogProduct */
export type Product = CatalogProduct

const initialState: CatalogState = { error: null, ok: false }
const resyncInitial: ResyncState = { error: null, result: null }
const bulkInitial: CatalogBulkState = { error: null, ok: false }

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

function ProductPromoFields({ product }: { product?: CatalogProduct }) {
  const hasPromo = product?.promo_price_soles != null

  return (
    <details className="rounded-lg border border-border bg-surface p-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Promoción (opcional)
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field
          label="Precio promocional (S/)"
          htmlFor="promo_price_soles"
          hint="Debe ser menor que el precio normal."
        >
          <Input
            id="promo_price_soles"
            name="promo_price_soles"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ej: 2.00"
            defaultValue={product?.promo_price_soles ?? ''}
          />
        </Field>
        <Field
          label="Etiqueta"
          htmlFor="promo_label"
          hint={`Opcional, máx. ${PROMO_LABEL_MAX_LENGTH} caracteres.`}
        >
          <Input
            id="promo_label"
            name="promo_label"
            maxLength={PROMO_LABEL_MAX_LENGTH}
            placeholder="Oferta del día"
            defaultValue={product?.promo_label ?? ''}
          />
        </Field>
        <Field label="Válida desde" htmlFor="promo_starts_at" hint="Opcional. Hora Lima.">
          <Input
            id="promo_starts_at"
            name="promo_starts_at"
            type="datetime-local"
            defaultValue={timestamptzToDatetimeLocal(product?.promo_starts_at ?? null)}
          />
        </Field>
        <Field label="Válida hasta" htmlFor="promo_ends_at" hint="Opcional. Hora Lima.">
          <Input
            id="promo_ends_at"
            name="promo_ends_at"
            type="datetime-local"
            defaultValue={timestamptzToDatetimeLocal(product?.promo_ends_at ?? null)}
          />
        </Field>
      </div>
      {hasPromo && (
        <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="remove_promo"
            value="true"
            className="h-4 w-4 accent-primary"
          />
          Quitar promoción al guardar
        </label>
      )}
    </details>
  )
}

function ProductForm({
  product,
  onDone,
}: {
  product?: CatalogProduct
  onDone: () => void
}) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    if (state.ok) onDone()
  }, [state.ok, onDone])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fileInput = e.currentTarget.elements.namedItem(
      'image_file'
    ) as HTMLInputElement | null
    const file = fileInput?.files?.[0]
    if (file && file.size > 0) {
      const validationError = validateProductImageFile(file)
      if (validationError) {
        e.preventDefault()
        setImageError(validationError)
        return
      }
    }
    setImageError(null)
  }

  const saveBlocked = pending || Boolean(imageError)

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      onSubmit={handleSubmit}
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
        <Field label="Rango de tallas" htmlFor="talla_range" hint="Opcional.">
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
      </div>

      <ProductImageField product={product} onFileError={setImageError} />

      {!product?.is_custom_order && <ProductPromoFields product={product} />}

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

      {(imageError || state.error) && (
        <Alert tone="danger" live>
          {imageError ?? state.error}
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={saveBlocked}>
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
          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
          : 'bg-surface text-muted ring-1 ring-border hover:bg-surface-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function CatalogClientInner({
  products,
  catalogSource,
  shopifyDomain,
  canWrite = true,
}: {
  products: CatalogProduct[]
  catalogSource: CatalogSource
  shopifyDomain: string | null
  canWrite?: boolean
}) {
  const router = useRouter()
  const { selectionMode, selectedIds, selectedCount, toggleSelectionMode, exitSelectionMode } =
    useCatalogSelection()

  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [onlyReview, setOnlyReview] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'danger' } | null>(
    null
  )
  const [dialog, setDialog] = useState<'mark_all' | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<CatalogProduct[] | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [bulkPending, startBulk] = useTransition()

  const reviewCount = products.filter((p) => p.needs_review).length
  const visible = onlyReview ? products.filter((p) => p.needs_review) : products
  const canResync = catalogSource === 'shopify' || Boolean(shopifyDomain)
  const isShopify = catalogSource === 'shopify'

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  )

  const selectionHasShopify = selectedProducts.some((p) => p.source === 'shopify')

  useEffect(() => {
    if (!selectionMode) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') exitSelectionMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectionMode, exitSelectionMode])

  const closeDialog = useCallback(() => {
    setDialog(null)
    setDeleteTargets(null)
    setDeleteConfirmInput('')
  }, [])

  function openDeleteDialog(targets: CatalogProduct[]) {
    setDeleteConfirmInput('')
    setDeleteTargets(targets)
  }

  function showFeedback(message: string, tone: 'success' | 'danger') {
    setFeedback({ message, tone })
    setTimeout(() => setFeedback(null), 4000)
  }

  function confirmMarkAll() {
    startBulk(async () => {
      const result = await markAllProductsReviewed(bulkInitial, new FormData())
      if (result.ok) {
        showFeedback(
          `${result.affected ?? reviewCount} producto${(result.affected ?? reviewCount) === 1 ? '' : 's'} marcados como revisados`,
          'success'
        )
        closeDialog()
        router.refresh()
      } else {
        showFeedback(result.error ?? 'Error', 'danger')
      }
    })
  }

  function confirmDelete() {
    if (!deleteTargets?.length) return
    const ids = deleteTargets.map((p) => p.id)
    const fd = new FormData()
    fd.set('action', 'delete')
    fd.set('ids', JSON.stringify(ids))
    fd.set('confirm_token', 'ELIMINAR')

    startBulk(async () => {
      const result = await bulkCatalogProducts(bulkInitial, fd)
      if (result.ok) {
        showFeedback(
          `${result.affected ?? ids.length} producto${(result.affected ?? ids.length) === 1 ? '' : 's'} eliminados`,
          'success'
        )
        closeDialog()
        if (deleteTargets.length > 1 || selectionMode) exitSelectionMode()
        router.refresh()
      } else {
        showFeedback(result.error ?? 'Error al eliminar', 'danger')
      }
    })
  }

  return (
    <div className={cn(selectionMode && selectedCount > 0 && 'pb-28')}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Catálogo</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <Button
              type="button"
              variant={selectionMode ? 'primary' : 'outline'}
              size="sm"
              aria-pressed={selectionMode}
              onClick={() => {
                if (selectionMode) exitSelectionMode()
                else {
                  setEditingId(null)
                  setShowCreate(false)
                  toggleSelectionMode()
                }
              }}
            >
              {selectionMode ? 'Listo' : 'Seleccionar'}
            </Button>
          )}
          {canWrite && canResync && <ResyncButton />}
          {canWrite && !selectionMode && (
            <Button
              type="button"
              onClick={() => {
                setEditingId(null)
                setShowCreate((v) => !v)
              }}
            >
              Nuevo producto
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip active={!onlyReview} onClick={() => setOnlyReview(false)}>
          Todos ({products.length})
        </FilterChip>
        <FilterChip active={onlyReview} onClick={() => setOnlyReview(true)}>
          Por revisar ({reviewCount})
        </FilterChip>
      </div>

      {canWrite && reviewCount > 0 && !selectionMode && (
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialog('mark_all')}
          >
            Confirmar los {reviewCount} por revisar
          </Button>
        </div>
      )}

      {feedback && (
        <div className="mb-4">
          <Alert tone={feedback.tone} live>
            {feedback.message}
          </Alert>
        </div>
      )}

      {canWrite && showCreate && !selectionMode && (
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
            editingId === p.id && canWrite && !selectionMode ? (
              <ProductForm key={p.id} product={p} onDone={() => setEditingId(null)} />
            ) : (
              <CatalogProductCard
                key={p.id}
                product={p}
                canWrite={canWrite}
                onEdit={() => {
                  setShowCreate(false)
                  setEditingId(p.id)
                }}
                onRequestDelete={(product) => openDeleteDialog([product])}
              />
            )
          )}
        </div>
      )}

      {canWrite && (
        <CatalogFloatingBar
          visibleProducts={visible}
          selectedProducts={selectedProducts}
          onRequestDelete={() => openDeleteDialog(selectedProducts)}
          onFeedback={(message, tone) => {
            setFeedback({ message, tone })
            setTimeout(() => setFeedback(null), 4000)
          }}
        />
      )}

      <CatalogConfirmDialog
        open={dialog === 'mark_all'}
        variant="mark_all_reviewed"
        count={reviewCount}
        isShopify={isShopify}
        confirmInput=""
        onConfirmInputChange={() => {}}
        onConfirm={confirmMarkAll}
        onCancel={closeDialog}
        pending={bulkPending}
      />

      <CatalogConfirmDialog
        open={deleteTargets !== null && deleteTargets.length > 0}
        variant="delete_bulk"
        count={deleteTargets?.length ?? 0}
        productLabel={
          deleteTargets?.length === 1 ? deleteTargets[0].name : null
        }
        isShopify={
          deleteTargets?.some((p) => p.source === 'shopify') ?? false
        }
        confirmInput={deleteConfirmInput}
        onConfirmInputChange={setDeleteConfirmInput}
        onConfirm={confirmDelete}
        onCancel={closeDialog}
        pending={bulkPending}
      />
    </div>
  )
}

export function CatalogClient(props: {
  products: CatalogProduct[]
  catalogSource: CatalogSource
  shopifyDomain: string | null
  canWrite?: boolean
}) {
  return (
    <CatalogSelectionProvider>
      <CatalogClientInner {...props} />
    </CatalogSelectionProvider>
  )
}
