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
  neutral: { wrap: 'bg-surface-muted text-foreground', dot: 'bg-muted' },
  primary: { wrap: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  success: { wrap: 'bg-success-surface text-success', dot: 'bg-success' },
  warning: { wrap: 'bg-warning-surface text-warning', dot: 'bg-warning' },
  danger: { wrap: 'bg-danger-surface text-danger', dot: 'bg-danger' },
  info: { wrap: 'bg-info-surface text-info', dot: 'bg-info' },
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
