import CookiebotRenewButton from './CookiebotRenewButton';

interface FooterProps {
  id?: string;
  className?: string;
}

export default function Footer({ id, className = '' }: FooterProps) {
  return (
    <section
      id={id}
      className={`border-t border-[#1E4976] pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8fafc9] ${className}`.trim()}
    >
      <div className="flex flex-col items-center sm:items-start gap-1">
        <a href="/" className="font-extrabold text-sm text-[#8fafc9]">
          elpris<span className="text-[#00E5FF]">.ai</span>
        </a>
        <a href="/integritetspolicy" className="hover:text-[#00E5FF] transition-colors">
          Integritetspolicy
        </a>
        <CookiebotRenewButton />
        <span>© 2026 elpris.ai</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-[#8fafc9]">
        {['Data från elprisetjustnu.se', 'Uppdateras var 15:e minut', 'Täcker SE1–SE4'].map((label) => (
          <span key={label} className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#22C55E] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
