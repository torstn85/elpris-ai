// TILLFÄLLIG utvecklarsida för att testa <TomorrowPriceTeaser /> i tre varianter.
// Tas bort innan production-push.

import TomorrowPriceTeaser from '@/components/dynamic/TomorrowPriceTeaser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TestTomorrowTeaser() {
  return (
    <div className="min-h-screen bg-[#0A2540] text-white p-6">
      <h1 className="text-2xl font-bold mb-4">TomorrowPriceTeaser — testsida</h1>

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">1. Default (SE3)</h2>
      <TomorrowPriceTeaser />

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">2. SE1</h2>
      <TomorrowPriceTeaser area="SE1" />

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">3. SE2</h2>
      <TomorrowPriceTeaser area="SE2" />

      <hr className="border-[#1E4976] my-6" />
      <h2 className="text-lg font-semibold mb-2">4. SE4</h2>
      <TomorrowPriceTeaser area="SE4" />
    </div>
  );
}
