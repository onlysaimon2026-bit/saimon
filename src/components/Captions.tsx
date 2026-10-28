import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, MotionConfig } from "../config";
import { FONT } from "../fonts";

// Word-by-word "pop" captions; the active word is highlighted in the accent colour.
export const Captions: React.FC<{ captions: Caption[]; config: MotionConfig }> = ({ captions, config }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const base = Math.min(width, height);
  const t = frame / fps;
  const cap = captions.find((c) => t >= c.from && t < c.to);
  if (!cap) return null;

  const words = cap.text.split(/\s+/);
  const per = (cap.to - cap.from) / words.length;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: base * 0.08, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: width * 0.8, gap: base * 0.015 }}>
        {words.map((w, i) => {
          const start = cap.from + i * per;
          const s = spring({ frame: frame - Math.round(start * fps), fps, config: { damping: 12, stiffness: 200 } });
          const active = t >= start && t < start + per;
          return (
            <span
              key={i}
              style={{
                fontSize: base * 0.055,
                fontWeight: 800,
                color: active ? config.accent : "white",
                transform: `scale(${active ? 1.12 : 1}) translateY(${(1 - s) * 20}px)`,
                opacity: s,
                WebkitTextStroke: `${base * 0.003}px black`,
                textShadow: "0 4px 14px rgba(0,0,0,0.7)",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
