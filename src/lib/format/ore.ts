// Öre med en decimal och decimalkomma, som i resten av sajten. -0,04 visas som
// 0,0, inte -0,0.
export function ore1(v: number): string {
  return (Math.round(v * 10) / 10 || 0).toFixed(1).replace(".", ",");
}
