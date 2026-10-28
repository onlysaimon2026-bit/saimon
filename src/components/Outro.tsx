import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";
import { FONT } from "../fonts";

export const Outro: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const name = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const btn = spring({ frame: frame - 30, fps, config: { damping: 10, stiffness: 160 } });
  // Simulated "click" on the subscribe button.
  const click = frame - 60;
  const press = click >= 0 && click < 8 ? 0.9 : 1;
  const subscribed = click >= 4;
  const ripple = interpolate(click, [4, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, #1a1f3a 0%, #05060a 75%)`,
        opacity: fadeIn * fadeOut,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: base * 0.12,
          fontWeight: 900,
          color: "white",
          letterSpacing: base * 0.01,
          transform: `scale(${0.8 + 0.2 * name})`,
          opacity: name,
          backgroundImage: `linear-gradient(90deg, #fff, ${config.accent}, #fff)`,
          backgroundSize: "200% 100%",
          backgroundPosition: `${frame * 2}% 0`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {config.channelName}
      </div>
      <div
        style={{
          marginTop: base * 0.02,
          fontSize: base * 0.035,
          fontWeight: 500,
          color: "#cfd8ff",
          letterSpacing: base * 0.012,
          opacity: name,
        }}
      >
        {config.outroText}
      </div>
      <div style={{ position: "relative", marginTop: base * 0.06, transform: `scale(${btn * press})` }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: base * 0.5 * ripple,
            height: base * 0.5 * ripple,
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            border: `3px solid ${config.accent2}`,
            opacity: 1 - ripple,
          }}
        />
        <div
          style={{
            padding: `${base * 0.02}px ${base * 0.06}px`,
            borderRadius: base * 0.05,
            background: subscribed ? "#2a2f45" : `linear-gradient(90deg, #ff0033, ${config.accent2})`,
            color: "white",
            fontSize: base * 0.04,
            fontWeight: 800,
            boxShadow: subscribed ? "none" : `0 10px 40px ${config.accent2}88`,
          }}
        >
          {subscribed ? "SUBSCRIBED ✓" : "SUBSCRIBE"}
        </div>
      </div>
    </AbsoluteFill>
  );
};
