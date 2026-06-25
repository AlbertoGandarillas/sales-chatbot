'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/dashboard/conversaciones', label: 'Conversaciones' },
  { href: '/dashboard/catalogo', label: 'Catálogo' },
  { href: '/dashboard/perfil', label: 'Perfil' },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

export function DashboardNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto px-4">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border-strong hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
