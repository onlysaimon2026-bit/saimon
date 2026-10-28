import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";
import { FONT } from "../fonts";
import { glass } from "./glass";

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
        background: "radial-gradient(circle at 50% 40%, rgba(10,14,26,0.15) 0%, rgba(5,6,10,0.45) 80%)",
        opacity: fadeIn * fadeOut,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          ...glass(base, { blur: 24, radius: base * 0.05 }),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: `${base * 0.06}px ${base * 0.09}px`,
          transform: `scale(${0.9 + 0.1 * name})`,
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
          backgroundImage: `linear-gradient(90deg, #fff 30%, ${config.accent} 50%, #fff 70%)`,
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
            border: "2px solid rgba(255,255,255,0.8)",
            opacity: 1 - ripple,
          }}
        />
        <div
          style={{
            padding: `${base * 0.02}px ${base * 0.06}px`,
            borderRadius: base * 0.05,
            ...glass(base, { blur: 10, radius: base * 0.05, tint: subscribed ? "rgba(255,255,255,0.05)" : `${config.accent}55` }),
            color: "white",
            fontSize: base * 0.04,
            fontWeight: 800,
          }}
        >
          {subscribed ? config.buttonDoneText : config.buttonText}
        </div>
      </div>
      </div>
    </AbsoluteFill>
  );
};
