/**
 * Logos for the three sample companies on the landing page. Drawn here as
 * SVG so they stay sharp at any size. These companies are fictional.
 */

export function PadiGuardLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 4 54 12v18c0 15-9.5 25.5-22 30C19.5 55.5 10 45 10 30V12L32 4Z" fill="#0e7a4b" />
      <path d="M32 4 54 12v18c0 15-9.5 25.5-22 30V4Z" fill="#0b6a41" />
      <path d="M32 47V21" stroke="#ffd84d" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <ellipse cx="25.5" cy={25 + i * 7} rx="5.2" ry="2.6" transform={`rotate(-35 25.5 ${25 + i * 7})`} fill="#ffd84d" />
          <ellipse cx="38.5" cy={25 + i * 7} rx="5.2" ry="2.6" transform={`rotate(35 38.5 ${25 + i * 7})`} fill="#ffc300" />
        </g>
      ))}
      <ellipse cx="32" cy="17.5" rx="2.6" ry="4.6" fill="#ffd84d" />
    </svg>
  );
}

export function KipayLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#4f46e5" />
      <circle cx="40" cy="32" r="15" fill="#a5b4fc" opacity="0.55" />
      <path d="M20 16v32" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M43 16 27 32l16 16" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="32" r="4" fill="#facc15" />
    </svg>
  );
}

export function MedoraLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="28" fill="#e11d48" />
      <path d="M32 47S15 37 15 25.5C15 19.7 19.4 16 24.3 16c3.4 0 6 1.9 7.7 4.6 1.7-2.7 4.3-4.6 7.7-4.6C44.6 16 49 19.7 49 25.5 49 37 32 47 32 47Z" fill="#fff" />
      <path d="M18.5 30h7l3-6 4.5 12 3-6h9.5" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
