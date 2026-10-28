import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { MotionConfig } from "../config";

// Short light-flash + colour wipe that lands on a cut (cut is at frame 3).
export const CutFx: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [1, 3, 8], [0, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wipe = interpolate(frame, [0, 8], [-120, 120], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "white", opacity: flash, mixBlendMode: "screen" }} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(100deg, transparent 30%, ${config.accent}aa 45%, ${config.accent2}aa 55%, transparent 70%)`,
          transform: `translateX(${wipe}%) skewX(-15deg)`,
          mixBlendMode: "screen",
          opacity: 0.35,
        }}
      />
    </AbsoluteFill>
  );
};
