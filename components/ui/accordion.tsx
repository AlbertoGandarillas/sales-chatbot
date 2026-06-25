import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Accordion({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-3', className)} {...props} />
}

export interface AccordionItemProps {
  question: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function AccordionItem({
  question,
  children,
  defaultOpen = false,
  className,
}: AccordionItemProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </summary>
      <div className="px-5 pb-5 text-muted">{children}</div>
    </details>
  )
}
