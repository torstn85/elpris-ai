import Link from 'next/link';
import CookiebotRenewButton from './CookiebotRenewButton';
import { CITIES } from '@/lib/cities';

/** Städer i kolumnen "Elpris i din stad", i visningsordning (slug i CITIES). */
const FOOTER_CITY_SLUGS = ['stockholm', 'goteborg', 'malmo', 'uppsala', 'vasteras', 'umea'];
const FOOTER_CITIES = FOOTER_CITY_SLUGS.map((slug) => CITIES[slug]).filter(Boolean);

const GAMES_ENABLED = process.env.NEXT_PUBLIC_GAMES_ENABLED === 'true';

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
        {/* ── Kolumner: anpassar sig efter behållarens bredd (sidfoten ligger även
            i smalare behållare), en kolumn på mobil, fem på bred skärm. ── */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-8">

          {/* Col 1: Om elpris.ai */}
          <div>
            <Link href="/" className="font-extrabold text-base text-white">
              elpris<span className="text-[#00E5FF]">.ai</span>
            </Link>
            <p className="text-xs text-[#8fafc9] mt-2 mb-4">
              Elpriset per kvart – begripligt och lite roligare.
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
              {GAMES_ENABLED && (
                <li>
                  <Link href="/elduellen" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                    Elduellen
                  </Link>
                </li>
              )}
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
                <Link href="/guider/forsta-elpriset" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Förstå elpriset
                </Link>
              </li>
              <li>
                <Link href="/guider/elavtal" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Elavtal
                </Link>
              </li>
              <li>
                <Link href="/guider/spara-el" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Spara el
                </Link>
              </li>
              <li>
                <Link href="/guider/teknik-och-trender" className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  Teknik &amp; trender
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Elpris i din stad */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Elpris i din stad</h3>
            <ul className="space-y-2">
              {FOOTER_CITIES.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/elpris-idag/${city.slug}`}
                    className="text-sm text-[#8fafc9] hover:text-[#00E5FF] transition-colors"
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5: Information */}
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
            Spotpris per kvart från elprisetjustnu.se · Täcker SE1–SE4
          </span>
          <span className="text-center sm:text-right">
            Vägledande information, ej ekonomisk rådgivning.
          </span>
        </div>
      </div>
    </footer>
  );
}
