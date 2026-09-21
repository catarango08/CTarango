/**
 * The marks, drawn inline so they pick up the current theme.
 * Source of truth is public/brand/*.svg from the brand kit — these are the
 * same constructions, parameterised for on-screen use.
 */

export function Wordmark({ className = '', tagline = true }: { className?: string; tagline?: boolean }) {
  return (
    <svg viewBox="0 0 800 260" className={className} role="img" aria-label="Tarango Electric">
      <text
        x="400" y="120" textAnchor="middle" fontFamily="Impact, 'Arial Narrow', sans-serif"
        fontSize="92" letterSpacing="6" fill="currentColor"
      >
        TARANGO
      </text>
      <rect x="220" y="138" width="360" height="4" fill="var(--accent)" />
      <text
        x="400" y="180" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="28" letterSpacing="10" fill="currentColor"
      >
        ELECTRIC
      </text>
      {tagline && (
        <text
          x="400" y="228" textAnchor="middle" fontFamily="Georgia, serif"
          fontSize="16" fontStyle="italic" fill="var(--tagline)"
        >
          Show up. Fix it right.
        </text>
      )}
    </svg>
  );
}

export function Monogram({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label="Tarango Electric">
      <rect width="240" height="240" rx="8" fill="#222426" />
      <text x="120" y="108" textAnchor="middle" fontFamily="Impact, 'Arial Narrow', sans-serif" fontSize="72" fill="#F5F1E8">T</text>
      <text x="120" y="178" textAnchor="middle" fontFamily="Impact, 'Arial Narrow', sans-serif" fontSize="72" fill="#B8871F">E</text>
    </svg>
  );
}

/**
 * The tagline, verbatim. The kit fixes it as italic serif and colours it
 * Oxide Red on paper, Harvest Gold on the dark field — so it follows the theme
 * token rather than being restyled per use.
 */
export function Tagline({ className = '' }: { className?: string }) {
  return (
    <span className={`font-serif italic text-[color:var(--tagline)] ${className}`}>
      Show up. Fix it right.
    </span>
  );
}
