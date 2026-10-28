import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { MotionConfig } from "../config";
import { FONT } from "../fonts";

export const Intro: React.FC<{ config: MotionConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const exitStart = durationInFrames - Math.round(0.6 * fps);

  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const letters = config.title.split("");
  const base = Math.min(width, height);
  const titleSize = Math.min(base * 0.14, (width * 0.85) / Math.max(letters.length, 1) / 0.62);

  const bar = interpolate(frame, [6, 26], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const sweep = interpolate(frame, [18, 48], [-0.3, 1.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sub = spring({ frame: frame - 28, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, #141a2e 0%, #05060a 70%)`,
        opacity: 1 - exit,
        transform: `scale(${1 + exit * 0.35})`,
        filter: `blur(${exit * 14}px)`,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* Perspective grid floor */}
      <div
        style={{
          position: "absolute",
          left: "-50%",
          right: "-50%",
          bottom: "-20%",
          height: "70%",
          backgroundImage: `linear-gradient(${config.accent}33 2px, transparent 2px), linear-gradient(90deg, ${config.accent}33 2px, transparent 2px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `0 ${frame * 4}px`,
          transform: "perspective(600px) rotateX(70deg)",
          maskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
      {/* Floating particles */}
      {new Array(40).fill(0).map((_, i) => {
        const x = random(`x${i}`) * width;
        const y = (random(`y${i}`) * height - frame * (1 + random(`s${i}`) * 3) + height) % height;
        const s = 2 + random(`r${i}`) * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: s,
              height: s,
              borderRadius: s,
              background: i % 3 === 0 ? config.accent2 : config.accent,
              boxShadow: `0 0 ${s * 4}px ${i % 3 === 0 ? config.accent2 : config.accent}`,
              opacity: 0.7,
            }}
          />
        );
      })}
      {/* Expanding rings */}
      {[0, 8, 16].map((d) => {
        const p = interpolate(frame - d, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: "50%",
              top: "45%",
              width: base * 1.2 * p,
              height: base * 1.2 * p,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: `2px solid ${config.accent}`,
              opacity: 0.6 * (1 - p),
            }}
          />
        );
      })}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div style={{ position: "relative", display: "flex", overflow: "hidden", padding: "0 20px" }}>
          {letters.map((ch, i) => {
            const s = spring({ frame: frame - 4 - i * 2, fps, config: { damping: 12, stiffness: 140 } });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontSize: titleSize,
                  fontWeight: 900,
                  letterSpacing: titleSize * 0.04,
                  color: "white",
                  whiteSpace: "pre",
                  transform: `translateY(${(1 - s) * 110}%) rotate(${(1 - s) * 12}deg)`,
                  opacity: s,
                  textShadow: `0 0 30px ${config.accent}88`,
                }}
              >
                {ch}
              </span>
            );
          })}
          {/* Light sweep across the title */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.85) 50%, transparent 60%)",
              transform: `translateX(${sweep * 100}%)`,
              mixBlendMode: "overlay",
            }}
          />
        </div>
        <div
          style={{
            height: Math.max(6, base * 0.008),
            width: `${bar * 40}%`,
            marginTop: base * 0.02,
            background: `linear-gradient(90deg, ${config.accent}, ${config.accent2})`,
            boxShadow: `0 0 24px ${config.accent}`,
            borderRadius: 10,
          }}
        />
        <div
          style={{
            marginTop: base * 0.03,
            fontSize: base * 0.035,
            fontWeight: 500,
            color: "#cfd8ff",
            letterSpacing: base * 0.01,
            textTransform: "uppercase",
            opacity: sub,
            transform: `translateY(${(1 - sub) * 30}px)`,
          }}
        >
          {config.subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
