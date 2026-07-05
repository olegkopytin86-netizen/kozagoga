/* ===============================================================
 * CMLogo — Premium Gaming Monogram for CifraMall
 *
 * Style:  Steam Deck UI × Razer × Apple Gaming
 * Colors: Graphite #202020 + Orange #FF7A00
 * Sizes:  44×44 (desktop) / 38×38 (mobile)
 * =============================================================== */

interface CMLogoProps {
  size?: number  /* default: 44 */
  className?: string
}

export default function CMLogo({ size = 44, className = "" }: CMLogoProps) {
  const s = size
  const g = size / 44  /* scale factor */

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CifraMall"
    >
      <defs>
        <radialGradient id="cm-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2A2A2A" />
          <stop offset="100%" stopColor="#151515" />
        </radialGradient>
        <radialGradient id="cm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,122,0,0.35)" />
          <stop offset="100%" stopColor="rgba(255,122,0,0)" />
        </radialGradient>
        <linearGradient id="cm-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.75)" />
        </linearGradient>
        <linearGradient id="cm-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8C1A" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <filter id="cm-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>

      {/* Outer glow */}
      <circle cx={22 * g} cy={22 * g} r={22 * g} fill="url(#cm-glow)" opacity="0.6" />

      {/* Main circle */}
      <circle
        cx={22 * g}
        cy={22 * g}
        r={20 * g}
        fill="url(#cm-bg)"
        stroke="rgba(255,122,0,0.2)"
        strokeWidth={1.2 * g}
        filter="url(#cm-shadow)"
      />

      {/* Inner ring */}
      <circle
        cx={22 * g}
        cy={22 * g}
        r={16.5 * g}
        fill="none"
        stroke="rgba(255,122,0,0.08)"
        strokeWidth={0.5 * g}
      />

      {/* C — letter shape with tech cut */}
      <path
        d={`
          M ${13.5 * g} ${15 * g}
          C ${13.5 * g} ${15 * g}, ${13 * g} ${14 * g}, ${11 * g} ${14 * g}
          C ${8.5 * g} ${14 * g}, ${7 * g} ${16 * g}, ${7 * g} ${22 * g}
          C ${7 * g} ${28 * g}, ${8.5 * g} ${30 * g}, ${11 * g} ${30 * g}
          C ${13 * g} ${30 * g}, ${13.5 * g} ${29 * g}, ${13.5 * g} ${29 * g}
        `}
        stroke="url(#cm-gradient)"
        strokeWidth={2.8 * g}
        strokeLinecap="round"
        fill="none"
      />

      {/* M — letter shape with tech angles */}
      <path
        d={`
          M ${17 * g} ${30 * g}
          L ${17 * g} ${18.5 * g}
          L ${20.5 * g} ${24 * g}
          L ${24 * g} ${18.5 * g}
          L ${24 * g} ${30 * g}
        `}
        stroke="url(#cm-gradient)"
        strokeWidth={2.8 * g}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Connecting line between C and M — subtle orange accent */}
      <path
        d={`M ${14.8 * g} ${22 * g} L ${16.2 * g} ${22 * g}`}
        stroke="url(#cm-accent)"
        strokeWidth={1.2 * g}
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Orange accent dot — top right of M */}
      <circle
        cx={24.5 * g}
        cy={17.2 * g}
        r={1 * g}
        fill="#FF7A00"
        opacity="0.8"
      />
    </svg>
  )
}
