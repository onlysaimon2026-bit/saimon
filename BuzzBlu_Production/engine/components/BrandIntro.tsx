import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, UI } from "../fonts";
import { GREEN, Theme } from "../theme";

// 0.0-1.5s. The wordmark assembles out of the dark, a blade of light passes through it,
// and it drops away as the stadium rig comes up.
export const BrandIntro: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  if (t > 2.1) return null;

  const exit = interpolate(t, [1.35, 1.95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const letters = "BUZZBLU".split("");
  const blade = interpolate(t, [0.28, 0.95], [-1.2, 1.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = interpolate(t, [0.5, 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const sub = spring({ frame: frame - 18, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        opacity: 1 - exit,
        transform: `scale(${1 + exit * 0.22})`,
        filter: `blur(${exit * 16}px)`,
      }}
    >
      <div style={{ position: "relative", display: "flex", overflow: "hidden", padding: "0 24px" }}>
        {letters.map((ch, i) => {
          const s = spring({ frame: frame - i * 2, fps, config: { damping: 14, stiffness: 150 } });
          return (
            <span
              key={i}
              style={{
                fontFamily: DISPLAY,
                fontSize: width * 0.105,
                lineHeight: 1,
                letterSpacing: width * 0.004,
                color: i < 4 ? "#FFFFFF" : GREEN,
                opacity: s,
                transform: `translateY(${(1 - s) * 70}px) scale(${1.5 - 0.5 * s})`,
                filter: `blur(${(1 - s) * 14}px)`,
                display: "inline-block",
                textShadow: `0 0 ${40}px ${theme.glow}`,
              }}
            >
              {ch}
            </span>
          );
        })}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(100deg, transparent 42%, rgba(255,255,255,0.95) 50%, transparent 58%)",
            transform: `translateX(${blade * 100}%)`,
            mixBlendMode: "overlay",
          }}
        />
      </div>
      <div
        style={{
          height: 3,
          width: width * 0.3 * line,
          marginTop: 22,
          background: `linear-gradient(90deg, transparent, ${theme.metal}, ${GREEN}, transparent)`,
          boxShadow: `0 0 24px ${theme.glow}`,
        }}
      />
      <div
        style={{
          marginTop: 24,
          fontFamily: UI,
          fontWeight: 500,
          fontSize: width * 0.0165,
          letterSpacing: width * 0.0085,
          color: "rgba(234,244,255,0.85)",
          opacity: sub,
          transform: `translateY(${(1 - sub) * 18}px)`,
        }}
      >
        FOOTBALL TOURNAMENT • PLAYER AUCTION 2026
      </div>
    </AbsoluteFill>
  );
};
