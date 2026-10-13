// GENERERAD FIL — ändra inte för hand. Källa: src/assets/icon-small.svg
// Kör: node scripts/gen-icons.mjs

/**
 * Logotypmärket (icon-small, samma som faviconen) bredvid ordmärket.
 * Dekorativt: ordmärket bär namnet, så märket är aria-hidden — annars läser
 * skärmläsaren upp namnet två gånger.
 */
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false" className={className}>
      <rect width="512" height="512" rx="96" fill="#0A2540" />
      <g transform="translate(290 222) scale(1.12) rotate(-45) translate(-160 -100)">
      <path d="M20 15 H215 L300 100 L215 185 H20 Z" fill="#00E5FF" stroke="#00E5FF" strokeWidth="40" strokeLinejoin="round" />
      <circle cx="238" cy="100" r="32" fill="#0A2540" />
      </g>
      <g transform="translate(244 274) scale(0.95) translate(-249 -264)">
      <path d="M262 168 L188 284 H244 L222 360 L310 232 H254 L282 168 Z" fill="#0A2540" stroke="#0A2540" strokeWidth="10" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
