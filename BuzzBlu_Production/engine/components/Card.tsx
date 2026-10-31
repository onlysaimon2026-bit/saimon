import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Theme } from "../theme";

export type CardPose = { x: number; y: number; z: number; rotY: number; rotX: number; scale: number; opacity: number };

// The card's path through the 10 seconds: it swings in from off-axis, lands with a
// small overshoot, holds, slides left for the hero moment, then recedes for the signature.
export const cardPose = (frame: number, fps: number): CardPose => {
  const t = frame / fps;
  const land = spring({ frame: frame - 3 * fps, fps, config: { damping: 15, stiffness: 95, mass: 1.1 } });
  const toHero = interpolate(t, [5.0, 6.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.18, 1),
  });
  const toSign = interpolate(t, [7.80, 8.32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  // A slow idle sway keeps the metal alive between the big moves.
  const sway = Math.sin(t * 0.9) * 2.2;

  return {
    x: toHero * -455 + toSign * -90,
    y: toSign * -30,
    z: interpolate(land, [0, 1], [-1500, 0]) + toSign * -900,
    rotY: interpolate(land, [0, 1], [-104, 0]) + sway + toHero * 15 + toSign * -22,
    rotX: interpolate(land, [0, 1], [14, 0]) + toSign * 4,
    scale: interpolate(land, [0, 1], [0.42, 1]) * (1 - toHero * 0.1) * (1 - toSign * 0.1),
    opacity: interpolate(t, [2.98, 3.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
      Math.max(0, 1 - toSign * 1.25),
  };
};

export const Card: React.FC<{ card: string; aspect: number; theme: Theme }> = ({ card, aspect, theme }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const pose = cardPose(frame, fps);
  if (pose.opacity <= 0) return null;

  // Constant height, width from the source aspect, so no card is cropped or stretched.
  const h = height * 0.94;
  const w = h * aspect;
  // Light rakes across the metal as it lands, and once more on the hero beat.
  const sweep =
    interpolate(t, [3.25, 4.15], [-1.3, 1.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) +
    interpolate(t, [5.0, 5.9], [0, 2.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const edge = Math.max(0.25, Math.min(1, Math.abs(Math.sin((pose.rotY * Math.PI) / 180)) * 2 + 0.3));

  const face = (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 18,
        overflow: "hidden",
        background: `linear-gradient(150deg, ${theme.metalDim}, #06090f 45%, ${theme.metalDim})`,
        boxShadow: `0 0 0 3px ${theme.metal}, 0 0 0 7px rgba(4,7,13,0.9), 0 0 ${70}px ${theme.glow},
                    0 46px 90px rgba(0,0,0,0.75)`,
      }}
    >
      <Img src={staticFile(card)} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
      {/* Metal rim highlight, brighter when the card is edge-on to the light. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          border: `2px solid ${theme.rim}`,
          opacity: 0.35 + edge * 0.45,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.55) 48%,
                       ${theme.metalBright}66 52%, transparent 62%)`,
          transform: `translateX(${sweep * 100}%)`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transformStyle: "preserve-3d",
        transform: `translate(-50%, -50%) translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px)
                    rotateX(${pose.rotX}deg) rotateY(${pose.rotY}deg) scale(${pose.scale})`,
        opacity: pose.opacity,
      }}
    >
      {face}
      {/* Floor reflection, faded and blurred so it reads as polished ground. */}
      <div
        style={{
          position: "absolute",
          top: h + 14,
          left: 0,
          transform: "scaleY(-1)",
          transformOrigin: "top",
          opacity: 0.2,
          filter: "blur(5px)",
          maskImage: "linear-gradient(to top, transparent 4%, rgba(0,0,0,0.85) 64%)",
          pointerEvents: "none",
        }}
      >
        {face}
      </div>
    </div>
  );
};
