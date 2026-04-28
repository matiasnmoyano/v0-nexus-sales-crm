interface Props {
  score: number
  size?: number
  strokeWidth?: number
  className?: string
}

/**
 * Circular score indicator. Colour ramps from muted → primary as the score climbs.
 */
export function ScoreRing({ score, size = 64, strokeWidth = 5, className }: Props) {
  const clamped = Math.max(0, Math.min(100, score))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  // Primary colour at >=70, muted-foreground at <40, in-between blends
  const stroke =
    clamped >= 70 ? "var(--primary)" : clamped >= 40 ? "var(--chart-2)" : "var(--muted-foreground)"

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div
        className="-mt-[var(--size)] flex items-center justify-center text-foreground tabular-nums"
        style={
          {
            ["--size" as string]: `${size}px`,
            height: size,
            fontSize: size * 0.32,
            fontWeight: 500,
            letterSpacing: "-0.02em",
          } as React.CSSProperties
        }
      >
        {clamped}
      </div>
    </div>
  )
}
