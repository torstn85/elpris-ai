// Delade talformatterare: decimalkomma och riktigt minustecken (U+2212 "−") för
// negativa värden, som Intl.NumberFormat("sv-SE") ger. -0,04 avrundas till
// 0,0 och visas utan tecken.

const MINUS = "−";

/** "−" före ett negativt (avrundat) värde, annars inget. */
const sign = (rounded: number) => (rounded < 0 ? MINUS : "");

/** Öre med en decimal och decimalkomma, t.ex. "12,3" och "−1,1". */
export function ore1(v: number): string {
  const r = Math.round(v * 10) / 10 || 0;
  return sign(r) + Math.abs(r).toFixed(1).replace(".", ",");
}

/** Kronor med två decimaler och decimalkomma, t.ex. "0,74" och "−0,12". */
export function kr2(v: number): string {
  const r = Math.round(v * 100) / 100 || 0;
  return sign(r) + Math.abs(r).toFixed(2).replace(".", ",");
}

/** Tal med decimalkomma utan avrundning till fast antal decimaler, t.ex. 2.5 → "2,5". */
export function decimal(v: number): string {
  return sign(v) + String(Math.abs(v)).replace(".", ",");
}

/** Hela kronor med svensk tusentalsavgränsning, t.ex. "1 234" och "−1 234". */
export function krInt(v: number): string {
  const r = Math.round(v) || 0;
  return sign(r) + Math.abs(r).toLocaleString("sv-SE");
}

/** Heltal utan tusentalsavgränsning, t.ex. diagramaxlar: "50", "0", "−50". */
export function integer(v: number): string {
  const r = Math.round(v) || 0;
  return sign(r) + String(Math.abs(r));
}
