import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, UI } from "../fonts";
import { GREEN, Theme } from "../theme";
import { Football } from "./Football";

// 8.0-10.0s. The card recedes, the lockup lands on the final impact, and the frame
// settles to black so the next segment can begin cleanly. Nothing is written under the
// wordmark here: the category is already named under the lockup that opens the card.
export const Signature: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  if (t < 7.9) return null;

  const hit = spring({ frame: frame - Math.round(8 * fps), fps, config: { damping: 13, stiffness: 140 } });
  const ring = interpolate(t, [8.0, 8.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const line = interpolate(t, [8.25, 8.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const fade = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      <div
        style={{
          position: "absolute",
          width: width * 0.9 * ring,
          height: width * 0.9 * ring,
          borderRadius: "50%",
          border: `2px solid ${theme.metal}`,
          opacity: (1 - ring) * 0.55,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: width * 0.012,
          opacity: hit,
          transform: `scale(${0.82 + 0.18 * hit})`,
          filter: `blur(${(1 - hit) * 12}px)`,
        }}
      >
        <div style={{ filter: `drop-shadow(0 0 20px ${theme.glow})` }}>
          <Football size={width * 0.056} spin={200 + t * 150} theme={theme} />
        </div>
        {"BUZZBLU".split("").map((ch, i) => (
          <span
            key={i}
            style={{
              fontFamily: DISPLAY,
              fontSize: width * 0.095,
              lineHeight: 1,
              letterSpacing: width * 0.004,
              color: i < 4 ? "#FFFFFF" : GREEN,
              textShadow: `0 0 50px ${theme.glow}`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div
        style={{
          height: 3,
          width: width * 0.34 * line,
          marginTop: 18,
          background: `linear-gradient(90deg, transparent, ${theme.metal}, ${GREEN}, transparent)`,
          boxShadow: `0 0 22px ${theme.glow}`,
        }}
      />
      <AbsoluteFill style={{ backgroundColor: "#04070d", opacity: fade }} />
    </AbsoluteFill>
  );
};
