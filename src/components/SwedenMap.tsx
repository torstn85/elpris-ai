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
  { key: "se1", name: "SE1", city: "Luleå",    labelX: 490, labelY: 210 },
  { key: "se2", name: "SE2", city: "Sundsvall", labelX: 478, labelY: 500 },
  { key: "se3", name: "SE3", city: "Stockholm", labelX: 478, labelY: 700 },
  { key: "se4", name: "SE4", city: "Malmö",     labelX: 478, labelY: 840 },
];

const PATHS: Record<AreaKey, string[]> = {
  se1: [
    "M 480,10 L 580,20 L 650,60 L 700,120 L 720,200 L 700,280 L 660,340 L 600,380 L 540,400 L 480,410 L 420,400 L 360,370 L 310,330 L 280,270 L 270,200 L 280,130 L 320,70 L 380,30 Z",
  ],
  se2: [
    "M 280,270 L 310,330 L 360,370 L 420,400 L 480,410 L 540,400 L 600,380 L 660,340 L 680,420 L 670,500 L 640,560 L 590,600 L 530,620 L 470,625 L 410,610 L 360,575 L 320,530 L 295,470 L 282,400 L 278,340 Z",
  ],
  se3: [
    // Mainland
    "M 282,400 L 295,470 L 320,530 L 360,575 L 410,610 L 470,625 L 530,620 L 590,600 L 640,560 L 660,620 L 655,690 L 625,750 L 575,790 L 515,810 L 455,808 L 400,785 L 355,745 L 328,695 L 315,640 L 312,570 Z",
    // Gotland
    "M 720,580 L 745,572 L 762,585 L 765,615 L 752,638 L 730,645 L 712,632 L 708,605 Z",
  ],
  se4: [
    "M 315,640 L 328,695 L 355,745 L 400,785 L 455,808 L 515,810 L 575,790 L 625,750 L 645,800 L 635,860 L 600,910 L 545,945 L 480,958 L 415,945 L 362,908 L 330,858 L 318,800 L 312,740 Z",
  ],
};

function areaStyle(isSelected: boolean, isHovered: boolean) {
  if (isSelected) {
    return { fill: "#00E5FF", fillOpacity: 0.25, stroke: "#00E5FF", strokeWidth: 3 };
  }
  if (isHovered) {
    return { fill: "#1E4976", fillOpacity: 0.9, stroke: "#00E5FF", strokeWidth: 2 };
  }
  return { fill: "#0F3460", fillOpacity: 1, stroke: "#4a9aba", strokeWidth: 1.5 };
}

export default function SwedenMap({ selectedArea }: { selectedArea: string }) {
  const [hovered, setHovered] = useState<AreaKey | null>(null);

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 1000 1000"
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
                    strokeLinecap="round"
                  />
                ))}

                {/* Area code */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="28"
                  fontWeight="700"
                  fill={isSelected ? "#00E5FF" : isHovered ? "#ffffff" : "#e2eaf4"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {name}
                </text>

                {/* City name */}
                <text
                  x={labelX}
                  y={labelY + 22}
                  textAnchor="middle"
                  fontSize="18"
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
