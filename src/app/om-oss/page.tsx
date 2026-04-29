import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Om oss | elpris.ai",
  description:
    "elpris.ai är byggt för en enkel sak: att göra elpriser begripliga. Vi drivs oberoende och vill hjälpa svenska konsumenter förstå elmarknaden.",
  alternates: {
    canonical: "https://www.elpris.ai/om-oss",
  },
};

export default function OmOssPage() {
  return (
    <div className="min-h-screen bg-[#0A2540] text-white">
      <NavBar />

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Om elpris.ai</h1>

        <div className="space-y-5 text-slate-200 leading-relaxed">
          <p>
            <strong className="text-white">elpris.ai</strong> är byggt för en
            enkel sak: att göra elpriser begripliga.
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
            förklaringar ska vara begripliga och rekommendationer ska vara
            opartiska. När du läser något på elpris.ai ska du kunna lita på att
            det är skrivet utan baktankar om att sälja dig något.
          </p>

          <p>
            På elpris.ai får du aktuella elpriser för Sveriges fyra elområden,
            tydliga grafer och konkreta råd om när det kan vara smart att använda
            el. Målet är inte att göra dig till energiexpert – utan att ge dig
            rätt information i rätt ögonblick, så att du kan fatta bättre beslut
            i vardagen.
          </p>

          <p>
            Du ska snabbt kunna se om elen är billig eller dyr just nu, när
            dagens bästa timmar infaller och hur du kan planera saker som tvätt,
            diskmaskin, uppvärmning eller elbilsladdning.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            Oberoende och transparent
          </h2>
          <p>
            elpris.ai säljer inga elavtal och ägs inte av något elbolag. Sajten
            drivs oberoende och finansieras genom annonser. I framtiden kan
            vissa sidor innehålla affiliate-länkar till relevanta tjänster eller
            produkter, men sådana länkar kommer alltid att märkas tydligt.
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
            principer i allt vi publicerar:
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
            <strong className="text-white">
              Inga produktrekommendationer utan grund.
            </strong>{" "}
            Vi listar inte specifika varumärken eller modeller om vi inte
            själva har testat dem eller har goda skäl att rekommendera dem.
            Marknaden förändras snabbt och rekommendationer åldras fort –
            därför fokuserar vi på principer och funktioner snarare än
            produktnamn.
          </p>
          <p>
            <strong className="text-white">Uppdateringar.</strong> Artiklar kan
            uppdateras när reglerna ändras, marknaden utvecklas eller vi får ny
            information. Vi markerar tydligt när en artikel senast uppdaterats.
          </p>
          <p>
            <strong className="text-white">Opartiskhet.</strong> Vi tar inte
            betalt för att skriva positivt om någon aktör. Eventuella
            affiliate-länkar kommer alltid att märkas tydligt.
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
          </p>
          <p>
            Priserna som visas på elpris.ai är spotpriser exklusive moms. Det är
            det pris som sätts på elbörsen Nord Pool och utgör grunden för din
            elkostnad.
          </p>
          <p>
            Din faktiska elkostnad påverkas även av moms, elnätsavgifter,
            energiskatt och eventuella påslag från ditt elavtal. Informationen
            på elpris.ai ska därför ses som en vägledning för hur elpriset
            utvecklas – inte som din exakta totala kostnad.
          </p>
          <p>
            Vi visar spotpriset eftersom det är den del av elpriset du själv kan
            påverka genom när du använder el.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-white pt-6">
            AI som hjälpmedel
          </h2>
          <p>
            elpris.ai använder AI för att göra eldata enklare att förstå.
            Chatboten kan hjälpa dig tolka priser, jämföra tider på dygnet och
            ge generella energitips baserat på aktuell information.
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
            Har du upptäckt ett fel i en artikel eller i prisdatan? Saknar du
            en funktion? Vill du tipsa om något vi borde skriva om? Hör av dig.
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
          Senast uppdaterad: 29 april 2026
        </p>
      </main>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Footer />
      </div>
    </div>
  );
}
