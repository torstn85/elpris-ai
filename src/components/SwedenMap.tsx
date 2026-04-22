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
  { key: "se1", name: "SE1", city: "Luleå",     labelX: 232, labelY: 100 },
  { key: "se2", name: "SE2", city: "Sundsvall",  labelX: 226, labelY: 248 },
  { key: "se3", name: "SE3", city: "Stockholm",  labelX: 226, labelY: 328 },
  { key: "se4", name: "SE4", city: "Malmö",      labelX: 234, labelY: 388 },
];

const PATHS: Record<AreaKey, string[]> = {
  se1: [
    "M 150,0 L 280,0 L 320,50 L 340,100 L 330,150 L 310,180 L 280,190 L 250,200 L 220,195 L 190,185 L 160,170 L 140,150 L 130,120 L 125,90 L 130,50 Z",
  ],
  se2: [
    "M 140,150 L 160,170 L 190,185 L 220,195 L 250,200 L 280,190 L 310,180 L 320,220 L 315,260 L 300,290 L 270,310 L 240,320 L 210,315 L 180,300 L 160,275 L 145,250 L 135,220 L 135,190 Z",
  ],
  se3: [
    // Mainland
    "M 135,220 L 145,250 L 160,275 L 180,300 L 210,315 L 240,320 L 270,310 L 300,290 L 315,260 L 320,290 L 315,330 L 295,360 L 265,380 L 235,390 L 205,385 L 180,370 L 160,345 L 148,315 L 140,285 Z",
    // Gotland
    "M 340,300 L 360,295 L 375,305 L 378,325 L 368,340 L 350,342 L 337,330 L 335,315 Z",
  ],
  se4: [
    "M 148,315 L 160,345 L 180,370 L 205,385 L 235,390 L 265,380 L 295,360 L 315,330 L 320,360 L 310,395 L 285,420 L 255,435 L 225,435 L 198,420 L 175,395 L 160,370 L 152,345 Z",
  ],
};

function areaStyle(isSelected: boolean, isHovered: boolean) {
  if (isSelected) {
    return {
      fill: "#00E5FF",
      fillOpacity: 0.3,
      stroke: "#00E5FF",
      strokeWidth: 2,
    };
  }
  if (isHovered) {
    return {
      fill: "#1a4a7a",
      fillOpacity: 1,
      stroke: "#2a5a8a",
      strokeWidth: 1.5,
    };
  }
  return {
    fill: "#0F3460",
    fillOpacity: 1,
    stroke: "#1E4976",
    strokeWidth: 1.5,
  };
}

export default function SwedenMap({ selectedArea }: { selectedArea: string }) {
  const [hovered, setHovered] = useState<AreaKey | null>(null);

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 500 800"
        width="220"
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
                  />
                ))}

                {/* Area name */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="700"
                  fill={isSelected ? "#00E5FF" : isHovered ? "#ffffff" : "#e2eaf4"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {name}
                </text>

                {/* City name */}
                <text
                  x={labelX}
                  y={labelY + 17}
                  textAnchor="middle"
                  fontSize="10"
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
