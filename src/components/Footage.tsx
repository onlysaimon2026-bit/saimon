import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";

export const Footage: React.FC<{ src: string; config: MotionConfig; muted?: boolean }> = ({ src, config, muted }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow cinematic push-in across the whole video.
  const drift = interpolate(frame, [0, durationInFrames], [1.0, 1.05]);

  // Jump cuts alternate between wide and close framing, settling in with a short spring.
  const cutFrames = config.cuts
    .filter((t) => !config.wideRanges.some(([a, b]) => t >= a && t <= b))
    .map((t) => Math.round(t * fps));
  const segment = cutFrames.filter((f) => f <= frame).length;
  const framing = segment % 2 === 1 ? config.punchZoom : 1;
  const sinceCut = segment > 0 ? frame - cutFrames[segment - 1] : frame;
  const settle = 0.04 * (1 - spring({ frame: sinceCut, fps, config: { damping: 15, stiffness: 140 } }));

  // With an overlay intro, the footage resolves out of a blurred zoom under the title.
  const introFrames = config.introStyle === "overlay" ? Math.round(config.introSeconds * fps) : 0;
  const reveal = introFrames
    ? interpolate(frame, [introFrames * 0.5, introFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted={muted}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${drift * framing + settle + reveal * 0.15})`,
          transformOrigin: "50% 35%",
          filter: reveal > 0 ? `blur(${reveal * 12}px)` : undefined,
        }}
      />
    </AbsoluteFill>
  );
};
