import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LowerThird, MotionConfig } from "../config";
import { FONT } from "../fonts";

export const LowerThirdView: React.FC<{ item: LowerThird; config: MotionConfig }> = ({ item, config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const inS = spring({ frame, fps, config: { damping: 16 } });
  const outS = spring({ frame: frame - (durationInFrames - 15), fps, config: { damping: 16 } });
  const p = inS - outS;
  const text = interpolate(p, [0.3, 1], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: `0 0 ${base * 0.12}px ${width * 0.06}px`, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div
          style={{
            width: base * 0.012,
            background: `linear-gradient(${config.accent}, ${config.accent2})`,
            transform: `scaleY(${p})`,
            boxShadow: `0 0 20px ${config.accent}`,
          }}
        />
        <div
          style={{
            background: "rgba(5,6,10,0.72)",
            backdropFilter: "blur(10px)",
            padding: `${base * 0.015}px ${base * 0.03}px`,
            clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
          }}
        >
          <div
            style={{
              fontSize: base * 0.05,
              fontWeight: 800,
              color: "white",
              clipPath: `inset(0 ${100 - text}% 0 0)`,
            }}
          >
            {item.title}
          </div>
          {item.subtitle && (
            <div
              style={{
                fontSize: base * 0.028,
                fontWeight: 500,
                color: config.accent,
                letterSpacing: base * 0.004,
                textTransform: "uppercase",
                clipPath: `inset(0 ${100 - text}% 0 0)`,
              }}
            >
              {item.subtitle}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
