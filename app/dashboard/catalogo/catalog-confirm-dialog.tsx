'use client'

import { useEffect } from 'react'
import { Button, Field, Input } from '@/components/ui'
import { cn } from '@/lib/cn'

type DialogVariant = 'mark_all_reviewed' | 'delete_bulk'

export function CatalogConfirmDialog({
  open,
  variant,
  count,
  productLabel,
  isShopify,
  confirmInput,
  onConfirmInputChange,
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean
  variant: DialogVariant
  count: number
  productLabel?: string | null
  isShopify: boolean
  confirmInput: string
  onConfirmInputChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onCancel()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, pending, onCancel])

  if (!open) return null

  const isDelete = variant === 'delete_bulk'
  const deleteReady = confirmInput === 'ELIMINAR'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-foreground/50"
        aria-label="Cerrar"
        onClick={pending ? undefined : onCancel}
        tabIndex={-1}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="catalog-dialog-title"
        className={cn(
          'relative z-10 w-full max-w-md rounded-card border border-border bg-surface p-5 shadow-xl'
        )}
      >
        <h2 id="catalog-dialog-title" className="text-lg font-semibold text-foreground">
          {isDelete
            ? count === 1 && productLabel
              ? `Eliminar «${productLabel}»`
              : `Eliminar ${count} producto${count === 1 ? '' : 's'}`
            : `Confirmar ${count} por revisar`}
        </h2>

        {isDelete ? (
          <div className="mt-3 space-y-2 text-sm text-muted">
            <p>Esta acción no se puede deshacer. El bot dejará de ofrecer este producto.</p>
            {isShopify && (
              <p>
                Los productos de Shopify pueden volver a aparecer si resincronizas el catálogo.
              </p>
            )}
            <Field label="Escribe ELIMINAR para confirmar" htmlFor="confirm_delete">
              <Input
                id="confirm_delete"
                value={confirmInput}
                onChange={(e) => onConfirmInputChange(e.target.value)}
                placeholder="ELIMINAR"
                autoComplete="off"
                autoFocus
              />
            </Field>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            ¿Marcar {count} producto{count === 1 ? '' : 's'} como revisados?
            {isShopify &&
              ' Si resincronizas Shopify, los actualizados volverán a pedir revisión.'}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={isDelete ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={pending || (isDelete && !deleteReady)}
          >
            {pending
              ? 'Procesando…'
              : isDelete
                ? 'Eliminar definitivamente'
                : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
