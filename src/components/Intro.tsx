import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";
import { FONT } from "../fonts";
import { glass } from "./glass";

// Glass title card: floating glass orbs, a frosted panel that slides up, per-letter
// reveal and a refraction light sweep across the panel.
export const Intro: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const overlay = config.introStyle === "overlay";
  const exitStart = durationInFrames - Math.round(0.5 * fps);

  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const panel = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const sweep = interpolate(frame, [14, 40], [-1.2, 1.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sub = spring({ frame: frame - 22, fps, config: { damping: 18 } });
  const letters = config.title.split("");
  const titleSize = Math.min(base * 0.13, (width * 0.7) / Math.max(letters.length, 1) / 0.68);

  return (
    <AbsoluteFill
      style={{
        background: overlay
          ? "radial-gradient(ellipse at 50% 45%, rgba(5,8,16,0.35) 0%, rgba(5,8,16,0.1) 70%)"
          : "radial-gradient(circle at 50% 45%, #1b2236 0%, #070910 70%)",
        opacity: 1 - exit,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* Floating glass orbs */}
      {new Array(9).fill(0).map((_, i) => {
        const size = base * (0.08 + random(`os${i}`) * 0.16);
        const x = random(`ox${i}`) * width - size / 2;
        const y = random(`oy${i}`) * height - size / 2 - frame * (0.6 + random(`ov${i}`)) * 2;
        const appear = spring({ frame: frame - i * 2, fps, config: { damping: 18 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.02) 70%)",
              border: "1px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(6px)",
              transform: `scale(${appear * (1 + exit * 0.6)})`,
              opacity: 0.85,
            }}
          />
        );
      })}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            ...glass(base, { blur: 22, radius: base * 0.05 }),
            position: "relative",
            overflow: "hidden",
            padding: `${base * 0.045}px ${base * 0.08}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: `translateY(${(1 - panel) * base * 0.15}px) scale(${(0.85 + 0.15 * panel) * (1 + exit * 0.25)})`,
            opacity: panel,
            filter: `blur(${exit * 10}px)`,
          }}
        >
          <div style={{ display: "flex" }}>
            {letters.map((ch, i) => {
              const s = spring({ frame: frame - 6 - i * 2, fps, config: { damping: 13, stiffness: 150 } });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                    fontSize: titleSize,
                    fontWeight: 800,
                    letterSpacing: titleSize * 0.06,
                    color: "white",
                    textShadow: "0 2px 18px rgba(255,255,255,0.35)",
                    transform: `translateY(${(1 - s) * 40}px)`,
                    filter: `blur(${(1 - s) * 8}px)`,
                    opacity: s,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div
            style={{
              marginTop: base * 0.015,
              height: 1,
              width: `${sub * 100}%`,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
            }}
          />
          <div
            style={{
              marginTop: base * 0.018,
              fontSize: base * 0.032,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: base * 0.012,
              textTransform: "uppercase",
              opacity: sub,
              transform: `translateY(${(1 - sub) * 16}px)`,
            }}
          >
            {config.subtitle}
          </div>
          {/* Refraction sweep */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.45) 48%, rgba(255,255,255,0.1) 55%, transparent 65%)",
              transform: `translateX(${sweep * 100}%)`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
