import Image from 'next/image'
import Link from 'next/link'

const SIZES = {
  sm: { icon: 40, wordmark: 'text-lg' },
  md: { icon: 44, wordmark: 'text-xl' },
  lg: { icon: 52, wordmark: 'text-2xl' },
} as const

type UruLogoProps = {
  variant?: 'full' | 'isotipo'
  size?: keyof typeof SIZES
  className?: string
  /** Ruta del enlace. `false` = sin enlace (p. ej. dashboard). Default `/`. */
  href?: string | false
}

function LogoContent({
  variant,
  size,
  className,
}: Required<Pick<UruLogoProps, 'variant' | 'size'>> & { className?: string }) {
  const { icon, wordmark } = SIZES[size]

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      {/* Asset oficial: public/brand/uru-isotipo.svg (brandbook v3) */}
      <Image
        src="/brand/uru-isotipo.svg"
        alt=""
        width={icon}
        height={icon}
        className="shrink-0"
        priority
      />
      {variant === 'full' && (
        /* Wordmark tipográfico — Nunito Black, siempre minúsculas */
        <span className={`font-brand font-black tracking-tight ${wordmark}`}>uru</span>
      )}
    </span>
  )
}

export function UruLogo({
  variant = 'full',
  size = 'md',
  className,
  href = '/',
}: UruLogoProps) {
  const content = <LogoContent variant={variant} size={size} className={className} />

  if (href !== false) {
    return (
      <Link href={href ?? '/'} className="text-foreground hover:opacity-90">
        {content}
      </Link>
    )
  }

  return content
}
