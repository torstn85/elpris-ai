import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Integritetspolicy",
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
  consentNote,
  purpose,
  data,
  link,
}: {
  name: string;
  provider: string;
  /** "endast efter samtycke till …" — visas bara för tjänster som kräver samtycke. */
  consentNote?: string;
  purpose: string;
  data: string;
  link: string;
}) {
  return (
    <div className="bg-[#0F3460] border border-[#1E4976] rounded-xl p-4 flex flex-col gap-2 text-sm">
      <p className="font-semibold text-white">
        {name} <span className="font-normal text-[#8fafc9]">({provider})</span>
        {consentNote && (
          <span className="font-normal">
            {" – "}
            <em className="text-[#00E5FF]">{consentNote}</em>
          </span>
        )}
      </p>
      <p>
        <span className="text-[#8fafc9]">Syfte: </span>
        {purpose}
      </p>
      <p>
        <span className="text-[#8fafc9]">Uppgifter: </span>
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

const COOKIES: { name: string; category: string; purpose: string; lifetime: string }[] = [
  { name: "CookieConsent", category: "Nödvändig", purpose: "Sparar ditt samtyckesval", lifetime: "1 år" },
  {
    name: "elduellen:player",
    category: "Nödvändig (lokal lagring)",
    purpose: "Slumpat spelar-id som förhindrar att samma resultat räknas flera gånger",
    lifetime: "Tills du rensar webbläsarens lagring",
  },
  {
    name: "elduellen:history",
    category: "Nödvändig (lokal lagring)",
    purpose: "Dina resultat de senaste 120 dagarna, för streak",
    lifetime: "Rensas efter 120 dagar nästa gång du spelar",
  },
  {
    name: "elduellen:day:{datum}",
    category: "Nödvändig (lokal lagring)",
    purpose: "Dagens spelomgång",
    lifetime: "Rensas efter 120 dagar nästa gång du öppnar Elduellen",
  },
  {
    name: "elduellen:shared-visit:{n}",
    category: "Nödvändig (sessionslagring)",
    purpose: "Förhindrar dubbelräkning vid besök via delad länk",
    lifetime: "Tills fliken stängs",
  },
  { name: "_ga", category: "Statistik", purpose: "Google Analytics – skiljer besökare åt", lifetime: "400 dagar" },
  {
    name: "_ga_CY788GRNLW",
    category: "Statistik",
    purpose: "Google Analytics – håller reda på sessionen",
    lifetime: "400 dagar",
  },
  {
    name: "google_auto_fc_cmp_setting",
    category: "Marknadsföring (lokal lagring)",
    purpose: "Googles annonsskript – sparar samtyckesinställning",
    lifetime: "Enligt Google",
  },
];

export default function Integritetspolicy() {
  return (
    <main className="min-h-screen bg-[#0A2540] text-white">
      {/* Nav */}
      <NavBar />

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
            Senast uppdaterad: 8 oktober 2026 · Gäller för elpris.ai
          </p>
        </div>

        {/* Intro */}
        <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 text-[#a8c4d8] leading-relaxed">
          Vi på elpris.ai värnar om din integritet. Den här policyn förklarar
          vilka personuppgifter som behandlas när du använder elpris.ai, varför,
          vilka som tar emot dem, hur länge de sparas och vilka rättigheter du
          har. Vi följer EU:s dataskyddsförordning (GDPR) och lagen om
          elektronisk kommunikation (LEK).
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
            <a href="mailto:info@elpris.ai" className="text-[#00E5FF] hover:underline">
              info@elpris.ai
            </a>
          </p>
        </Section>

        {/* 2. Vilka uppgifter behandlas */}
        <Section title="2. Vilka uppgifter behandlas?">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              <span className="text-white">Tekniska uppgifter</span> – IP-adress,
              webbläsare och den adress du besöker. Behövs för att sajten ska
              kunna levereras till dig och för att skydda tjänsten mot missbruk.
            </li>
            <li>
              <span className="text-white">Ungefärlig plats</span> – vår
              webbhotellsleverantör härleder land, län och ort ur din IP-adress.
              Vi använder det enbart för att förvälja rätt elområde (SE1–SE4)
              och sparar det inte. Du kan alltid välja ett annat elområde själv.
            </li>
            <li>
              <span className="text-white">Besöksstatistik</span> – vilka sidor
              du besöker och hur du använder sajten. Samlas in via Google
              Analytics 4,{" "}
              <strong className="text-white">
                endast om du har samtyckt till statistikcookies
              </strong>
              .
            </li>
            <li>
              <span className="text-white">Chattmeddelanden</span> – text du skriver i AI-chatten skickas till de leverantörer som tar fram svaret, och din fråga omvandlas till en sifferrepresentation som används för att söka i vår databas (se avsnitt 4). Skriv inte personuppgifter i chatten. Vi
              sparar inte konversationerna.
            </li>
            <li>
              <span className="text-white">Elduellen</span> – när du spelar
              sparas dagens val och din streak i din webbläsare. När du har spelat klart skickas dina val till oss tillsammans med ett slumpat spelar-id, och poängen räknas ut på vår server. Id:t är inte kopplat till namn, e-post,
              IP-adress eller annan identitet.
            </li>
          </ul>
        </Section>

        {/* 3. Rättslig grund */}
        <Section title="3. Rättslig grund">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              <span className="text-white">Samtycke (art. 6.1 a)</span> –
              statistikcookies (Google Analytics) och marknadsföringscookies
              (Google AdSense). Du lämnar och ändrar ditt samtycke i
              cookiebannern (Cookiebot) och kan när som helst återkalla det.
            </li>
            <li>
              <span className="text-white">Berättigat intresse (art. 6.1 f)</span>{" "}
              – att leverera och säkra sajten, förvälja elområde, begränsa
              missbruk (till exempel för många anrop från samma IP-adress),
              besvara frågor du ställer i chatten och räkna fram resultat och
              statistik i Elduellen.
            </li>
          </ul>
        </Section>

        {/* 4. Mottagare och tredjepartstjänster */}
        <Section title="4. Mottagare och tredjepartstjänster">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <ServiceCard
              name="Vercel"
              provider="Vercel Inc., USA"
              purpose="Webbhotell och leverans av sajten."
              data="IP-adress, webbläsare och besökt adress vid varje anrop. Ungefärlig plats härleds ur IP-adressen för förval av elområde."
              link="https://vercel.com/legal/privacy-policy"
            />
            <ServiceCard
              name="Cookiebot"
              provider="Usercentrics A/S, Danmark"
              purpose="Hantering av cookiesamtycke."
              data="Ditt samtyckesval, ett samtyckes-id, tidsstämpel, IP-adress och webbläsare."
              link="https://www.cookiebot.com/en/privacy-policy/"
            />
            <ServiceCard
              name="Google Analytics 4"
              provider="Google Ireland Limited, med överföring till Google LLC, USA"
              consentNote="endast efter samtycke till statistik"
              purpose="Besöksstatistik."
              data="Besökta sidor, hänvisande sida, ett slumpat besöks-id (cookien _ga), enhets- och webbläsarinformation samt händelser i Elduellen (start, poäng, delning och besök via delad länk). Google Analytics 4 lagrar inte IP-adresser."
              link="https://policies.google.com/privacy"
            />
            <ServiceCard
              name="Google AdSense"
              provider="Google Ireland Limited, med överföring till Google LLC, USA"
              consentNote="endast efter samtycke till marknadsföring"
              purpose="Annonser. Inga annonser visas på sajten i dag, men Googles annonsskript laddas om du har samtyckt till marknadsföring."
              data="IP-adress, webbläsare och besökt adress."
              link="https://policies.google.com/privacy"
            />
            <ServiceCard
              name="Anthropic"
              provider="Anthropic PBC, USA"
              purpose="Ta fram svar i AI-chatten."
              data="De senaste meddelandena i konversationen. Anropet görs från vår server, så Anthropic får inte din IP-adress."
              link="https://www.anthropic.com/legal/privacy"
            />
            <ServiceCard
              name="Voyage AI"
              provider="USA"
              purpose="Söka fram relevanta delar av våra guider till chattens svar."
              data="Din senaste chattfråga. Anropet görs från vår server."
              link="https://www.voyageai.com/privacy"
            />
            <ServiceCard
              name="Upstash"
              provider="Upstash Inc., USA"
              purpose="Begränsa antalet anrop till chatten och Elduellen för att förhindra missbruk."
              data="IP-adress och antal anrop under en kort tidsperiod."
              link="https://upstash.com/trust/privacy.pdf"
            />
            <ServiceCard
              name="Supabase"
              provider="Supabase Inc., USA – data lagras i EU, Irland"
              purpose="Databas för elpriser och Elduellen."
              data="Elduellen-resultat (datum, val, poäng och slumpat spelar-id) samt en sifferrepresentation av din chattfråga som används för sökning och inte sparas. Ingen IP-adress."
              link="https://supabase.com/privacy"
            />
          </div>
          <p className="mt-2">
            Elpriser hämtas från{" "}
            <a
              href="https://www.elprisetjustnu.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              elprisetjustnu.se
            </a>{" "}
            via deras öppna API. Inga uppgifter om dig skickas dit.
          </p>
        </Section>

        {/* 5. Cookies och lagring i webbläsaren */}
        <Section title="5. Cookies och lagring i webbläsaren">
          <p>
            Du hanterar dina val i cookiebannern, som visas vid ditt första
            besök. Du kan ändra dem när som helst via knappen Hantera cookies
            längst ned på sidan.
          </p>
          {/* Mobil: ett kort per rad. Från sm: tabell. Samma innehåll. */}
          <ul className="sm:hidden flex flex-col gap-3 mt-1">
            {COOKIES.map((c) => (
              <li
                key={c.name}
                className="bg-[#0F3460] border border-[#1E4976] rounded-xl p-4 flex flex-col gap-1 text-sm"
              >
                <p className="font-semibold text-white break-words">{c.name}</p>
                <p>
                  <span className="text-[#8fafc9]">Kategori: </span>
                  {c.category}
                </p>
                <p>
                  <span className="text-[#8fafc9]">Syfte: </span>
                  {c.purpose}
                </p>
                <p>
                  <span className="text-[#8fafc9]">Livslängd: </span>
                  {c.lifetime}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block bg-[#0F3460] border border-[#1E4976] rounded-xl overflow-hidden mt-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E4976]">
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Namn</th>
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Kategori</th>
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Syfte</th>
                  <th className="text-left px-4 py-3 text-[#8fafc9] font-medium">Livslängd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E4976]">
                {COOKIES.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-3 text-white break-words">{c.name}</td>
                    <td className="px-4 py-3">{c.category}</td>
                    <td className="px-4 py-3">{c.purpose}</td>
                    <td className="px-4 py-3">{c.lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Statistik- och marknadsföringscookies sätts först efter att du har
            samtyckt. Säger du nej laddas varken Google Analytics eller Google AdSense. Återkallar du ett tidigare samtycke slutar Google Analytics direkt att samla in uppgifter, och annonsskriptet försvinner när sidan laddas om.
          </p>
        </Section>

        {/* 6. Lagringstid */}
        <Section title="6. Lagringstid">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              <span className="text-white">Google Analytics:</span> 14 månader
              från insamlingen, därefter raderas uppgifterna.
            </li>
            <li>
              <span className="text-white">Samtyckesval i Cookiebot:</span> 1 år.
            </li>
            <li>
              <span className="text-white">Elduellen-resultat:</span> 13 månader,
              därefter raderas de automatiskt.
            </li>
            <li>
              <span className="text-white">{"Spel­data i din webbläsare:"}</span>{" "}
              se tabellen i avsnitt 5. Du kan när som helst rensa den via
              webbläsarens inställningar.
            </li>
            <li>
              <span className="text-white">IP-adress för missbruksskydd (Upstash):</span>{" "}
              cirka 2 dygn.
            </li>
            <li>
              <span className="text-white">Chattmeddelanden:</span> sparas inte av
              elpris.ai. Leverantörerna behandlar dem enligt sina egna villkor.
            </li>
            <li>
              <span className="text-white">Tekniska loggar hos Vercel:</span>{" "}
              sparas kortvarigt enligt Vercels villkor.
            </li>
          </ul>
        </Section>

        {/* 7. Överföring utanför EU/EES */}
        <Section title="7. Överföring till länder utanför EU/EES">
          <p>
            Flera av våra leverantörer (Vercel, Google, Anthropic, Voyage AI,
            Upstash och Supabase) är amerikanska företag. Överföringar sker med
            stöd av EU–US Data Privacy Framework och/eller EU-kommissionens
            standardavtalsklausuler.
          </p>
        </Section>

        {/* 8. Dina rättigheter */}
        <Section title="8. Dina rättigheter">
          <p>Enligt GDPR har du rätt att:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>få tillgång till de personuppgifter vi behandlar om dig</li>
            <li>begära rättelse av felaktiga uppgifter</li>
            <li>begära radering</li>
            <li>invända mot behandling som grundas på berättigat intresse</li>
            <li>återkalla ditt samtycke när som helst via cookieinställningarna</li>
            <li>
              lämna klagomål till Integritetsskyddsmyndigheten (IMY),{" "}
              <a
                href="https://www.imy.se"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00E5FF] hover:underline"
              >
                imy.se
              </a>
            </li>
          </ul>
          <p>
            Elduellen-resultat är bara kopplade till ett slumpat id i din
            webbläsare, så vi kan inte själva avgöra vilka resultat som är dina.
            Vill du att de raderas, kontakta oss så hjälper vi dig att hitta ditt
            spelar-id.
          </p>
          <p>
            Kontakta oss på{" "}
            <a href="mailto:info@elpris.ai" className="text-[#00E5FF] hover:underline">
              info@elpris.ai
            </a>{" "}
            för att utöva dina rättigheter.
          </p>
        </Section>

        {/* 9. Ändringar */}
        <Section title="9. Ändringar av policyn">
          <p>
            Vi uppdaterar policyn när tjänsten ändras. Datumet överst visar när
            den senast ändrades. Aktuell version finns alltid på{" "}
            <Link href="/integritetspolicy" className="text-[#00E5FF] hover:underline">
              elpris.ai/integritetspolicy
            </Link>
            .
          </p>
        </Section>

      </div>
    </main>
  );
}
