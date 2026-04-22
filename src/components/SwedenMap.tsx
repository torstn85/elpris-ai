"use client";

declare module 'react-simple-maps';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// ─── Types ────────────────────────────────────────────────────────────────────

type AreaKey = "se1" | "se2" | "se3" | "se4";

// ─── County → electricity area mapping ───────────────────────────────────────
// Keys are the iso_3166_2 codes from Natural Earth data

const COUNTY_TO_AREA: Record<string, AreaKey> = {
  // SE1 – Norra Sverige
  "SE-BD": "se1", // Norrbotten
  "SE-AC": "se1", // Västerbotten

  // SE2 – Norra mellansverige
  "SE-Z":  "se2", // Jämtland
  "SE-Y":  "se2", // Västernorrland
  "SE-W":  "se2", // Dalarna
  "SE-X":  "se2", // Gävleborg

  // SE3 – Södra mellansverige
  "SE-S":  "se3", // Värmland
  "SE-T":  "se3", // Örebro
  "SE-U":  "se3", // Västmanland
  "SE-C":  "se3", // Uppsala
  "SE-AB": "se3", // Stockholm
  "SE-D":  "se3", // Södermanland
  "SE-E":  "se3", // Östergötland
  "SE-O":  "se3", // Västra Götaland
  "SE-F":  "se3", // Jönköping
  "SE-I":  "se3", // Gotland

  // SE4 – Södra Sverige
  "SE-G":  "se4", // Kronoberg
  "SE-H":  "se4", // Kalmar
  "SE-K":  "se4", // Blekinge
  "SE-M":  "se4", // Skåne
  "SE-N":  "se4", // Halland
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const AREA_COLOR: Record<AreaKey, string> = {
  se1: "#1a3f5c",
  se2: "#15496e",
  se3: "#0f5280",
  se4: "#0a5c92",
};

function geoStyle(
  area: AreaKey | undefined,
  isSelected: boolean,
  isHovered: boolean
) {
  if (!area) {
    return { fill: "#0F3460", stroke: "#1E4976", strokeWidth: 0.5, outline: "none" };
  }
  if (isSelected && isHovered) {
    return { fill: "#00E5FF", fillOpacity: 0.45, stroke: "#00E5FF", strokeWidth: 1, outline: "none" };
  }
  if (isSelected) {
    return { fill: "#00E5FF", fillOpacity: 0.25, stroke: "#00E5FF", strokeWidth: 1, outline: "none" };
  }
  if (isHovered) {
    return { fill: "#1E4976", stroke: "#00E5FF", strokeWidth: 0.75, outline: "none" };
  }
  return { fill: AREA_COLOR[area], stroke: "#1E4976", strokeWidth: 0.5, outline: "none" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SwedenMap({ selectedArea }: { selectedArea: string }) {
  const router = useRouter();
  const [hoveredArea, setHoveredArea] = useState<AreaKey | null>(null);

  return (
    <div className="flex justify-center">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [18, 63], scale: 900 }}
        width={220}
        height={420}
        style={{ width: "220px", height: "auto" }}
      >
        <Geographies geography="/sweden-counties.geo.json">
          {({ geographies }) =>
            geographies.map((geo) => {
              const iso: string = geo.properties?.iso ?? "";
              const area = COUNTY_TO_AREA[iso] as AreaKey | undefined;
              const isSelected = area === selectedArea;
              const isHovered = area !== undefined && area === hoveredArea;
              const style = geoStyle(area, isSelected, isHovered);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  style={{
                    default: { outline: "none", fillOpacity: (style as { fillOpacity?: number }).fillOpacity ?? 1 },
                    hover:   { outline: "none", cursor: area ? "pointer" : "default" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={() => area && setHoveredArea(area)}
                  onMouseLeave={() => setHoveredArea(null)}
                  onClick={() => area && router.push(`/elpris/${area}`)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
