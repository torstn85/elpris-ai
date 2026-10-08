import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Om oss",
  description:
    "elpris.ai gör elpriset begripligt – och lite roligare. Oberoende redaktion, faktagranskade guider, elpris per kvart och det dagliga spelet Elduellen.",
  alternates: {
    canonical: "https://www.elpris.ai/om-oss",
  },
};

const LINK = "font-semibold text-[#00E5FF] hover:underline";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: "https://www.elpris.ai/om-oss",
  name: "Om elpris.ai",
  inLanguage: "sv-SE",
  dateModified: "2026-10-08",
  mainEntity: {
    "@type": "Organization",
    name: "elpris.ai",
    url: "https://www.elpris.ai",
    email: "info@elpris.ai",
  },
};

export default function OmOssPage() {
  return (
    <div className="min-h-screen bg-[#0A2540] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <NavBar />

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Om elpris.ai</h1>

        <div className="space-y-5 text-slate-200 leading-relaxed">
          <p>
            <strong className="text-white">elpris.ai</strong> är byggt för att
            göra elpriset begripligt – och lite roligare.
          </p>

          <p>
            Elmarknaden påverkar nästan alla svenska hushåll, men informationen
            är ofta svår att tolka. Spotpris, elområden, kvartspris, nätavgifter
            och skatter blandas ihop – och det är inte alltid självklart vad som
            faktiskt spelar roll för din elräkning.
          </p>

          <p className="text-white font-medium">Vi vill ändra på det.</p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            Vilka står bakom elpris.ai?
          </h2>
          <p>
            elpris.ai drivs av en liten oberoende redaktion med intresse för
            energi, teknik och konsumentfrågor. Vi är inte ett elbolag, en
            jämförelsetjänst eller en del av en mediekoncern – vi är ett
            fristående initiativ som startade när vi själva insåg hur svårt det
            var att förstå sin elräkning trots att informationen finns
            tillgänglig.
          </p>
          <p>
            Vårt arbete bygger på tre principer: data ska vara aktuell,
            förklaringar ska vara begripliga och råden ska vara opartiska. När
            du läser något på elpris.ai ska du kunna lita på att det är skrivet
            utan baktankar om att sälja dig något.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            Roligt i formen, stenhårt i fakta
          </h2>
          <p>
            Elpriset behöver inte vara tråkigt. Vi vill vara Sveriges roligaste
            elprissajt – utan att kompromissa med en enda siffra. Därför blandar
            vi live-data och faktagranskade guider med saker som gör det
            lättare, och roligare, att förstå hur elpriset fungerar.
          </p>
          <p>På elpris.ai hittar du:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <Link href="/" className={LINK}>
                Dagens elpris per kvart
              </Link>{" "}
              – sedan oktober 2025 sätts spotpriset per kvart, och vårt diagram
              visar varje kvart för ditt elområde, med färger som visar om elen
              är billig eller dyr och en markering för just nu.
            </li>
            <li>
              <Link href="/elpris-idag" className={LINK}>
                Elpris idag
              </Link>{" "}
              <strong className="text-white">och</strong>{" "}
              <Link href="/elpris-imorgon" className={LINK}>
                imorgon
              </Link>{" "}
              – dagens priser för Sveriges fyra elområden, och morgondagens så
              snart de publiceras runt kl. 13.15.
            </li>
            <li>
              <Link href="/elomrade" className={LINK}>
                Lokala sidor
              </Link>{" "}
              för ett tjugotal städer, med elområde, nätbolag och det som gäller
              just där.
            </li>
            <li>
              <Link href="/guider" className={LINK}>
                Guider
              </Link>{" "}
              som förklarar allt från spotpris och elavtal till hur du kan flytta
              förbrukning till billigare tider.
            </li>
            <li>
              <Link href="/elduellen" className={LINK}>
                Elduellen
              </Link>{" "}
              – vårt dagliga elprisspel (se nedan).
            </li>
            <li>
              <Link href="/#chat" className={LINK}>
                AI-chatten
              </Link>{" "}
              – ställ frågor om elpriset och få svar baserade på dagens priser
              och våra guider.
            </li>
          </ul>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            <Link href="/elduellen" className="hover:text-[#00E5FF] transition-colors">
              Elduellen – dagens elprisspel
            </Link>
          </h2>
          <p>
            Vad kostar mest: en bastu i Kiruna klockan 21 eller en lasagne i
            Malmö klockan 18? I Elduellen får du fem sådana dueller varje dag,
            samma för alla och räknade på dagens riktiga spotpriser. Du ser
            direkt om du hade rätt, hur vi räknat och hur andra spelare svarade
            – och du kan dela ditt resultat utan att avslöja svaren.
          </p>
          <p>
            Spelet är byggt för att vara kul i ett par minuter, men också för
            att visa något viktigt: att samma sak kan kosta olika mycket
            beroende på när och var du gör den.
          </p>
          <p>
            Kostnaderna i Elduellen räknas som energiåtgång × (spotpris +
            energiskatt) inklusive moms, exklusive nätavgift och elhandlarens
            påslag. Hur mycket el varje aktivitet drar redovisar vi i spelet.
          </p>
          <p>
            <Link href="/elduellen" className={LINK}>
              Spela dagens Elduellen →
            </Link>
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            Oberoende och transparent
          </h2>
          <p>
            elpris.ai säljer inga elavtal och ägs inte av något elbolag. Sajten
            drivs oberoende. På sikt kan den finansieras med annonser, och vissa
            sidor kan innehålla affiliate-länkar till relevanta tjänster eller
            produkter – sådana länkar kommer alltid att märkas tydligt.
          </p>
          <p>
            Vårt mål är att vara en neutral plats där du kan förstå elpriset
            innan du fattar egna beslut.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            Redaktionella principer
          </h2>
          <p>
            För att hålla en hög och jämn kvalitet följer redaktionen några
            principer i allt vi publicerar – även i spelet och chatten:
          </p>
          <p>
            <strong className="text-white">Faktakontroll.</strong> Alla siffror
            om skatter, avgifter, regler eller marknadsförhållanden kontrolleras
            mot myndighetskällor (Skatteverket, Energimarknadsinspektionen,
            Svenska kraftnät) eller etablerade branschkällor innan publicering.
          </p>
          <p>
            <strong className="text-white">Tydliga källor.</strong> När vi
            hänvisar till specifika fakta länkar vi till primärkällan. När vi
            gör beräkningar redovisar vi förutsättningarna så att du själv kan
            kontrollera dem.
          </p>
          <p>
            <strong className="text-white">Inga produktrekommendationer.</strong>{" "}
            Vi rekommenderar inte specifika varumärken eller modeller. Elbolag
            och nätbolag kan nämnas som exempel eller källa, men aldrig som
            rekommendation. Marknaden förändras snabbt och rekommendationer
            åldras fort – därför fokuserar vi på principer och funktioner
            snarare än produktnamn.
          </p>
          <p>
            <strong className="text-white">Uppdateringar.</strong> Artiklar
            uppdateras när reglerna ändras, marknaden utvecklas eller vi får ny
            information. Vi markerar tydligt när en artikel senast uppdaterats.
          </p>
          <p>
            <strong className="text-white">Opartiskhet.</strong> Vi tar inte
            betalt för att skriva positivt om någon aktör.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            Datakällor
          </h2>
          <p>
            Prisdata hämtas från{" "}
            <a
              href="https://www.elprisetjustnu.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              elprisetjustnu.se
            </a>
            , som i sin tur bygger på data från ENTSO-E Transparency Platform.
            Vi hämtar nya data var 15:e minut.
          </p>
          <p>
            Priserna som visas på elpris.ai är spotpriser exklusive moms.
            Spotpriset sätts en gång per dygn på elbörsen Nord Pool, med ett pris
            för varje kvart, och utgör grunden för din elkostnad. I tabeller som
            visar timmar är priset ett snitt av timmens fyra kvartar.
          </p>
          <p>
            Din faktiska elkostnad påverkas även av moms, elnätsavgifter,
            energiskatt och eventuella påslag från ditt elavtal. Informationen
            på elpris.ai ska därför ses som en vägledning för hur elpriset
            utvecklas – inte som din exakta totala kostnad.
          </p>
          <p>
            Vi visar spotpriset eftersom det är den del av elpriset som varierar
            under dygnet. Har du ett kvarts- eller timprisavtal kan du påverka
            vad du betalar genom när du använder el.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            AI som hjälpmedel
          </h2>
          <p>
            elpris.ai använder AI för att göra eldata enklare att förstå.
            Chatten kan hjälpa dig tolka dagens priser, jämföra tider på dygnet,
            förklara begrepp utifrån våra guider och räkna ut vad en aktivitet
            kostar med dagens elpris.
          </p>
          <p>
            Själva uträkningarna görs av vår server, inte av AI:n – så siffrorna
            bygger alltid på samma data och samma räknesätt som resten av
            sajten.
          </p>
          <p>
            AI:n ska aldrig ersätta eget omdöme, men den kan hjälpa dig ställa
            bättre frågor och snabbare förstå vad dagens elpris betyder för dig.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            Kontakta oss
          </h2>
          <p>Vi tar gärna emot synpunkter, frågor och idéer.</p>
          <p>
            Har du upptäckt ett fel i en artikel, i prisdatan eller i en duell?
            Saknar du en funktion? Vill du tipsa om något vi borde skriva om? Hör
            av dig.
          </p>
          <p>
            <a
              href="mailto:info@elpris.ai"
              className="text-[#00E5FF] hover:underline font-medium"
            >
              <strong className="text-white">info@elpris.ai</strong>
            </a>
          </p>
          <p>
            Vi läser alla mejl och svarar så snart vi kan, vanligtvis inom
            några arbetsdagar.
          </p>
        </div>

        <p className="text-xs text-[#8fafc9]/60 mt-12 italic">
          Senast uppdaterad: 8 oktober 2026
        </p>
      </main>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Footer />
      </div>
    </div>
  );
}
