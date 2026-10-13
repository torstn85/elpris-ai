// Öre med en decimal och decimalkomma, som i resten av sajten. -0,04 visas som
// 0,0, inte -0,0.
export function ore1(v: number): string {
  return (Math.round(v * 10) / 10 || 0).toFixed(1).replace(".", ",");
}

/** Kronor med två decimaler och decimalkomma, t.ex. "0,74". */
export function kr2(v: number): string {
  return (Math.round(v * 100) / 100 || 0).toFixed(2).replace(".", ",");
}

/** Tal med decimalkomma utan avrundning till fast antal decimaler, t.ex. 2.5 → "2,5". */
export function decimal(v: number): string {
  return String(v).replace(".", ",");
}

/** Hela kronor med svensk tusentalsavgränsning, t.ex. 1 234. */
export function krInt(v: number): string {
  return Math.round(v).toLocaleString("sv-SE");
}
