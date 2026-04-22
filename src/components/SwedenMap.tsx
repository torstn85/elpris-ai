"use client";

import Link from "next/link";
import { useState } from "react";

type AreaKey = "se1" | "se2" | "se3" | "se4";

interface AreaDef {
  key: AreaKey;
  name: string;
  city: string;
  labelX: number;
  labelY: number;
}

const AREA_DEFS: AreaDef[] = [
  { key: "se1", name: "SE1", city: "Luleå",    labelX: 279, labelY: 82  },
  { key: "se2", name: "SE2", city: "Sundsvall", labelX: 290, labelY: 172 },
  { key: "se3", name: "SE3", city: "Stockholm", labelX: 294, labelY: 216 },
  { key: "se4", name: "SE4", city: "Malmö",     labelX: 307, labelY: 258 },
];

const PATHS: Record<AreaKey, string[]> = {
  se1: [
    "M243,3 L258,8 L271,6 L282,12 L290,8 L305,14 L318,11 L328,18 L340,16 L348,24 L358,22 L365,30 L372,28 L378,38 L384,36 L388,46 L392,58 L388,68 L394,76 L390,88 L396,98 L392,108 L396,120 L388,130 L382,128 L376,138 L368,136 L360,146 L350,144 L342,154 L330,152 L320,158 L308,154 L298,160 L286,156 L276,162 L264,156 L252,160 L240,154 L228,158 L216,150 L206,154 L196,144 L188,146 L180,136 L174,138 L168,126 L164,114 L168,102 L162,90 L166,78 L172,68 L168,56 L174,44 L182,36 L190,28 L200,22 L212,18 L224,12 L234,8 Z",
  ],
  se2: [
    "M168,126 L174,138 L180,136 L188,146 L196,144 L206,154 L216,150 L228,158 L240,154 L252,160 L264,156 L276,162 L286,156 L298,160 L308,154 L320,158 L330,152 L342,154 L350,144 L360,146 L368,136 L376,138 L382,128 L388,130 L392,148 L388,162 L382,172 L376,182 L370,192 L362,200 L352,206 L340,210 L326,212 L312,214 L298,212 L284,210 L270,208 L256,204 L244,198 L234,190 L226,180 L220,168 L216,156 L212,144 L208,132 Z",
  ],
  se3: [
    "M208,132 L212,144 L216,156 L220,168 L226,180 L234,190 L244,198 L256,204 L270,208 L284,210 L298,212 L312,214 L326,212 L340,210 L352,206 L362,200 L370,192 L376,200 L378,214 L374,228 L366,240 L354,250 L340,258 L324,262 L308,264 L292,262 L276,258 L262,250 L250,240 L242,228 L236,216 L230,204 L224,192 L218,178 L214,164 L210,150 Z",
    // Gotland
    "M382,196 L390,192 L396,198 L394,208 L386,212 L378,206 Z",
  ],
  se4: [
    "M236,216 L242,228 L250,240 L262,250 L276,258 L292,262 L308,264 L324,262 L340,258 L354,250 L366,240 L374,228 L378,242 L376,256 L368,268 L356,278 L340,284 L322,288 L304,288 L286,284 L270,276 L256,264 L246,252 L238,238 Z",
  ],
};

function areaStyle(isSelected: boolean, isHovered: boolean) {
  if (isSelected) {
    return { fill: "#00E5FF", fillOpacity: 0.25, stroke: "#00E5FF", strokeWidth: 1.5 };
  }
  if (isHovered) {
    return { fill: "#1E4976", fillOpacity: 0.9, stroke: "#00E5FF", strokeWidth: 1 };
  }
  return { fill: "#0F3460", fillOpacity: 1, stroke: "#4a9aba", strokeWidth: 0.75 };
}

export default function SwedenMap({ selectedArea }: { selectedArea: string }) {
  const [hovered, setHovered] = useState<AreaKey | null>(null);

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 500 300"
        width="260"
        aria-label="Karta över Sveriges elområden"
        className="overflow-visible"
      >
        {AREA_DEFS.map(({ key, name, city, labelX, labelY }) => {
          const isSelected = key === selectedArea;
          const isHovered = hovered === key;
          const style = areaStyle(isSelected, isHovered);

          return (
            <Link key={key} href={`/elpris/${key}`}>
              <g
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
                aria-label={`${name} – ${city}`}
              >
                {PATHS[key].map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill={style.fill}
                    fillOpacity={style.fillOpacity}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

                {/* Area code */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={isSelected ? "#00E5FF" : isHovered ? "#ffffff" : "#e2eaf4"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {name}
                </text>

                {/* City name */}
                <text
                  x={labelX}
                  y={labelY + 9}
                  textAnchor="middle"
                  fontSize="7"
                  fill={isSelected ? "#00E5FFaa" : isHovered ? "#ffffffaa" : "#8fafc9"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {city}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}
