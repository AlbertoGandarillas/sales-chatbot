'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  bulkCatalogProducts,
  type BulkCatalogAction,
  type CatalogBulkState,
} from './actions'
import { useCatalogSelection } from './catalog-selection-context'
import type { CatalogProduct } from './catalog-types'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

const bulkInitial: CatalogBulkState = { error: null, ok: false }

export function CatalogFloatingBar({
  visibleProducts,
  selectedProducts,
  onRequestDelete,
  onFeedback,
}: {
  visibleProducts: CatalogProduct[]
  selectedProducts: CatalogProduct[]
  onRequestDelete: () => void
  onFeedback: (message: string, tone: 'success' | 'danger') => void
}) {
  const router = useRouter()
  const { selectionMode, selectedCount, clearSelection, selectIds } =
    useCatalogSelection()
  const [pending, startTransition] = useTransition()

  if (!selectionMode || selectedCount === 0) return null

  const hasReviewPending = selectedProducts.some((p) => p.needs_review)

  function runBulk(action: BulkCatalogAction) {
    const ids = selectedProducts.map((p) => p.id)
    const fd = new FormData()
    fd.set('action', action)
    fd.set('ids', JSON.stringify(ids))

    startTransition(async () => {
      const result = await bulkCatalogProducts(bulkInitial, fd)
      if (result.ok) {
        const n = result.affected ?? ids.length
        const labels: Record<BulkCatalogAction, string> = {
          mark_reviewed: 'marcados como revisados',
          set_available: 'mostrados',
          set_unavailable: 'ocultos',
          delete: 'eliminados',
        }
        onFeedback(`${n} producto${n === 1 ? '' : 's'} ${labels[action]}`, 'success')
        clearSelection()
        router.refresh()
      } else {
        onFeedback(result.error ?? 'Error en la acción', 'danger')
      }
    })
  }

  return (
    <div
      role="toolbar"
      aria-label="Acciones sobre productos seleccionados"
      className={cn(
        'fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2',
        'rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur-sm',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {selectedCount} seleccionado{selectedCount === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectIds(visibleProducts.map((p) => p.id))}
            className="text-xs font-medium text-primary hover:underline"
          >
            Todos en vista ({visibleProducts.length})
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-muted hover:text-foreground"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
        {hasReviewPending && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => runBulk('mark_reviewed')}
          >
            Revisados
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => runBulk('set_available')}
        >
          Mostrar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => runBulk('set_unavailable')}
        >
          Ocultar
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={onRequestDelete}
        >
          Eliminar
        </Button>
      </div>
    </div>
  )
}
