// Innehåll per elområde, nyckel = URL-segmentet (se1–se4).

import se1 from "./se1";
import se2 from "./se2";
import se3 from "./se3";
import se4 from "./se4";
import type { ElomradeContent } from "./types";

export const ELOMRADEN: Record<"se1" | "se2" | "se3" | "se4", ElomradeContent> = { se1, se2, se3, se4 };

export const ELOMRADE_KEYS = Object.keys(ELOMRADEN) as (keyof typeof ELOMRADEN)[];

export * from "./types";
