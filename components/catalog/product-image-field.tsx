'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  resolveProductImage,
  type ProductImageFields,
} from '@/lib/product-image'
import { Button, Field, Input } from '@/components/ui'
import { ProductThumbnail } from './product-thumbnail'

export function ProductImageField({
  product,
}: {
  product?: ProductImageFields & { id?: string }
}) {
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [removeStored, setRemoveStored] = useState(false)

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
    }
  }, [filePreview])

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
      return
    }
    setFilePreview(URL.createObjectURL(file))
    setRemoveStored(false)
  }

  return (
    <div className="space-y-3 sm:col-span-3">
      <Field
        label="Imagen del producto"
        htmlFor="image_url"
        hint="Pega una URL o sube un archivo (JPEG, PNG o WebP, máx. 2 MB). Si subes archivo, tiene prioridad."
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
            className="max-w-xs text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          />
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
