'use client'

import { useState } from 'react'
import {
  resolveProductImage,
  type ProductImageFields,
} from '@/lib/product-image'
import { cn } from '@/lib/cn'

export function ProductThumbnail({
  product,
  size = 48,
  className,
}: {
  product: ProductImageFields
  size?: number
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const { url } = resolveProductImage(product)

  if (!url || broken) {
    return (
      <div
        className={cn(
          'shrink-0 rounded-lg bg-surface-muted ring-1 ring-border',
          className
        )}
        style={{ width: size, height: size }}
        aria-hidden
      />
    )
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn(
        'shrink-0 rounded-lg object-cover ring-1 ring-border',
        className
      )}
      style={{ width: size, height: size }}
    />
  )
}
