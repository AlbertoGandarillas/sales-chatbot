import type { ReactNode } from 'react'
import Link from 'next/link'

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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-foreground"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            A
          </span>
          Aynibot
        </Link>
        <div className="rounded-card border border-border bg-surface p-7 shadow-sm">
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
