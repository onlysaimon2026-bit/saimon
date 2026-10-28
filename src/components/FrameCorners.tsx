import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";

// Camera-viewfinder corner brackets with a blinking REC dot.
export const FrameCorners: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const start = config.introStyle === "overlay" ? config.introSeconds * fps : 0;
  const p = interpolate(frame, [start, start + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const len = base * 0.07 * p;
  const inset = base * 0.04;
  const stroke = Math.max(3, base * 0.004);
  const corner = (top: boolean, left: boolean): React.CSSProperties => ({
    position: "absolute",
    [top ? "top" : "bottom"]: inset,
    [left ? "left" : "right"]: inset,
    width: len,
    height: len,
    [top ? "borderTop" : "borderBottom"]: `${stroke}px solid rgba(255,255,255,0.85)`,
    [left ? "borderLeft" : "borderRight"]: `${stroke}px solid rgba(255,255,255,0.85)`,
    filter: `drop-shadow(0 0 6px ${config.accent})`,
  });
  return (
    <AbsoluteFill style={{ opacity: p * 0.9 }}>
      <div style={corner(true, true)} />
      <div style={corner(true, false)} />
      <div style={corner(false, true)} />
      <div style={corner(false, false)} />
      <div
        style={{
          position: "absolute",
          top: inset + base * 0.025,
          right: inset + base * 0.03,
          width: base * 0.018,
          height: base * 0.018,
          borderRadius: "50%",
          background: "#ff2b2b",
          boxShadow: "0 0 12px #ff2b2b",
          opacity: Math.floor(frame / (fps / 2)) % 2 === 0 ? 1 : 0.15,
        }}
      />
    </AbsoluteFill>
  );
};
