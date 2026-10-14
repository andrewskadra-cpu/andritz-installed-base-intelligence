/**
 * IBIS product mark: a gear-tooth ring around a connected node, drawn in the
 * accent palette. Purely decorative; the accessible name comes from the
 * adjacent wordmark text.
 */
export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="ibis-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d3a66" />
          <stop offset="1" stopColor="#0d1a30" />
        </linearGradient>
        <linearGradient id="ibis-mark-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#30cbe8" />
          <stop offset="1" stopColor="#388bff" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="url(#ibis-mark-bg)" stroke="#2f4a73" />
      <circle cx="20" cy="20" r="10.5" fill="none" stroke="url(#ibis-mark-stroke)" strokeWidth="2" strokeDasharray="4.1 2.5" />
      <path d="M20 13.5v13M14.4 23.2 20 20l5.6 3.2" fill="none" stroke="#f3f7fc" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2.6" fill="#30cbe8" />
      <circle cx="20" cy="13.5" r="1.6" fill="#f3f7fc" />
      <circle cx="14.4" cy="23.2" r="1.6" fill="#f3f7fc" />
      <circle cx="25.6" cy="23.2" r="1.6" fill="#f3f7fc" />
    </svg>
  );
}

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="min-w-0 leading-tight">
      <span className="block text-2xs font-bold tracking-[0.28em] text-ink-2">ANDRITZ</span>
      <span className={`block truncate font-semibold tracking-tight text-ink ${compact ? "text-sm" : "text-base"}`}>
        IBIS <span className="font-normal text-ink-3">· Installed-Base Intelligence</span>
      </span>
    </span>
  );
}
