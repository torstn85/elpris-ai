import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import SwedenMap from "@/components/SwedenMap";
import FaqAccordion from "@/components/dynamic/FaqAccordion";
import AreaLinks from "@/components/elomrade/AreaLinks";
import PageWide from "@/components/layout/PageWide";
import { ELOMRADEN, BORDER_NOTE, MAP_NOTE, areaLabel } from "@/content/elomrade";
import { OVERSIKT } from "@/content/elomrade/oversikt";
import { CITIES } from "@/lib/cities";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/elomrade",
  title: OVERSIKT.title,
  description: OVERSIKT.description,
});

const H2 = "font-bold text-2xl md:text-3xl text-white mb-6";
const BOX = "bg-[#0F3460] border border-[#1E4976] rounded-2xl";
const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";

export default function ElomradenPage() {
  const rows = OVERSIKT.table.rows.map((r) => ({ ...r, c: ELOMRADEN[r.key] }));
  const groups = rows.map(({ key, c }) => ({
    key,
    c,
    cities: Object.values(CITIES)
      .filter((city) => city.area === c.area)
      .sort((a, b) => a.name.localeCompare(b.name, "sv")),
  }));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hem", item: "https://www.elpris.ai" },
        { "@type": "ListItem", position: 2, name: "Elområden", item: "https://www.elpris.ai/elomrade" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: OVERSIKT.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  return (
    <>
      {jsonLd.map((ld) => (
        <script
          key={ld["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}

      <main className="min-h-screen bg-[#0A2540] text-white">
        <NavBar />

        <PageWide className="py-12 flex flex-col gap-12">
          {/* Rubrik */}
          <section className="flex flex-col gap-4">
            <nav aria-label="Brödsmulor" className="flex items-center gap-2 text-xs text-[#8fafc9]">
              <Link href="/" className="hover:text-[#00E5FF] transition-colors">Hem</Link>
              <span>/</span>
              <span className="text-white">Elområden</span>
            </nav>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">{OVERSIKT.h1}</h1>
            <p className="text-[#8fafc9] text-base md:text-lg max-w-2xl leading-relaxed">{OVERSIKT.intro}</p>
          </section>

          {/* Karta + områdesknappar + kartrad */}
          <section className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[280px]">
              <SwedenMap />
            </div>
            <p className="text-xs text-[#8fafc9] text-center">{MAP_NOTE}</p>
            <AreaLinks className="w-full sm:w-auto sm:justify-center" />
          </section>

          {/* Jämförelse */}
          <section>
            <h2 className={H2}>Jämförelse av elområdena</h2>
            <div className={`${BOX} overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                    <th scope="col" className="text-left px-4 sm:px-5 py-3 font-medium">Elområde</th>
                    <th scope="col" className="text-left px-4 sm:px-5 py-3 font-medium hidden sm:table-cell">Region</th>
                    <th scope="col" className="text-left px-4 sm:px-5 py-3 font-medium">Exempel på städer</th>
                    <th scope="col" className="text-right px-4 sm:px-5 py-3 font-medium">Dygnssnitt (median)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ key, c, exampleCities, dailyMedian }) => (
                    <tr key={key} className="border-b border-[#1E4976]/50 last:border-0">
                      <th scope="row" className="text-left px-4 sm:px-5 py-3 font-bold">
                        <Link href={`/elomrade/${key}`} className={LINK}>
                          {areaLabel(c)}
                        </Link>
                      </th>
                      <td className="px-4 sm:px-5 py-3 text-[#8fafc9] hidden sm:table-cell">{c.region}</td>
                      <td className="px-4 sm:px-5 py-3 text-[#e2eaf4]">{exampleCities}</td>
                      <td className="px-4 sm:px-5 py-3 text-right text-white tabular-nums whitespace-nowrap">{dailyMedian}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#8fafc9] mt-3">{OVERSIKT.table.footnote}</p>
          </section>

          {/* Vilket elområde bor jag i? */}
          <section>
            <h2 className={H2}>Vilket elområde bor jag i?</h2>
            <p className="text-[#e2eaf4] leading-relaxed mb-6 max-w-3xl">{OVERSIKT.whichArea}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {groups.map(({ key, c, cities }) => (
                <div key={key}>
                  <h3 className="font-bold text-white mb-2">
                    <Link href={`/elomrade/${key}`} className="hover:text-[#00E5FF] transition-colors">
                      {areaLabel(c)}
                    </Link>
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {cities.map((city) => (
                      <li key={city.slug}>
                        <Link href={`/elpris-idag/${city.slug}`} className="text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                          {city.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#8fafc9] mt-6 leading-relaxed max-w-3xl">{BORDER_NOTE}</p>
          </section>

          {/* Textavsnitt */}
          {OVERSIKT.sections.map((s) => (
            <section key={s.heading} className="max-w-3xl">
              <h2 className={H2}>{s.heading}</h2>
              <div className="flex flex-col gap-4 text-[#e2eaf4] leading-relaxed">
                {s.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}

          {/* FAQ */}
          <section className="max-w-3xl">
            <h2 className={H2}>Vanliga frågor om elområden</h2>
            <FaqAccordion items={OVERSIKT.faq} />
          </section>

          <div className="flex justify-center">
            <Link
              href="/elpris-idag"
              className="px-6 py-3 bg-[#00E5FF] text-[#0A2540] font-semibold rounded-xl hover:bg-[#00c4db] transition-colors shadow-lg shadow-[#00E5FF]/20"
            >
              Se dagens priser i alla elområden →
            </Link>
          </div>
        </PageWide>
      </main>
    </>
  );
}
