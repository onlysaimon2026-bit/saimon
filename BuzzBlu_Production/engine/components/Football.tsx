import { Theme } from "../theme";

// A football drawn as SVG. The panel pattern lives in a clipped group that both rotates
// and slides, which reads as a ball spinning rather than a flat badge turning.
export const Football: React.FC<{ size: number; spin: number; theme: Theme; glow?: number }> = ({
  size,
  spin,
  theme,
  glow = 1,
}) => {
  const id = "ball";
  // Horizontal travel of the surface, wrapped so the pattern never runs out.
  const roll = ((spin / 360) % 1) * 100;
  const squash = 0.72 + 0.28 * Math.abs(Math.cos((spin * Math.PI) / 180));

  const pentagon = (cx: number, cy: number, r: number, rot: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = ((rot + i * 72 - 90) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ");

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="47" />
        </clipPath>
        <radialGradient id={`${id}-shade`} cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="58%" stopColor="#D9E2EC" />
          <stop offset="100%" stopColor="#5C6B7D" />
        </radialGradient>
        <radialGradient id={`${id}-spec`} cx="32%" cy="26%" r="34%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="47" fill={`url(#${id}-shade)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Two copies of the panel set, offset by one tile, so the roll is seamless. */}
        {[-100, 0, 100].map((offset) => (
          <g key={offset} transform={`translate(${offset + roll} 0)`} opacity={0.92}>
            <g transform={`rotate(${spin * 0.25} 50 50) scale(${squash} 1) translate(${(1 - squash) * 50 / squash} 0)`}>
              <polygon points={pentagon(50, 50, 19, spin * 0.12)} fill="#12181F" />
              <polygon points={pentagon(16, 20, 13, 180 + spin * 0.12)} fill="#12181F" />
              <polygon points={pentagon(88, 26, 12, 30 + spin * 0.12)} fill="#12181F" />
              <polygon points={pentagon(22, 88, 12, 200 + spin * 0.12)} fill="#12181F" />
              <polygon points={pentagon(84, 86, 13, 110 + spin * 0.12)} fill="#12181F" />
              <path d="M50 31 L34 12 M50 31 L70 14 M31 50 L10 44 M69 50 L92 44 M40 66 L30 86 M62 66 L74 84"
                    stroke="#2A343F" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            </g>
          </g>
        ))}
        {/* Shading inside the sphere so the panels wrap rather than sit flat. */}
        <circle cx="50" cy="50" r="47" fill={`url(#${id}-spec)`} />
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="14" opacity="0.4" />
      </g>
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="none"
        stroke={theme.metal}
        strokeWidth="2.2"
        opacity={0.85}
        style={{ filter: `drop-shadow(0 0 ${8 * glow}px ${theme.glow})` }}
      />
    </svg>
  );
};
