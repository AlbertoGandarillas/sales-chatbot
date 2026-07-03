'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('uru-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(getInitialTheme())
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('uru-theme', next)
    setTheme(next)
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cambiar tema"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted',
          className
        )}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-muted hover:text-foreground',
        className
      )}
    >
      {theme === 'light' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('uru-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
      }}
    />
  )
}
