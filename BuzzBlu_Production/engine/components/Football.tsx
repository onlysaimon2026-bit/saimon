import { Theme } from "../theme";

// A football drawn as a real sphere rather than a flat badge.
//
// The twelve black pentagons of a match ball sit at the vertices of an icosahedron.
// Each frame those points are rotated in 3D, projected straight down the view axis and
// drawn in depth order, with the ones near the edge of the disc dimmed and foreshortened
// by the projection itself. That is what makes it read as a ball turning rather than a
// pattern sliding across a circle.

const PHI = (1 + Math.sqrt(5)) / 2;

// Icosahedron vertices, normalised to the unit sphere: the pentagon centres.
const CENTRES: [number, number, number][] = [
  [0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI],
  [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0],
  [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1],
].map(([x, y, z]) => {
  const n = Math.hypot(x, y, z);
  return [x / n, y / n, z / n] as [number, number, number];
});

// Angular radius of a pentagon face on a truncated icosahedron, give or take.
const FACE = 0.405;

type V3 = [number, number, number];

const rotate = (p: V3, yaw: number, tilt: number): V3 => {
  // Tilt the axis first so the ball turns like a struck ball, not a globe on a stand.
  const [x, y, z] = p;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  return [x1, y * ct - z1 * st, y * st + z1 * ct];
};

const norm = ([x, y, z]: V3): V3 => {
  const n = Math.hypot(x, y, z) || 1;
  return [x / n, y / n, z / n];
};

// Any two directions perpendicular to v, so a face can be drawn around it.
const basis = (v: V3): [V3, V3] => {
  const up: V3 = Math.abs(v[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const a = norm([
    up[1] * v[2] - up[2] * v[1],
    up[2] * v[0] - up[0] * v[2],
    up[0] * v[1] - up[1] * v[0],
  ]);
  const b: V3 = [
    v[1] * a[2] - v[2] * a[1],
    v[2] * a[0] - v[0] * a[2],
    v[0] * a[1] - v[1] * a[0],
  ];
  return [a, b];
};

export const Football: React.FC<{ size: number; spin: number; theme: Theme; glow?: number }> = ({
  size,
  spin,
  theme,
  glow = 1,
}) => {
  const yaw = (spin * Math.PI) / 180;
  const tilt = 0.34;
  const R = 47;

  const faces = CENTRES.map((c, i) => {
    const v = rotate(c, yaw, tilt);
    const [a, b] = basis(v);
    const phase = i * 0.7;
    const points = Array.from({ length: 5 }, (_, k) => {
      const t = phase + (k * 2 * Math.PI) / 5;
      const p = norm([
        v[0] * Math.cos(FACE) + (a[0] * Math.cos(t) + b[0] * Math.sin(t)) * Math.sin(FACE),
        v[1] * Math.cos(FACE) + (a[1] * Math.cos(t) + b[1] * Math.sin(t)) * Math.sin(FACE),
        v[2] * Math.cos(FACE) + (a[2] * Math.cos(t) + b[2] * Math.sin(t)) * Math.sin(FACE),
      ]);
      return `${(50 + p[0] * R).toFixed(2)},${(50 - p[1] * R).toFixed(2)}`;
    }).join(" ");
    return { z: v[2], points };
  })
    // Only the near hemisphere is visible; draw far-to-near so overlaps look right.
    .filter((f) => f.z > -0.12)
    .sort((a, b) => a.z - b.z);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id="ball-clip">
          <circle cx="50" cy="50" r={R} />
        </clipPath>
        <radialGradient id="ball-shade" cx="36%" cy="30%" r="76%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#E3EAF2" />
          <stop offset="88%" stopColor="#97A6B6" />
          <stop offset="100%" stopColor="#4A5867" />
        </radialGradient>
        <radialGradient id="ball-spec" cx="33%" cy="26%" r="30%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r={R} fill="url(#ball-shade)" />
      <g clipPath="url(#ball-clip)">
        {faces.map((f, i) => (
          <polygon
            key={i}
            points={f.points}
            fill="#14191F"
            stroke="#14191F"
            strokeWidth="1.6"
            strokeLinejoin="round"
            // Faces turning away from the viewer sit in the ball's own shadow.
            opacity={Math.max(0, Math.min(1, 0.25 + f.z * 1.5))}
          />
        ))}
        <circle cx="50" cy="50" r={R} fill="url(#ball-spec)" />
        {/* Terminator: the curve of the sphere falling away from the light. */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="12" opacity="0.45" />
      </g>
      <circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke={theme.metal}
        strokeWidth="2.2"
        opacity={0.85}
        style={{ filter: `drop-shadow(0 0 ${8 * glow}px ${theme.glow})` }}
      />
    </svg>
  );
};
