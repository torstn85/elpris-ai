import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integritetspolicy – elpris.ai",
  description:
    "Läs om hur elpris.ai hanterar personuppgifter, cookies och tredjepartstjänster.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-xl text-white border-l-2 border-[#00E5FF] pl-4">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-[#a8c4d8] leading-relaxed pl-4">
        {children}
      </div>
    </section>
  );
}

function ServiceCard({
  name,
  provider,
  purpose,
  data,
  link,
}: {
  name: string;
  provider: string;
  purpose: string;
  data: string;
  link: string;
}) {
  return (
    <div className="bg-[#0F3460] border border-[#1E4976] rounded-xl p-4 flex flex-col gap-2 text-sm">
      <p className="font-semibold text-white">{name}</p>
      <p>
        <span className="text-[#8fafc9]">Leverantör: </span>
        {provider}
      </p>
      <p>
        <span className="text-[#8fafc9]">Syfte: </span>
        {purpose}
      </p>
      <p>
        <span className="text-[#8fafc9]">Data som behandlas: </span>
        {data}
      </p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00E5FF] hover:underline mt-1 w-fit"
      >
        Integritetspolicy →
      </a>
    </div>
  );
}

export default function Integritetspolicy() {
  return (
    <main className="min-h-screen bg-[#0A2540] text-white">
      {/* Nav */}
      <nav className="border-b border-[#1E4976] px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="font-extrabold text-xl tracking-tight">
          elpris<span className="text-[#00E5FF]">.ai</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-[#8fafc9] hover:text-white transition-colors"
        >
          ← Tillbaka
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-14 flex flex-col gap-12">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <p className="text-[#00E5FF] text-sm font-medium uppercase tracking-wider">
            Juridisk information
          </p>
          <h1 className="font-extrabold text-4xl md:text-5xl leading-tight">
            Integritetspolicy
          </h1>
          <p className="text-[#8fafc9]">
            Senast uppdaterad: 14 april 2026 · Gäller för elpris.ai
          </p>
        </div>

        {/* Intro */}
        <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 text-[#a8c4d8] leading-relaxed">
          Vi på elpris.ai värnar om din integritet. Denna policy förklarar vilka
          personuppgifter vi samlar in, varför vi gör det, hur länge vi lagrar
          dem och vilka rättigheter du har. Vi följer EU:s
          dataskyddsförordning (GDPR) samt den svenska lagen om elektronisk
          kommunikation (LEK).
        </div>

        {/* 1. Personuppgiftsansvarig */}
        <Section title="1. Personuppgiftsansvarig">
          <p>
            Personuppgiftsansvarig för elpris.ai är den fysiska eller juridiska
            person som driver tjänsten. Kontakta oss vid frågor om
            personuppgiftsbehandling:
          </p>
          <p>
            <span className="text-white font-medium">E-post: </span>
            <a
              href="mailto:info@elpris.ai"
              className="text-[#00E5FF] hover:underline"
            >
              info@elpris.ai
            </a>
          </p>
        </Section>

        {/* 2. Vilka uppgifter samlar vi in */}
        <Section title="2. Vilka uppgifter samlar vi in?">
          <p>Vi samlar in följande kategorier av uppgifter:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              <span className="text-white">Tekniska uppgifter</span> – IP-adress,
              webbläsartyp, operativsystem, skärmupplösning och
              referens-URL. Används för att optimera tjänsten och förhindra
              missbruk.
            </li>
            <li>
              <span className="text-white">Användarbeteende</span> – vilka sidor
              du besöker, hur länge du stannar och vilka funktioner du
              interagerar med. Samlas in via Google Analytics 4.
            </li>
            <li>
              <span className="text-white">Ungefärlig plats</span> – land och
              region baserat på IP-adress, för att automatiskt välja rätt
              elområde (SE1–SE4). Din exakta position lagras aldrig.
            </li>
            <li>
              <span className="text-white">Chattinput</span> – text du skriver i
              AI-chattfunktionen skickas till Anthropic Claude API för att
              generera svar. Vi lagrar inte dessa konversationer.
            </li>
          </ul>
        </Section>

        {/* 3. Rättslig grund */}
        <Section title="3. Rättslig grund för behandling">
          <p>Vi behandlar dina personuppgifter med stöd av:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              <span className="text-white">Berättigat intresse (art. 6.1 f)</span>{" "}
              – analys av trafik och teknisk drift av tjänsten.
            </li>
            <li>
              <span className="text-white">Samtycke (art. 6.1 a)</span> –
              icke-nödvändiga cookies och spårning via Google Analytics.
              Du lämnar samtycke via Cookiebot-bannern och kan när som helst
              återkalla det.
            </li>
          </ul>
        </Section>

        {/* 4. Tredjepartstjänster */}
        <Section title="4. Tredjepartstjänster">
          <p>
            Elpris.ai använder följande tredjepartstjänster som kan behandla
            personuppgifter:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <ServiceCard
              name="Google Analytics 4"
              provider="Google LLC, USA"
              purpose="Webbanalys och besöksstatistik"
              data="IP-adress (anonymiserad), sidvisningar, sessionslängd, enhetsinformation"
              link="https://policies.google.com/privacy"
            />
            <ServiceCard
              name="Cookiebot"
              provider="Usercentrics A/S, Danmark"
              purpose="Hantering av cookie-samtycke (GDPR/LEK)"
              data="Samtyckespreferenser, IP-adress, tidsstämpel"
              link="https://www.cookiebot.com/en/privacy-policy/"
            />
            <ServiceCard
              name="Anthropic Claude API"
              provider="Anthropic PBC, USA"
              purpose="AI-driven svar i chattfunktionen"
              data="Text du skriver i chattfältet (ingen koppling till identitet)"
              link="https://www.anthropic.com/privacy"
            />
            <ServiceCard
              name="Supabase"
              provider="Supabase Inc., USA"
              purpose="Databas och backend-infrastruktur"
              data="Tekniska loggar, eventuella användarinställningar"
              link="https://supabase.com/privacy"
            />
          </div>
          <p className="mt-2">
            <span className="text-white">Elpriser</span> hämtas från{" "}
            <a
              href="https://www.elprisetjustnu.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              elprisetjustnu.se
            </a>{" "}
            via deras öppna API. Inga personuppgifter skickas till denna källa.
          </p>
        </Section>

        {/* 5. Cookies */}
        <Section title="5. Cookies">
          <p>
            Vi använder cookies för att tjänsten ska fungera och för att förstå
            hur den används. Du kan hantera dina val via vår cookie-banner
            (Cookiebot) som visas vid ditt första besök.
          </p>
          <div className="bg-[#0F3460] border border-[#1E4976] rounded-xl overflow-hidden mt-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E4976]">
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Cookie</th>
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Typ</th>
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Syfte</th>
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Livslängd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E4976]">
                <tr>
                  <td className="px-4 py-3 text-white">CookieConsent</td>
                  <td className="px-4 py-3">Nödvändig</td>
                  <td className="px-4 py-3">Lagrar ditt samtyckesbeslut</td>
                  <td className="px-4 py-3">1 år</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-white">_ga, _ga_*</td>
                  <td className="px-4 py-3">Statistik</td>
                  <td className="px-4 py-3">Google Analytics – identifierar unika besökare</td>
                  <td className="px-4 py-3">2 år / 13 mån</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 6. Lagringstid */}
        <Section title="6. Lagringstid">
          <p>
            Vi lagrar personuppgifter endast så länge det är nödvändigt för det
            angivna syftet:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Analysdata i Google Analytics: 14 månader (standardinställning).</li>
            <li>Samtyckesinformation via Cookiebot: 1 år.</li>
            <li>Chattinput till Claude API: behandlas i realtid och lagras inte av elpris.ai.</li>
            <li>Tekniska loggar i Supabase: upp till 90 dagar.</li>
          </ul>
        </Section>

        {/* 7. Internationella överföringar */}
        <Section title="7. Internationella överföringar">
          <p>
            Vissa av våra leverantörer (Google, Anthropic, Supabase) har
            verksamhet i USA. Överföringar sker med stöd av EU-kommissionens
            standardavtalsklausuler (SCC) och/eller att leverantören är
            certifierad under EU–US Data Privacy Framework.
          </p>
        </Section>

        {/* 8. Dina rättigheter */}
        <Section title="8. Dina rättigheter">
          <p>Enligt GDPR har du rätt att:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li><span className="text-white">Få tillgång</span> till de personuppgifter vi har om dig.</li>
            <li><span className="text-white">Begära rättelse</span> av felaktiga uppgifter.</li>
            <li><span className="text-white">Begära radering</span> (&ldquo;rätten att bli glömd&rdquo;).</li>
            <li><span className="text-white">Invända mot behandling</span> baserad på berättigat intresse.</li>
            <li><span className="text-white">Återkalla samtycke</span> när som helst via cookie-inställningarna.</li>
            <li><span className="text-white">Lämna klagomål</span> till Integritetsskyddsmyndigheten (IMY) på{" "}
              <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-[#00E5FF] hover:underline">imy.se</a>.
            </li>
          </ul>
          <p>
            Kontakta oss på{" "}
            <a href="mailto:info@elpris.ai" className="text-[#00E5FF] hover:underline">
              info@elpris.ai
            </a>{" "}
            för att utöva dina rättigheter.
          </p>
        </Section>

        {/* 9. Ändringar */}
        <Section title="9. Ändringar av denna policy">
          <p>
            Vi kan komma att uppdatera denna integritetspolicy. Vid väsentliga
            ändringar informerar vi via ett synligt meddelande på startsidan.
            Aktuell version finns alltid tillgänglig på{" "}
            <Link href="/integritetspolicy" className="text-[#00E5FF] hover:underline">
              elpris.ai/integritetspolicy
            </Link>
            .
          </p>
        </Section>

        {/* Footer */}
        <div className="border-t border-[#1E4976] pt-8 flex items-center justify-between text-sm text-[#8fafc9]">
          <span>
            elpris<span className="text-[#00E5FF]">.ai</span>
          </span>
          <a href="mailto:info@elpris.ai" className="hover:text-white transition-colors">
            info@elpris.ai
          </a>
        </div>
      </div>
    </main>
  );
}
