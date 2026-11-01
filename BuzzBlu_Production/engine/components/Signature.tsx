import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// 8.0-10.0s. The card recedes and the frame settles to black so the next segment can
// begin cleanly. The wordmark used to land here too, which meant every card carried the
// logo twice; it now appears once only, at the head of the card, where it names the
// category. Nothing is drawn over the closing move.
export const Signature: React.FC<{ theme: unknown }> = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fade = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (fade <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: "#04070d", opacity: fade }} />;
};
