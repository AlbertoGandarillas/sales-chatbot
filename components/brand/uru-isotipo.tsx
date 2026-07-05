import { cn } from '@/lib/cn'

/** Geometría trazada del isotipo original (referencia brand). viewBox 0 0 100 100 */
const BUBBLE =
  'M 80.17 3.45 L 83.62 3.45 L 90.52 6.03 L 94.83 10.34 L 97.41 17.24 L 96.55 24.14 L 93.97 28.45 L 88.79 32.76 L 83.62 33.62 L 81.9 35.34 L 81.9 65.52 L 78.45 73.28 L 72.41 79.31 L 63.79 82.76 L 37.07 82.76 L 22.41 96.55 L 22.41 83.62 L 12.93 79.31 L 5.17 70.69 L 3.45 66.38 L 2.59 59.48 L 2.59 35.34 L 3.45 34.48 L 4.31 28.45 L 7.76 22.41 L 13.79 17.24 L 19.83 14.66 L 25 14.66 L 25.86 13.79 L 59.48 13.79 L 60.34 14.66 L 65.52 14.66 L 66.38 15.52 L 68.97 10.34 L 73.28 6.03 L 76.72 4.31 L 79.31 4.31 Z'

const U =
  'M 29.31 31.9 L 31.9 32.76 L 34.48 36.21 L 34.48 60.34 L 36.21 63.79 L 39.66 66.38 L 45.69 66.38 L 49.14 62.93 L 50.86 59.48 L 50.86 35.34 L 53.45 32.76 L 57.76 32.76 L 59.48 33.62 L 60.34 35.34 L 60.34 62.07 L 56.03 70.69 L 50 75 L 47.41 75.86 L 37.93 75.86 L 31.03 72.41 L 26.72 67.24 L 25 62.93 L 24.14 54.31 L 24.14 37.93 L 25 37.07 L 25 34.48 L 26.72 32.76 L 28.45 32.76 Z'

const SPARK = { cx: 83, cy: 18, ring: 10.5, core: 8.2 }

type UruIsotipoProps = {
  size: number
  className?: string
}

export function UruIsotipo({ size, className }: UruIsotipoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="uru"
      className={cn('uru-isotipo shrink-0', className)}
    >
      {/* Tema claro: burbuja verde sólida */}
      <path className="uru-isotipo__bubble-light" d={BUBBLE} />
      {/* Tema oscuro: burbuja blanca + u en negativo */}
      <path
        className="uru-isotipo__bubble-dark"
        fillRule="evenodd"
        clipRule="evenodd"
        d={`${BUBBLE} ${U}`}
      />
      {/* Tema claro: u blanca sólida */}
      <path className="uru-isotipo__u-light" d={U} />
      {/* Destello: anillo + centro (colores por tema vía CSS) */}
      <circle
        className="uru-isotipo__spark-ring"
        cx={SPARK.cx}
        cy={SPARK.cy}
        r={SPARK.ring}
      />
      <circle
        className="uru-isotipo__spark-core"
        cx={SPARK.cx}
        cy={SPARK.cy}
        r={SPARK.core}
      />
    </svg>
  )
}
