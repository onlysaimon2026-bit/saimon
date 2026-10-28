import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Callout, MotionConfig } from "../config";
import { FONT } from "../fonts";
import { AnimatedIcon } from "./Icons";
import { glass } from "./glass";

// Glass keyword card: icon in a glass bubble, kicker, headline with a blur-in reveal and
// a refraction sweep.
export const CalloutView: React.FC<{ item: Callout; config: MotionConfig }> = ({ item, config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });
  const exit = spring({ frame: frame - (durationInFrames - 10), fps, config: { damping: 20 } });
  const p = enter - exit;
  const icon = interpolate(frame, [4, 28], [0, 1], { extrapolateRight: "clamp" });
  const words = item.text.split(" ");
  const shine = interpolate(frame, [10, 30], [-1.2, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const justify = item.position === "center" ? "center" : item.position === "bottom" ? "flex-end" : "flex-start";

  return (
    <AbsoluteFill
      style={{
        justifyContent: justify,
        alignItems: "center",
        padding: `${height * 0.08}px ${width * 0.06}px ${height * 0.15}px`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          ...glass(base, { tint: `${config.accent}22` }),
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: base * 0.035,
          padding: `${base * 0.028}px ${base * 0.045}px`,
          maxWidth: width * 0.88,
          transform: `translateY(${(1 - p) * base * 0.06}px) scale(${0.85 + 0.15 * p})`,
          opacity: p,
          filter: `blur(${(1 - p) * 6}px)`,
        }}
      >
        {item.icon && (
          <div
            style={{
              ...glass(base, { blur: 8, radius: base * 0.1 }),
              flexShrink: 0,
              width: base * 0.16,
              height: base * 0.16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AnimatedIcon name={item.icon} progress={icon} size={base * 0.095} color="white" glow={config.accent} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: base * 0.006 }}>
          {item.kicker && (
            <div style={{ fontSize: base * 0.028, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: base * 0.006, textTransform: "uppercase" }}>
              {item.kicker}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: base * 0.018 }}>
            {words.map((w, i) => {
              const s = spring({ frame: frame - 5 - i * 4, fps, config: { damping: 16 } });
              return (
                <span
                  key={i}
                  style={{
                    fontSize: base * (item.text.length > 14 ? 0.06 : 0.072),
                    fontWeight: 800,
                    lineHeight: 1.08,
                    color: "white",
                    textTransform: "uppercase",
                    textShadow: "0 2px 14px rgba(0,0,0,0.25)",
                    opacity: s,
                    filter: `blur(${(1 - s) * 6}px)`,
                    transform: `translateY(${(1 - s) * 18}px)`,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 48%, transparent 62%)",
            transform: `translateX(${shine * 100}%)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
