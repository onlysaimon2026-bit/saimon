import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Callout, MotionConfig } from "../config";
import { FONT } from "../fonts";

export const CalloutView: React.FC<{ item: Callout; config: MotionConfig }> = ({ item, config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const p =
    spring({ frame, fps, config: { damping: 11, stiffness: 160 } }) -
    spring({ frame: frame - (durationInFrames - 10), fps, config: { damping: 20 } });
  const hl = spring({ frame: frame - 6, fps, config: { damping: 20 } });
  const justify = item.position === "top" ? "flex-start" : item.position === "bottom" ? "flex-end" : "center";

  return (
    <AbsoluteFill style={{ justifyContent: justify, alignItems: "center", padding: base * 0.1, fontFamily: FONT }}>
      <div style={{ position: "relative", transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -6}deg)`, opacity: p }}>
        <div
          style={{
            position: "absolute",
            inset: `-${base * 0.01}px -${base * 0.025}px`,
            background: `linear-gradient(90deg, ${config.accent2}, ${config.accent})`,
            transform: `scaleX(${hl}) skewX(-10deg)`,
            transformOrigin: "left",
            borderRadius: 8,
          }}
        />
        <div
          style={{
            position: "relative",
            fontSize: base * 0.075,
            fontWeight: 900,
            color: "white",
            textTransform: "uppercase",
            textShadow: "0 6px 20px rgba(0,0,0,0.45)",
            textAlign: "center",
          }}
        >
          {item.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
