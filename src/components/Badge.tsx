import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "../config";
import { FONT } from "../fonts";
import { glass } from "./glass";

// Small persistent glass name chip in the top-left corner.
export const Badge: React.FC<{ config: MotionConfig; startFrame: number }> = ({ config, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const p = spring({ frame: frame - startFrame, fps, config: { damping: 16 } });
  if (!config.badge) return null;
  return (
    <AbsoluteFill style={{ padding: base * 0.07, fontFamily: FONT }}>
      <div
        style={{
          ...glass(base, { blur: 14, radius: base * 0.04 }),
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: base * 0.015,
          padding: `${base * 0.012}px ${base * 0.025}px`,
          opacity: p,
          transform: `translateX(${(1 - p) * -base * 0.1}px)`,
        }}
      >
        <div
          style={{
            width: base * 0.014,
            height: base * 0.014,
            borderRadius: "50%",
            background: config.accent,
            boxShadow: `0 0 10px ${config.accent}`,
          }}
        />
        <div style={{ fontSize: base * 0.028, fontWeight: 800, color: "white", letterSpacing: base * 0.004 }}>{config.badge}</div>
      </div>
    </AbsoluteFill>
  );
};
