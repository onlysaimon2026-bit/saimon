import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, UI } from "../fonts";
import { GREEN, Theme } from "../theme";
import { Football } from "./Football";

// 0.0-1.5s. A football rolls in spinning, strikes the centre, and the wordmark bursts
// out of the impact. The line underneath names the category this card belongs to.
export const BrandIntro: React.FC<{ theme: Theme; subtitle: string }> = ({ theme, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  if (t > 2.1) return null;

  const exit = interpolate(t, [1.35, 1.95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  // The ball travels in and decelerates onto its mark at 0.30s, where the logo sting lands.
  const travel = interpolate(t, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ballSize = width * 0.062;
  const ballX = interpolate(travel, [0, 1], [-width * 0.42, 0]);
  const spin = interpolate(t, [0, 0.3, 2.1], [0, 760, 980], { extrapolateRight: "clamp" });
  const squashHit = 1 - Math.max(0, 1 - Math.abs(t - 0.3) * 26) * 0.18;
  // Letters are thrown out of the strike, nearest ones first.
  const burst = (i: number) => spring({ frame: frame - 9 - i * 2, fps, config: { damping: 14, stiffness: 160 } });

  const letters = "BUZZBLU".split("");
  const blade = interpolate(t, [0.32, 1.0], [-1.2, 1.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = interpolate(t, [0.55, 1.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const sub = spring({ frame: frame - 20, fps, config: { damping: 18 } });

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
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: width * 0.012, padding: "0 24px" }}>
        <div
          style={{
            transform: `translateX(${ballX}px) scale(${squashHit})`,
            filter: `drop-shadow(0 0 ${22}px ${theme.glow})`,
          }}
        >
          <Football size={ballSize} spin={spin} theme={theme} />
        </div>
        <div style={{ display: "flex", overflow: "hidden" }}>
          {letters.map((ch, i) => {
            const s = burst(i);
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
                  transform: `translateX(${(1 - s) * -70}px) scale(${1.35 - 0.35 * s})`,
                  filter: `blur(${(1 - s) * 14}px)`,
                  display: "inline-block",
                  textShadow: `0 0 40px ${theme.glow}`,
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
          fontWeight: 700,
          fontSize: width * 0.019,
          letterSpacing: width * 0.0085,
          color: theme.metal,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 18}px)`,
          textAlign: "center",
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
