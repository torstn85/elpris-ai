// TILLFÄLLIG utvecklarsida för att verifiera <TomorrowPriceTeaser />.
// Tas bort efter verifiering av area-väljare + IP-detektion.

import TomorrowPriceTeaser from '@/components/dynamic/TomorrowPriceTeaser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TestTomorrowTeaser() {
  return (
    <div className="min-h-screen bg-[#0A2540] text-white p-6">
      <h1 className="text-2xl font-bold mb-4">TomorrowPriceTeaser — testsida</h1>
      <p className="text-sm text-slate-400 mb-6">
        Variant 1 ska auto-detect:a område via IP. Variant 2–5 ska respektera
        explicit area-prop. Alla varianter ska ha klickbara SE1–SE4-knappar
        som omedelbart byter data.
      </p>

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">
        1. Default — auto-detect via IP (ingen prop)
      </h2>
      <TomorrowPriceTeaser />

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">2. Explicit SE1</h2>
      <TomorrowPriceTeaser area="SE1" />

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">3. Explicit SE2</h2>
      <TomorrowPriceTeaser area="SE2" />

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">4. Explicit SE3</h2>
      <TomorrowPriceTeaser area="SE3" />

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">5. Explicit SE4</h2>
      <TomorrowPriceTeaser area="SE4" />
    </div>
  );
}
