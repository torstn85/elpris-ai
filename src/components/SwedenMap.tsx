// Server component — no "use client" needed.
// SVG <a> elements handle navigation; no JS required.

type AreaKey = "se1" | "se2" | "se3" | "se4";

const AREAS: {
  key: AreaKey;
  label: string;
  city: string;
  // Simplified path approximating each electricity area's geography
  path: string;
  // Label anchor point (cx, cy)
  cx: number;
  cy: number;
}[] = [
  {
    key: "se1",
    label: "SE1",
    city: "Luleå",
    // Northernmost region — wide triangular top, narrows toward SE1/SE2 border
    path: "M 90,0 L 138,0 L 172,28 L 193,78 L 198,160 L 20,160 L 36,80 L 62,28 Z",
    cx: 109,
    cy: 82,
  },
  {
    key: "se2",
    label: "SE2",
    city: "Sundsvall",
    // Northern-middle band
    path: "M 20,160 L 198,160 L 200,200 L 197,260 L 190,300 L 12,300 L 15,240 L 18,200 Z",
    cx: 106,
    cy: 232,
  },
  {
    key: "se3",
    label: "SE3",
    city: "Stockholm",
    // Southern-middle band — most populated
    path: "M 12,300 L 190,300 L 184,355 L 174,400 L 168,420 L 28,420 L 20,382 L 14,340 Z",
    cx: 101,
    cy: 362,
  },
  {
    key: "se4",
    label: "SE4",
    city: "Malmö",
    // Southernmost tip
    path: "M 28,420 L 168,420 L 158,458 L 140,478 L 114,494 L 88,496 L 68,490 L 50,474 L 38,454 L 32,435 Z",
    cx: 98,
    cy: 458,
  },
];

const SELECTED_FILL = "#00E5FF22";
const SELECTED_STROKE = "#00E5FF";
const DEFAULT_FILL = "#0F3460";
const DEFAULT_STROKE = "#1E4976";
const HOVER_FILL = "#1E4976";

export default function SwedenMap({ selectedArea }: { selectedArea: string }) {
  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 210 510"
        width="200"
        height="510"
        aria-label="Karta över Sveriges elområden"
        className="overflow-visible"
      >
        {AREAS.map(({ key, label, city, path, cx, cy }) => {
          const isSelected = key === selectedArea;
          return (
            <a
              key={key}
              href={`/elpris/${key}`}
              aria-label={`${label} – ${city}`}
            >
              <path
                d={path}
                fill={isSelected ? SELECTED_FILL : DEFAULT_FILL}
                stroke={isSelected ? SELECTED_STROKE : DEFAULT_STROKE}
                strokeWidth={isSelected ? 1.5 : 1}
                className="transition-colors duration-150"
                style={{ cursor: "pointer" }}
                onMouseOver={(e) => {
                  if (!isSelected)
                    (e.currentTarget as SVGPathElement).setAttribute(
                      "fill",
                      HOVER_FILL
                    );
                }}
                onMouseOut={(e) => {
                  if (!isSelected)
                    (e.currentTarget as SVGPathElement).setAttribute(
                      "fill",
                      DEFAULT_FILL
                    );
                }}
              />
              {/* Area label */}
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={isSelected ? "#00E5FF" : "#e2eaf4"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {label}
              </text>
              {/* City label */}
              <text
                x={cx}
                y={cy + 9}
                textAnchor="middle"
                fontSize="8.5"
                fill={isSelected ? "#00E5FF99" : "#8fafc9"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {city}
              </text>
            </a>
          );
        })}
      </svg>
    </div>
  );
}
