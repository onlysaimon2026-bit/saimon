import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { MotionConfig } from "../config";

export const Overlay: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(random(`grain-${frame}`) * 1000);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }}
      />
      {config.grain && (
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.09, mixBlendMode: "overlay" }}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
