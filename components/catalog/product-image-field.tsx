'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  formatFileSizeBytes,
  PRODUCT_IMAGE_MAX_MB,
  resolveProductImage,
  validateProductImageFile,
  type ProductImageFields,
} from '@/lib/product-image'
import { Button, Field, Input } from '@/components/ui'
import { ProductThumbnail } from './product-thumbnail'

export function ProductImageField({
  product,
  onFileError,
}: {
  product?: ProductImageFields & { id?: string }
  /** Se invoca con mensaje de error o null si el archivo es válido / no hay archivo. */
  onFileError?: (message: string | null) => void
}) {
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [selectedFileLabel, setSelectedFileLabel] = useState<string | null>(null)
  const [removeStored, setRemoveStored] = useState(false)

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
    }
  }, [filePreview])

  function reportFileError(message: string | null) {
    onFileError?.(message)
  }

  const stored = product?.image_storage_path && !removeStored
  const resolved = useMemo(
    () =>
      product && !removeStored
        ? resolveProductImage(product)
        : { url: null, source: 'none' as const },
    [product, removeStored]
  )

  const previewUrl = filePreview ?? resolved.url

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (filePreview) URL.revokeObjectURL(filePreview)
    if (!file) {
      setFilePreview(null)
      setSelectedFileLabel(null)
      reportFileError(null)
      return
    }

    const validationError = validateProductImageFile(file)
    if (validationError) {
      e.target.value = ''
      setFilePreview(null)
      setSelectedFileLabel(null)
      reportFileError(validationError)
      return
    }

    reportFileError(null)
    setSelectedFileLabel(`${file.name} (${formatFileSizeBytes(file.size)})`)
    setFilePreview(URL.createObjectURL(file))
    setRemoveStored(false)
  }

  return (
    <div className="space-y-3 sm:col-span-3">
      <Field
        label="Imagen del producto"
        htmlFor="image_url"
        hint={`Pega una URL o sube un archivo (JPEG, PNG o WebP). Tamaño máximo: ${PRODUCT_IMAGE_MAX_MB} MB.`}
      >
        <Input
          id="image_url"
          name="image_url"
          type="url"
          placeholder="https://…"
          defaultValue={
            product?.image_storage_path ? '' : (product?.image_url ?? '')
          }
        />
      </Field>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="image_file"
            className="text-sm font-medium text-foreground"
          >
            Subir imagen
          </label>
          <input
            id="image_file"
            name="image_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="max-w-xs text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--btn-primary-bg)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--btn-primary-fg)]"
          />
          {selectedFileLabel && (
            <p className="text-xs text-muted" role="status">
              Archivo seleccionado: {selectedFileLabel}
            </p>
          )}
          <p className="text-xs text-muted">
            Archivos mayores a {PRODUCT_IMAGE_MAX_MB} MB no se pueden subir.
          </p>
        </div>

        {previewUrl ? (
          <div className="flex flex-col items-start gap-2">
            <span className="text-xs text-muted">Vista previa</span>
            <ProductThumbnail
              product={{
                image_url: previewUrl,
                image_storage_path: null,
              }}
              size={96}
            />
            {stored && !filePreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRemoveStored(true)}
              >
                Quitar imagen subida
              </Button>
            )}
          </div>
        ) : (
          stored && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRemoveStored(true)}
            >
              Quitar imagen subida
            </Button>
          )
        )}
      </div>

      <input
        type="hidden"
        name="remove_stored_image"
        value={removeStored ? 'true' : 'false'}
      />
    </div>
  )
}
