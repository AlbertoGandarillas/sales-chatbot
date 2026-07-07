'use client'

import { useEffect, useRef } from 'react'
import { Button, Field, Input } from '@/components/ui'
import { cn } from '@/lib/cn'

type DialogVariant = 'mark_all_reviewed' | 'delete_bulk'

export function CatalogConfirmDialog({
  open,
  variant,
  count,
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
  isShopify: boolean
  confirmInput: string
  onConfirmInputChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  if (!open) return null

  const isDelete = variant === 'delete_bulk'
  const deleteReady = confirmInput === 'ELIMINAR'

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className={cn(
        'fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-md',
        'rounded-card border border-border bg-surface p-0 shadow-lg backdrop:bg-foreground/40'
      )}
    >
      <div className="p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {isDelete
            ? `Eliminar ${count} producto${count === 1 ? '' : 's'}`
            : `Confirmar ${count} por revisar`}
        </h2>

        {isDelete ? (
          <div className="mt-3 space-y-2 text-sm text-muted">
            <p>Esta acción no se puede deshacer. El bot dejará de ofrecer estos productos.</p>
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
    </dialog>
  )
}
