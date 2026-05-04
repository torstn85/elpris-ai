// Central konfiguration för Elbil-Snake.
// Alla värden här är avsedda att justeras efter playtest — håll dem samlade
// så att tuning av speltempo, poängbalans och nivåtrösklar inte kräver
// att man letar runt i flera filer.

export const GRID = {
  COLS: 30,
  ROWS: 20,
} as const;

export const CELL_SIZE = 20;

export const TICK_MS = {
  LEVEL_1: 150,
  LEVEL_2: 100,
  LEVEL_3: 60,
} as const;

export const LEVEL_THRESHOLDS = {
  MOPED_TO_CAR: 50,
  CAR_TO_PLANE: 150,
  WIN_LENGTH: 600,
} as const;

export const POINTS = {
  CHARGE_STATION: 10,
  PRICE_GREEN: 10,
  PRICE_CYAN: 5,
  PRICE_RED: -5,
} as const;

export const LEVEL_MULTIPLIER = {
  1: 1,
  2: 2,
  3: 3,
} as const;

export const PRICE_SPAWN_INTERVAL = 3;
export const PRICE_LIFETIME_MOVES = 60;
export const INITIAL_SNAKE_LENGTH = 3;
