import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Callout, MotionConfig } from "../config";
import { FONT } from "../fonts";
import { AnimatedIcon } from "./Icons";

// Keyword card: glass panel with a self-drawing icon, glitch-in kinetic text and a shine pass.
export const CalloutView: React.FC<{ item: Callout; config: MotionConfig }> = ({ item, config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const enter = spring({ frame, fps, config: { damping: 13, stiffness: 170 } });
  const exit = spring({ frame: frame - (durationInFrames - 10), fps, config: { damping: 20 } });
  const p = enter - exit;
  const icon = interpolate(frame, [4, 30], [0, 1], { extrapolateRight: "clamp" });
  const hl = spring({ frame: frame - 8, fps, config: { damping: 20 } });
  const shine = interpolate(frame, [12, 32], [-1, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // RGB-split jitter for the first few frames.
  const glitch = frame < 6 ? (random(`g${frame}`) - 0.5) * base * 0.02 : 0;
  const justify = item.position === "center" ? "center" : item.position === "bottom" ? "flex-end" : "flex-start";
  const textStyle: React.CSSProperties = {
    fontSize: base * (item.text.length > 14 ? 0.07 : 0.09),
    fontWeight: 900,
    lineHeight: 1.1,
    textTransform: "uppercase",
    textAlign: "center",
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: justify,
        alignItems: "center",
        padding: `${height * 0.08}px ${width * 0.06}px ${height * 0.16}px`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: base * 0.015,
          padding: `${base * 0.03}px ${base * 0.05}px`,
          borderRadius: base * 0.03,
          background: "rgba(8,10,18,0.55)",
          border: `1px solid ${config.accent}55`,
          backdropFilter: "blur(14px)",
          boxShadow: `0 20px 60px rgba(0,0,0,0.35), inset 0 0 40px ${config.accent}22`,
          transform: `translateY(${(1 - p) * -base * 0.08}px) scale(${0.7 + 0.3 * p})`,
          opacity: p,
          overflow: "hidden",
          maxWidth: width * 0.88,
        }}
      >
        {item.icon && <AnimatedIcon name={item.icon} progress={icon} size={base * 0.14} color="white" glow={config.accent} />}
        {item.kicker && (
          <div style={{ fontSize: base * 0.03, fontWeight: 700, color: config.accent, letterSpacing: base * 0.006, textTransform: "uppercase" }}>
            {item.kicker}
          </div>
        )}
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: `-${base * 0.006}px -${base * 0.02}px`,
              background: `linear-gradient(90deg, ${config.accent2}, ${config.accent})`,
              transform: `scaleX(${hl}) skewX(-10deg)`,
              transformOrigin: "left",
              borderRadius: 8,
            }}
          />
          {glitch !== 0 && (
            <>
              <div style={{ ...textStyle, position: "absolute", inset: 0, color: config.accent2, transform: `translateX(${glitch}px)`, opacity: 0.8 }}>
                {item.text}
              </div>
              <div style={{ ...textStyle, position: "absolute", inset: 0, color: config.accent, transform: `translateX(${-glitch}px)`, opacity: 0.8 }}>
                {item.text}
              </div>
            </>
          )}
          <div style={{ ...textStyle, position: "relative", color: "white", textShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>{item.text}</div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
            transform: `translateX(${shine * 100}%)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
