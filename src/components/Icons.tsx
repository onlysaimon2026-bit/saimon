import { interpolate } from "remotion";

export type IconName = "chart" | "chip" | "rocket" | "target" | "bulb" | "megaphone" | "phone" | "hand";

// Stroke paths on a 100x100 grid; drawn on with stroke-dashoffset.
const PATHS: Record<IconName, string[]> = {
  chart: ["M10 90 H90", "M10 90 V10", "M18 75 L38 55 L52 66 L82 30", "M68 30 H82 V44"],
  chip: ["M28 28 H72 V72 H28 Z", "M40 40 H60 V60 H40 Z", "M38 28 V16 M50 28 V16 M62 28 V16", "M38 72 V84 M50 72 V84 M62 72 V84", "M28 38 H16 M28 50 H16 M28 62 H16", "M72 38 H84 M72 50 H84 M72 62 H84"],
  rocket: ["M50 10 C66 24 70 46 62 70 H38 C30 46 34 24 50 10 Z", "M50 36 A6 6 0 1 0 50.1 36", "M38 58 L24 72 L38 70", "M62 58 L76 72 L62 70", "M44 78 L50 92 L56 78"],
  target: ["M50 12 A38 38 0 1 0 50.1 12", "M50 28 A22 22 0 1 0 50.1 28", "M50 44 A6 6 0 1 0 50.1 44", "M50 50 L86 14", "M76 14 H86 V24"],
  bulb: ["M50 12 C30 12 22 30 30 46 C34 54 40 58 40 68 H60 C60 58 66 54 70 46 C78 30 70 12 50 12 Z", "M42 76 H58", "M44 84 H56", "M50 2 V6 M18 20 L22 23 M82 20 L78 23"],
  megaphone: ["M18 42 V60 H30 L66 80 V22 L30 42 Z", "M30 60 L36 82 H46 L42 62", "M76 38 C82 44 82 58 76 64", "M84 30 C94 42 94 60 84 72"],
  phone: ["M32 8 H68 A6 6 0 0 1 74 14 V86 A6 6 0 0 1 68 92 H32 A6 6 0 0 1 26 86 V14 A6 6 0 0 1 32 8 Z", "M44 16 H56", "M46 84 H54", "M40 40 L56 50 L40 60 Z"],
  hand: ["M30 56 V30 A5 5 0 0 1 40 30 V50", "M40 46 V22 A5 5 0 0 1 50 22 V48", "M50 46 V26 A5 5 0 0 1 60 26 V50", "M60 50 V36 A5 5 0 0 1 70 36 V62 C70 80 58 90 46 90 C34 90 26 80 22 70 L16 56 A5 5 0 0 1 26 52 L30 60"],
};

export const AnimatedIcon: React.FC<{ name: IconName; progress: number; size: number; color: string; glow: string }> = ({
  name,
  progress,
  size,
  color,
  glow,
}) => {
  const paths = PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", filter: `drop-shadow(0 0 ${size * 0.08}px ${glow})` }}>
      {paths.map((d, i) => {
        // Stagger each stroke so the icon draws itself piece by piece.
        const p = interpolate(progress, [i / (paths.length + 1), (i + 2) / (paths.length + 1)], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - p}
          />
        );
      })}
    </svg>
  );
};
