import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";

export const ProgressBar: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height } = useVideoConfig();
  const h = Math.max(4, height * 0.006);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end" }}>
      <div
        style={{
          height: h,
          width: `${(frame / durationInFrames) * 100}%`,
          background: `linear-gradient(90deg, ${config.accent}, ${config.accent2})`,
          boxShadow: `0 0 16px ${config.accent}`,
        }}
      />
    </AbsoluteFill>
  );
};
