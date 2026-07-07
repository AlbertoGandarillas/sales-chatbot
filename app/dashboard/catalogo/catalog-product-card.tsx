'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProduct, markProductReviewed } from './actions'
import { useCatalogSelection } from './catalog-selection-context'
import type { CatalogProduct } from './catalog-types'
import { ProductRowQuickControls } from './product-row-quick-controls'
import { Badge, Button } from '@/components/ui'
import { ProductThumbnail } from '@/components/catalog/product-thumbnail'
import { effectivePrice } from '@/lib/pricing'
import { cn } from '@/lib/cn'

function formatSoles(n: number) {
  return `S/ ${Number(n).toFixed(2)}`
}

export function CatalogProductCard({
  product,
  canWrite,
  onEdit,
}: {
  product: CatalogProduct
  canWrite: boolean
  onEdit: () => void
}) {
  const router = useRouter()
  const { selectionMode, isSelected, toggleId } = useCatalogSelection()
  const [reviewPending, startReview] = useTransition()
  const selected = isSelected(product.id)
  const pricing = effectivePrice(product)

  function handleCardClick() {
    if (selectionMode) toggleId(product.id)
  }

  function handleMarkReviewed(e: React.MouseEvent) {
    e.stopPropagation()
    const fd = new FormData()
    fd.set('id', product.id)
    startReview(async () => {
      await markProductReviewed({ error: null, ok: false }, fd)
      router.refresh()
    })
  }

  return (
    <article
      role={selectionMode ? 'button' : undefined}
      tabIndex={selectionMode ? 0 : undefined}
      aria-selected={selectionMode ? selected : undefined}
      onClick={selectionMode ? handleCardClick : undefined}
      onKeyDown={
        selectionMode
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleId(product.id)
              }
            }
          : undefined
      }
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-card border bg-surface p-4 transition-all',
        selectionMode && 'cursor-pointer min-h-[44px]',
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border',
        selectionMode && !selected && 'hover:border-border-strong hover:bg-surface-muted'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          <ProductThumbnail product={product} size={48} />
          {selectionMode && (
            <span
              className={cn(
                'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                selected
                  ? 'bg-primary text-[var(--btn-primary-fg)]'
                  : 'border border-border bg-surface text-muted'
              )}
              aria-hidden
            >
              {selected ? '✓' : ''}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{product.name}</p>
            {product.needs_review && (
              <Badge tone="warning" dot>
                Por revisar
              </Badge>
            )}
            {!product.available && <Badge tone="neutral">No disponible</Badge>}
            {pricing.onPromo && (
              <Badge tone="success" dot>
                En oferta
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            {[
              product.talla_range && `Tallas ${product.talla_range}`,
              product.color_o_material,
              !product.talla_range && !product.color_o_material
                ? product.is_custom_order
                  ? 'Encargo a medida'
                  : product.category
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
      </div>

      {!selectionMode && (
        <div className="flex flex-wrap items-center gap-2">
          <ProductRowQuickControls product={product} canWrite={canWrite} />
          {pricing.onPromo && (
            <span className="text-xs text-success">
              Oferta: {formatSoles(pricing.price)}
            </span>
          )}
          {canWrite && product.needs_review && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reviewPending}
              onClick={handleMarkReviewed}
            >
              {reviewPending ? '…' : 'Revisado'}
            </Button>
          )}
          {canWrite && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                Editar
              </Button>
              <form action={deleteProduct}>
                <input type="hidden" name="id" value={product.id} />
                <Button type="submit" variant="danger" size="sm">
                  Eliminar
                </Button>
              </form>
            </>
          )}
        </div>
      )}

      {selectionMode && !product.is_custom_order && (
        <span className="text-sm font-semibold text-muted">
          {formatSoles(product.price_soles)}
        </span>
      )}
    </article>
  )
}
