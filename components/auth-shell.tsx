import type { ReactNode } from 'react'
import { UruLogo } from '@/components/brand/uru-logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <UruLogo size="md" href="/" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="mt-5 text-center text-sm text-muted">{footer}</div>
        )}
      </div>
    </main>
  )
}
