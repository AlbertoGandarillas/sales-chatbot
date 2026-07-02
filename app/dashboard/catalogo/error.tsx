'use client'

import { Button } from '@/components/ui'

export default function CatalogoError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">
        No se pudo cargar el catálogo
      </h1>
      <p className="text-sm text-muted">
        Si subiste una imagen muy grande, usa una de máximo 2 MB (JPEG, PNG o WebP)
        e inténtalo de nuevo.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </main>
  )
}
