import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../fonts";
import { AnimatedIcon } from "../components/Icons";
import { glass } from "../components/glass";
import { Graphic } from "./types";

const useInOut = (duration: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.round(duration * fps);
  const p =
    spring({ frame, fps, config: { damping: 16, stiffness: 150 } }) -
    spring({ frame: frame - (total - 12), fps, config: { damping: 20 } });
  return { frame, fps, p };
};

// Compact glass keyword chip in the top band (above the head, below platform UI).
const Keyword: React.FC<{ g: Extract<Graphic, { type: "keyword" }>; accent: string }> = ({ g, accent }) => {
  const { frame, p } = useInOut(g.duration);
  const { width, height } = useVideoConfig();
  const icon = interpolate(frame, [4, 26], [0, 1], { extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [8, 28], [-1.2, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.085, fontFamily: FONT }}>
      <div
        style={{
          ...glass(width, { tint: `${accent}22`, radius: width * 0.06 }),
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: width * 0.028,
          padding: `${width * 0.022}px ${width * 0.045}px ${width * 0.022}px ${width * 0.025}px`,
          opacity: p,
          transform: `translateY(${(1 - p) * -40}px) scale(${0.9 + 0.1 * p})`,
          filter: `blur(${(1 - p) * 6}px)`,
        }}
      >
        {g.icon && <AnimatedIcon name={g.icon} progress={icon} size={width * 0.075} color="white" glow={accent} />}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {g.kicker && (
            <div style={{ fontSize: width * 0.026, fontWeight: 600, letterSpacing: width * 0.005, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>
              {g.kicker}
            </div>
          )}
          <div style={{ fontSize: width * 0.052, fontWeight: 800, color: "white", textTransform: "uppercase", lineHeight: 1.1 }}>{g.text}</div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 48%, transparent 62%)",
            transform: `translateX(${sweep * 100}%)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// Name label: thin line draws, then name and role slide out of it. Left side, chest height.
const Label: React.FC<{ g: Extract<Graphic, { type: "label" }>; accent: string }> = ({ g, accent }) => {
  const { frame, p } = useInOut(g.duration);
  const { width, height } = useVideoConfig();
  const line = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const text = interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", paddingTop: height * 0.6, paddingLeft: width * 0.07, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: width * 0.025, opacity: p }}>
        <div style={{ width: 4, borderRadius: 4, background: accent, boxShadow: `0 0 12px ${accent}`, transform: `scaleY(${line})`, transformOrigin: "top" }} />
        <div style={{ ...glass(width, { radius: width * 0.03 }), padding: `${width * 0.018}px ${width * 0.035}px`, clipPath: `inset(0 ${100 - text * 100}% 0 0 round ${width * 0.03}px)` }}>
          <div style={{ fontSize: width * 0.05, fontWeight: 800, color: "white" }}>{g.title}</div>
          {g.subtitle && (
            <div style={{ fontSize: width * 0.028, fontWeight: 600, color: accent, letterSpacing: width * 0.006, textTransform: "uppercase" }}>{g.subtitle}</div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Row of glass tiles that pop in one after another: "new things keep arriving".
const Orbit: React.FC<{ g: Extract<Graphic, { type: "orbit" }>; accent: string }> = ({ g, accent }) => {
  const { frame, fps, p } = useInOut(g.duration);
  const { width, height } = useVideoConfig();
  const size = width * 0.15;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.085, fontFamily: FONT, opacity: p }}>
      <div style={{ display: "flex", gap: width * 0.03 }}>
        {g.items.map((it, i) => {
          const appear = spring({ frame: frame - 6 - i * 7, fps, config: { damping: 13, stiffness: 160 } });
          const float = Math.sin((frame / fps) * 2.2 + i) * height * 0.003;
          return (
            <div
              key={i}
              style={{
                ...glass(width, { blur: 12, radius: width * 0.04, tint: `${accent}22` }),
                width: size,
                height: size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translateY(${(1 - appear) * -30 + float}px) scale(${0.6 + 0.4 * appear})`,
                opacity: appear,
              }}
            >
              <AnimatedIcon name={it.icon} progress={appear} size={size * 0.55} color="white" glow={accent} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Small glass chart whose line climbs steeply: "changing fast".
const Trend: React.FC<{ g: Extract<Graphic, { type: "trend" }>; accent: string }> = ({ g, accent }) => {
  const { frame, p } = useInOut(g.duration);
  const { width, height } = useVideoConfig();
  const draw = interpolate(frame, [8, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const w = width * 0.78;
  const h = height * 0.06;
  const pts = [0, 0.05, 0.08, 0.15, 0.22, 0.38, 0.6, 1].map((v, i, a) => [(i / (a.length - 1)) * w, h - v * h] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const head = pts[Math.min(pts.length - 1, Math.floor(draw * (pts.length - 1)))];
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.085, fontFamily: FONT }}>
      <div style={{ ...glass(width, { radius: width * 0.04 }), padding: width * 0.025, opacity: p, transform: `translateY(${(1 - p) * -40}px)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: width * 0.034, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: width * 0.004, textTransform: "uppercase", marginBottom: width * 0.012 }}>
          <span>{g.label}</span>
          <span style={{ color: accent }}>{g.from} → {g.to}</span>
        </div>
        <svg width={w} height={h} style={{ overflow: "visible" }}>
          {[0.25, 0.5, 0.75].map((y) => (
            <line key={y} x1={0} x2={w} y1={h * y} y2={h * y} stroke="rgba(255,255,255,0.12)" />
          ))}
          <path d={d} fill="none" stroke={accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 8px ${accent})` }} />
          <circle cx={head[0]} cy={head[1]} r={9 * draw} fill="white" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// Big kinetic headline for the strongest moment: letters assemble from blur, glass bar behind.
const Headline: React.FC<{ g: Extract<Graphic, { type: "headline" }>; accent: string }> = ({ g, accent }) => {
  const { frame, fps, p } = useInOut(g.duration);
  const { width, height } = useVideoConfig();
  const letters = g.text.split("");
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.085, fontFamily: FONT }}>
      <div style={{ ...glass(width, { tint: `${accent}33`, radius: width * 0.05 }), padding: `${width * 0.02}px ${width * 0.06}px`, opacity: p, display: "flex" }}>
        {letters.map((ch, i) => {
          const s = spring({ frame: frame - i * 2, fps, config: { damping: 12, stiffness: 180 } });
          return (
            <span key={i} style={{ whiteSpace: "pre", fontSize: width * 0.095, fontWeight: 900, color: "white", letterSpacing: width * 0.006, opacity: s, filter: `blur(${(1 - s) * 10}px)`, transform: `scale(${1.6 - 0.6 * s})`, display: "inline-block", textShadow: `0 0 30px ${accent}` }}>
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const End: React.FC<{ g: Extract<Graphic, { type: "end" }>; accent: string }> = ({ g, accent }) => {
  const { frame, fps, p } = useInOut(g.duration + 1);
  const { width, height } = useVideoConfig();
  const btn = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.085, fontFamily: FONT }}>
      <div style={{ ...glass(width, { radius: width * 0.06 }), display: "flex", alignItems: "center", gap: width * 0.03, padding: `${width * 0.02}px ${width * 0.03}px ${width * 0.02}px ${width * 0.05}px`, opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
        <div style={{ fontSize: width * 0.068, fontWeight: 800, color: "white", letterSpacing: width * 0.006 }}>{g.title}</div>
        <div style={{ ...glass(width, { blur: 8, radius: width * 0.05, tint: `${accent}66` }), padding: `${width * 0.016}px ${width * 0.045}px`, fontSize: width * 0.048, fontWeight: 800, color: "white", transform: `scale(${btn})` }}>
          {g.cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const GraphicView: React.FC<{ g: Graphic; accent: string }> = ({ g, accent }) => {
  switch (g.type) {
    case "keyword":
      return <Keyword g={g} accent={accent} />;
    case "label":
      return <Label g={g} accent={accent} />;
    case "orbit":
      return <Orbit g={g} accent={accent} />;
    case "trend":
      return <Trend g={g} accent={accent} />;
    case "headline":
      return <Headline g={g} accent={accent} />;
    case "end":
      return <End g={g} accent={accent} />;
  }
};
