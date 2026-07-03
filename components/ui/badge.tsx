import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const TONES: Record<BadgeTone, { wrap: string; dot: string }> = {
  neutral: {
    wrap: 'bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]',
    dot: 'bg-[var(--badge-neutral-dot)]',
  },
  primary: {
    wrap: 'bg-[var(--badge-primary-bg)] text-[var(--badge-primary-fg)]',
    dot: 'bg-[var(--badge-primary-dot)]',
  },
  success: {
    wrap: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]',
    dot: 'bg-[var(--badge-success-dot)]',
  },
  warning: {
    wrap: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)]',
    dot: 'bg-[var(--badge-warning-dot)]',
  },
  danger: {
    wrap: 'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]',
    dot: 'bg-[var(--badge-danger-dot)]',
  },
  info: {
    wrap: 'bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]',
    dot: 'bg-[var(--badge-info-dot)]',
  },
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  dot?: boolean
}

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const t = TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        t.wrap,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full', t.dot)}
        />
      )}
      {children}
    </span>
  )
}
