import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";

// Glass track with a frosted white fill and a glowing head.
export const ProgressBar: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const h = Math.max(6, base * 0.009);
  const pct = (frame / durationInFrames) * 100;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: base * 0.035 }}>
      <div
        style={{
          position: "relative",
          width: "70%",
          height: h,
          borderRadius: h,
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.3)",
          backdropFilter: "blur(8px)",
          overflow: "visible",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: h,
            background: `linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0.9))`,
            boxShadow: `0 0 ${h * 2}px ${config.accent}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
