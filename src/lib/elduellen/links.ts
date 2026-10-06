// Länk vidare in på sajten i facit, vald efter duelltyp. Ankartexten varieras
// (seedat) så att samma formulering inte upprepas i varje duell.

import { pick, type Rng } from "./rng";
import type { DuelType, Option } from "./types";

export interface FacitLink {
  href: string;
  text: string;
}

export function linkForDuel(
  rng: Rng,
  type: DuelType,
  a: Option,
  b: Option,
  isBonus: boolean,
): FacitLink {
  if (isBonus) {
    return {
      href: "/elpris-imorgon",
      text: pick(rng, [
        "Se morgondagens elpriser",
        "Planera morgondagen med elpriset timme för timme",
      ]),
    };
  }

  const pricier = a.costKr >= b.costKr ? a : b;

  switch (type) {
    case "samma-aktivitet-olika-tid":
      return {
        href: `/elpris-idag/${a.citySlug}`,
        text: pick(rng, [
          `Se hela dygnets priser i ${a.cityName}`,
          `När är elen billigast i ${a.cityName} idag?`,
          `Dagens elpris i ${a.cityName}, kvart för kvart`,
        ]),
      };
    case "samma-aktivitet-olika-stad":
      if (a.area !== b.area) {
        const [lo, hi] = [a.area, b.area].sort();
        return {
          href: `/elomrade/${pricier.area.toLowerCase()}`,
          text: pick(rng, [
            `Därför skiljer sig priset mellan ${lo} och ${hi}`,
            `Så fungerar elområde ${pricier.area}`,
          ]),
        };
      }
      return {
        href: `/elpris-idag/${pricier.citySlug}`,
        text: `Därför kostar samma el olika i ${a.cityName} och ${b.cityName}`,
      };
    case "olika-aktivitet":
      return {
        href: "/elpris-idag",
        text: pick(rng, [
          "När är elen billigast idag?",
          "Se dagens elpris i hela Sverige",
        ]),
      };
    case "allt-olika":
    default:
      return {
        href: `/elpris-idag/${pricier.citySlug}`,
        text: pick(rng, [
          `Se dagens elpris i ${pricier.cityName}`,
          `Hela dygnets priser i ${pricier.cityName}`,
        ]),
      };
  }
}
