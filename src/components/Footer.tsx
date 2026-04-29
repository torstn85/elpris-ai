import Link from 'next/link';
import CookiebotRenewButton from './CookiebotRenewButton';

interface FooterProps {
  id?: string;
  className?: string;
}

export default function Footer({ id, className = '' }: FooterProps) {
  return (
    <footer
      id={id}
      className={`border-t border-[#1E4976] pt-12 pb-8 ${className}`.trim()}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ── Four columns ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

          {/* Col 1: Om elpris.ai */}
          <div>
            <Link href="/" className="font-extrabold text-base text-white">
              elpris<span className="text-[#00E5FF]">.ai</span>
            </Link>
            <p className="text-xs text-[#8fafc9] mt-2 mb-4">
              Realtidspriser och AI-rådgivning för svensk el
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/om-oss" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Om oss
                </Link>
              </li>
              <li>
                <a href="mailto:info@elpris.ai" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Kontakta oss
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Verktyg */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Verktyg</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/elpris-idag" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Elpris idag
                </Link>
              </li>
              <li>
                <Link href="/elpris-imorgon" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Elpris imorgon
                </Link>
              </li>
              <li>
                <Link href="/elomrade" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Elområden SE1–SE4
                </Link>
              </li>
              <li>
                <Link href="/#chat" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Fråga AI
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Guider */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Guider</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/guider" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Alla guider
                </Link>
              </li>
              <li>
                <Link href="/guider/spara-el" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Spara el
                </Link>
              </li>
              <li>
                <Link href="/guider/elavtal" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Elavtal
                </Link>
              </li>
              <li>
                <Link href="/guider/forsta-elpriset" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Förstå elpriset
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Information */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Information</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/integritetspolicy" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Integritetspolicy
                </Link>
              </li>
              <li>
                <CookiebotRenewButton />
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="border-t border-[#1E4976] pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8fafc9]">
          <span>© 2026 elpris.ai</span>
          <span className="hidden sm:block text-center">
            Data från elprisetjustnu.se · Uppdateras var 15:e minut · Täcker SE1–SE4
          </span>
          <span className="text-center sm:text-right">
            Vägledande information, ej ekonomisk rådgivning.
          </span>
        </div>
      </div>
    </footer>
  );
}
