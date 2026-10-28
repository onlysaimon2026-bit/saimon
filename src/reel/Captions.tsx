import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CaptionLine } from "./types";

const BN_FONT = `"Hind Siliguri", Montserrat, sans-serif`;

// Phrase captions: the line fades/rises in, each word brightens as it is spoken and
// marked keywords take the accent colour. Sits below the chin, above platform UI.
export const Captions: React.FC<{ lines: CaptionLine[]; accent: string; hidden: (t: number) => boolean }> = ({
  lines,
  accent,
  hidden,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const line = lines.find((l) => t >= l.from && t < l.to);
  if (!line || hidden(t)) return null;
  const local = frame - Math.round(line.from * fps);
  const inP = spring({ frame: local, fps, config: { damping: 18, stiffness: 180 } });
  const outP = interpolate(t, [line.to - 0.12, line.to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: height * 0.655 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: width * 0.84,
          columnGap: width * 0.018,
          rowGap: height * 0.004,
          opacity: inP * outP,
          transform: `translateY(${(1 - inP) * 24}px)`,
        }}
      >
        {line.words.map((w, i) => {
          const spoken = t >= w.s;
          const pop = spring({ frame: frame - Math.round(w.s * fps), fps, config: { damping: 14, stiffness: 260 } });
          return (
            <span
              key={i}
              style={{
                fontFamily: BN_FONT,
                fontSize: width * 0.068,
                fontWeight: 700,
                lineHeight: 1.35,
                color: w.hl && spoken ? accent : "white",
                opacity: spoken ? 1 : 0.55,
                transform: `scale(${w.hl && spoken ? 1 + 0.08 * pop : 1})`,
                display: "inline-block",
                textShadow: "0 2px 3px rgba(0,0,0,0.55), 0 6px 22px rgba(0,0,0,0.45)",
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
