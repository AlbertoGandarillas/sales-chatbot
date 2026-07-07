'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { patchProductQuick } from './actions'
import type { Product } from './catalog-client'
import { cn } from '@/lib/cn'

type RowStatus = 'idle' | 'saving' | 'saved' | 'error'

export function ProductRowQuickControls({
  product,
  canWrite,
}: {
  product: Product
  canWrite: boolean
}) {
  const [available, setAvailable] = useState(product.available)
  const [price, setPrice] = useState(String(product.price_soles))
  const [status, setStatus] = useState<RowStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setAvailable(product.available)
    setPrice(String(product.price_soles))
  }, [product.available, product.price_soles])

  function runPatch(formData: FormData) {
    setStatus('saving')
    setError(null)
    startTransition(async () => {
      const result = await patchProductQuick({ error: null, ok: false }, formData)
      if (result.ok) {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
        setError(result.error)
      }
    })
  }

  function saveAvailable(next: boolean) {
    setAvailable(next)
    const fd = new FormData()
    fd.set('id', product.id)
    fd.set('available', String(next))
    runPatch(fd)
  }

  function savePrice(value: string) {
    const fd = new FormData()
    fd.set('id', product.id)
    fd.set('price_soles', value)
    runPatch(fd)
  }

  function handlePriceBlur() {
    const num = Number(price)
    if (Number.isNaN(num) || num < 0) {
      setPrice(String(product.price_soles))
      return
    }
    if (num === product.price_soles) return
    savePrice(String(num))
  }

  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  function schedulePriceSave(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const num = Number(value)
      if (!Number.isNaN(num) && num >= 0 && num !== product.price_soles) {
        savePrice(String(num))
      }
    }, 400)
  }

  if (!canWrite) {
    if (product.is_custom_order) {
      return <span className="mr-1 text-sm font-semibold text-foreground">—</span>
    }
    return (
      <span className="mr-1 text-sm font-semibold text-foreground">
        S/ {Number(product.price_soles).toFixed(2)}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {product.is_custom_order ? (
        <span className="min-w-[88px] text-sm font-semibold text-foreground">—</span>
      ) : (
        <label className="flex min-w-[88px] items-center gap-1 text-sm">
          <span className="text-muted">S/</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              schedulePriceSave(e.target.value)
            }}
            onBlur={handlePriceBlur}
            onKeyDown={handlePriceKeyDown}
            className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm font-semibold text-foreground"
            aria-label={`Precio de ${product.name}`}
          />
        </label>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          role="switch"
          checked={available}
          disabled={pending}
          onChange={(e) => saveAvailable(e.target.checked)}
          className="h-4 w-4 accent-primary"
          aria-label={available ? 'Disponible' : 'No disponible'}
        />
        <span className="hidden sm:inline">{available ? 'Disponible' : 'Oculto'}</span>
      </label>

      {(status === 'saving' || pending) && (
        <span className="text-xs text-muted" aria-live="polite">
          Guardando…
        </span>
      )}
      {status === 'saved' && (
        <span className="text-xs text-success" aria-live="polite">
          Guardado
        </span>
      )}
      {status === 'error' && error && (
        <span className={cn('max-w-[120px] text-xs text-danger')} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
