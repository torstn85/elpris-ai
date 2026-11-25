# elpris.ai API v1 — spotpriser

Historiska och aktuella spotpriser per svenskt elområde, från 2021-11-01.

## Anrop

```
GET https://elpris.ai/api/v1/spot-prices?area=SE3&from=2024-01-01&to=2024-01-31&resolution=hour
Authorization: Bearer <nyckel>
```

| Parameter    | Krav        | Värden                                                        |
|--------------|-------------|---------------------------------------------------------------|
| `area`       | obligatorisk | `SE1`, `SE2`, `SE3`, `SE4`                                   |
| `from`       | obligatorisk | Svenskt kalenderdatum `YYYY-MM-DD`, inklusive                |
| `to`         | obligatorisk | Svenskt kalenderdatum `YYYY-MM-DD`, inklusive, `to ≥ from`   |
| `resolution` | valfri       | `hour` (standard) eller `quarter`                            |

`from` och `to` avser svenska kalenderdygn (Europe/Stockholm): `from=2024-01-01&to=2024-01-01`
ger dygnet 2024-01-01 00:00–24:00 svensk tid.

### Gränser

| Gräns                     | Värde                                         |
|---------------------------|-----------------------------------------------|
| Intervall, `hour`         | högst 366 dygn per anrop                      |
| Intervall, `quarter`      | högst 93 dygn per anrop                       |
| Kvartspriser              | från 2025-10-01 (`quarter` före dess ger 400) |
| Anrop                     | 60 per minut och nyckel                       |

## Svar 200

```json
{
  "area": "SE3",
  "resolution": "hour",
  "unit": "öre/kWh exkl. moms",
  "source": "elpris.ai",
  "coverage": {
    "from": "2021-11-01",
    "to": "2026-11-26",
    "quarter_from": "2025-10-01",
    "missing_days": ["2021-11-04"]
  },
  "prices": [
    { "start": "2024-01-01T00:00:00+01:00", "end": "2024-01-01T01:00:00+01:00", "ore_per_kwh": 32.92 },
    { "start": "2024-01-01T01:00:00+01:00", "end": "2024-01-01T02:00:00+01:00", "ore_per_kwh": 31.69 }
  ]
}
```

- **`prices`**: i tidsordning. `start` och `end` är ISO 8601 med svensk offset (`+01:00`
  normaltid, `+02:00` sommartid). `ore_per_kwh` är spotpriset i öre/kWh exkl. moms, ett
  JSON-tal med högst två decimaler. Priset kan vara negativt.
- **`resolution=hour`**: timpriser före 2025-10-01. Från 2025-10-01 är timpriset snittet
  av timmens fyra kvartspriser.
- **`resolution=quarter`**: kvartspriser (15 minuter), från 2025-10-01.
- **Omställningsdygn**: dygnet då sommartid börjar har 23 timmar (92 kvartar) och dygnet då
  normaltid börjar har 25 timmar (100 kvartar). Timmen 02 förekommer då två gånger och
  skiljs åt av offset: `02:00+02:00` och sedan `02:00+01:00`.
- **`coverage`** gäller hela datamängden för området, inte bara det begärda intervallet:
  - `from`: första dygnet med data.
  - `to`: senaste fullständiga dygnet (morgondagen när den är publicerad, ungefär kl. 13:15).
  - `quarter_from`: första dygnet med kvartspriser.
  - `missing_days`: dygn mellan `from` och `to` som saknas helt eller inte är fullständiga.
    Ett intervall som täcker sådana dygn ger färre poster i `prices` (inga utfyllda värden).
- Dygn efter `coverage.to` ger inga poster. Det är inget fel.

## Fel

Alla fel har JSON-kroppen `{ "error": "<meddelande>" }`.

| Status | När                                                                                |
|--------|------------------------------------------------------------------------------------|
| 400    | Ogiltig eller saknad parameter, `to < from`, för långt intervall, `quarter` före 2025-10-01 |
| 401    | `Authorization` saknas, har fel format eller innehåller en okänd nyckel           |
| 429    | Fler än 60 anrop under den senaste minuten. `Retry-After` anger sekunder att vänta |
| 503    | Prisdata kunde inte läsas tillfälligt. Försök igen                                  |

Svar till en godkänd nyckel har också `X-RateLimit-Limit` och `X-RateLimit-Remaining`.

## Cache

- `Cache-Control: private, max-age=86400` när `to` är före dagens svenska datum (passerade
  dygn ändras inte).
- `Cache-Control: private, no-store` när intervallet når i dag eller senare, och på alla fel.

Svaren är aldrig `public`.

## Exempel

```bash
curl -s \
  -H "Authorization: Bearer $ELPRIS_API_KEY" \
  "https://elpris.ai/api/v1/spot-prices?area=SE3&from=2025-10-26&to=2025-10-26&resolution=quarter"
```

## Drift (elpris.ai)

- Nycklar i miljövariabeln `API_KEYS`, formatet `namn:nyckel,namn:nyckel`. Namnet används
  för rate limit och loggning. Nyckeln loggas aldrig.
- Rate limit med Upstash (`UPSTASH_REDIS_REST_URL`/`_TOKEN`, prefix `rl:api-v1`), timeout
  500 ms och inga omförsök. Om Upstash inte svarar inom det släpps anropet igenom och
  felet loggas.
- Kod: `src/app/api/v1/spot-prices/route.ts`, `src/lib/api/v1/`.
- Test: `npm run test:api-v1` (offline med fixturer) och
  `API_KEY=… npm run test:api-v1 -- --live <url> [--with-429]`.
