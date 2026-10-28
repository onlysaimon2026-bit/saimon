import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";

// A pane of glass slides across the cut (cut is at frame 3): blurred, brightened band
// with bright edges, plus a soft flash.
export const CutFx: React.FC<{ config: MotionConfig }> = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const flash = interpolate(frame, [1, 3, 8], [0, 0.18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, 10], [-0.6, 1.2], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
      <div
        style={{
          position: "absolute",
          top: "-20%",
          bottom: "-20%",
          left: x * width,
          width: width * 0.35,
          transform: "skewX(-18deg)",
          backdropFilter: "blur(10px) brightness(1.15)",
          WebkitBackdropFilter: "blur(10px) brightness(1.15)",
          background: "linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.3))",
          borderLeft: "1px solid rgba(255,255,255,0.6)",
          borderRight: "1px solid rgba(255,255,255,0.6)",
        }}
      />
    </AbsoluteFill>
  );
};
