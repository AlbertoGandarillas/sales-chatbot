import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const TONES: Record<AlertTone, { wrap: string; icon: string; label: string }> = {
  info: { wrap: 'bg-info-surface text-info', icon: 'ℹ', label: 'Información' },
  success: {
    wrap: 'bg-success-surface text-success',
    icon: '✓',
    label: 'Éxito',
  },
  warning: {
    wrap: 'bg-warning-surface text-warning',
    icon: '!',
    label: 'Atención',
  },
  danger: {
    wrap: 'border border-danger-border bg-danger-surface text-danger-foreground',
    icon: '✕',
    label: 'Error',
  },
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone
  /** Anuncia el mensaje a lectores de pantalla (WCAG 4.1.3). */
  live?: boolean
}

export function Alert({
  tone = 'info',
  live = false,
  className,
  children,
  ...props
}: AlertProps) {
  const t = TONES[tone]
  return (
    <div
      role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}
      aria-live={live ? (tone === 'danger' ? 'assertive' : 'polite') : undefined}
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 text-sm',
        t.wrap,
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-current/15 text-[11px] font-bold"
      >
        {t.icon}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
