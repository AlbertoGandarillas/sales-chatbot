import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'link'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:translate-y-px',
  secondary: 'bg-surface-muted text-foreground hover:bg-border active:translate-y-px',
  outline:
    'border border-border-strong bg-surface text-foreground hover:bg-surface-muted active:translate-y-px',
  ghost: 'text-foreground hover:bg-surface-muted active:translate-y-px',
  danger: 'bg-danger text-white hover:brightness-110 active:translate-y-px',
  success: 'bg-success text-white hover:brightness-110 active:translate-y-px',
  link: 'text-primary underline-offset-4 hover:underline',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-9 w-9',
}

export function buttonVariants(
  opts: { variant?: ButtonVariant; size?: ButtonSize } = {}
): string {
  const { variant = 'primary', size = 'md' } = opts
  return cn(base, VARIANTS[variant], SIZES[size])
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
