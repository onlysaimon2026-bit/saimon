import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";

export const Footage: React.FC<{ src: string; config: MotionConfig }> = ({ src, config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow cinematic push-in across the whole video.
  const drift = interpolate(frame, [0, durationInFrames], [1.0, 1.06]);
  // Zoom punch that decays after every detected cut.
  const punch = config.cuts.reduce((acc, t) => {
    const f = frame - Math.round(t * fps);
    if (f < 0 || f > fps) return acc;
    return acc + 0.06 * (1 - spring({ frame: f, fps, config: { damping: 14, stiffness: 120 } }));
  }, 0);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${drift + punch})`,
          filter: "contrast(1.08) saturate(1.18) brightness(1.02)",
        }}
      />
    </AbsoluteFill>
  );
};
