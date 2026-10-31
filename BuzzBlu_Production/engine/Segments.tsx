import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Football } from "./components/Football";
import { Stage } from "./components/Stage";
import { DISPLAY, UI } from "./fonts";
import { GREEN, Style, THEMES } from "./theme";
import "./fonts";

// Chapter slides between the reveals. They share the stadium so the film never cuts to
// a different world, and each one lands on its own transition sound.

const useChapter = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const t = frame / fps;
  const enter = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 130 } });
  const exit = interpolate(frame, [durationInFrames - 14, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  return { frame, fps, t, width, height, enter, exit, durationInFrames };
};

const Fade: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill style={{ backgroundColor: "#04070d", opacity }} />
);

export type DividerProps = { title: string[]; subtitle: string; style: Style };

// Round and chapter headings: "MEET THE FOUR LEADERS", "ICON PLAYER AUCTION".
export const Divider: React.FC<DividerProps> = ({ title, subtitle, style }) => {
  const theme = THEMES[style];
  const { frame, fps, t, width, enter, exit } = useChapter();
  return (
    <AbsoluteFill style={{ backgroundColor: "#04070d" }}>
      <Stage theme={theme} cameraZ={interpolate(t, [0, 4], [-120, 40])} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", opacity: enter }}>
        <div style={{ marginBottom: width * 0.016, filter: `drop-shadow(0 0 22px ${theme.glow})`, opacity: enter }}>
          <Football size={width * 0.05} spin={frame * 7} theme={theme} />
        </div>
        {title.map((row, i) => {
          const s = spring({ frame: frame - 6 - i * 5, fps, config: { damping: 15, stiffness: 140 } });
          return (
            <div
              key={i}
              style={{
                fontFamily: DISPLAY,
                fontSize: width * (title.length > 1 ? 0.072 : 0.086),
                lineHeight: 1.04,
                color: i === title.length - 1 ? GREEN : "#FFFFFF",
                letterSpacing: width * 0.003,
                opacity: s,
                transform: `translateY(${(1 - s) * 34}px)`,
                filter: `blur(${(1 - s) * 10}px)`,
                textShadow: `0 0 54px ${theme.glow}`,
                textAlign: "center",
              }}
            >
              {row}
            </div>
          );
        })}
        <div
          style={{
            height: 3,
            width: width * 0.3 * interpolate(t, [0.45, 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            marginTop: 20,
            background: `linear-gradient(90deg, transparent, ${theme.metal}, ${GREEN}, transparent)`,
            boxShadow: `0 0 22px ${theme.glow}`,
          }}
        />
        {subtitle && (
          <div
            style={{
              marginTop: 22,
              maxWidth: width * 0.62,
              textAlign: "center",
              fontFamily: UI,
              fontWeight: 500,
              fontSize: width * 0.019,
              letterSpacing: width * 0.004,
              color: "rgba(234,244,255,0.8)",
              opacity: spring({ frame: frame - 20, fps, config: { damping: 18 } }),
            }}
          >
            {subtitle}
          </div>
        )}
      </AbsoluteFill>
      <Fade opacity={exit} />
    </AbsoluteFill>
  );
};

export type CategoryProps = { title: string; count: string; style: Style };

// Position headings: the category name, then how many players are coming.
export const CategoryCard: React.FC<CategoryProps> = ({ title, count, style }) => {
  const theme = THEMES[style];
  const { frame, fps, t, width, enter, exit } = useChapter();
  const letters = title.split("");
  const size = Math.min(width * 0.1, (width * 0.86) / Math.max(letters.length, 1) / 0.56);
  const countP = spring({ frame: frame - 14, fps, config: { damping: 17 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#04070d" }}>
      <Stage theme={theme} cameraZ={interpolate(t, [0, 4], [-80, 50])} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", opacity: enter }}>
        <div style={{ display: "flex", alignItems: "center", gap: width * 0.014, marginBottom: width * 0.012 }}>
          <Football size={width * 0.036} spin={frame * 9} theme={theme} />
          <span style={{ fontFamily: UI, fontWeight: 700, fontSize: width * 0.016, letterSpacing: width * 0.008, color: theme.metal }}>
            POSITION CATEGORY
          </span>
        </div>
        <div style={{ display: "flex" }}>
          {letters.map((ch, i) => {
            const s = spring({ frame: frame - 5 - i, fps, config: { damping: 14, stiffness: 180 } });
            return (
              <span
                key={i}
                style={{
                  fontFamily: DISPLAY,
                  fontSize: size,
                  lineHeight: 1,
                  whiteSpace: "pre",
                  color: "#FFFFFF",
                  opacity: s,
                  transform: `translateY(${(1 - s) * 30}px)`,
                  filter: `blur(${(1 - s) * 9}px)`,
                  textShadow: `0 0 50px ${theme.glow}`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            height: 3,
            width: width * 0.26 * interpolate(t, [0.4, 0.95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            marginTop: 18,
            background: `linear-gradient(90deg, transparent, ${theme.metal}, ${GREEN}, transparent)`,
            boxShadow: `0 0 20px ${theme.glow}`,
          }}
        />
        <div
          style={{
            marginTop: 20,
            fontFamily: DISPLAY,
            fontSize: width * 0.034,
            letterSpacing: width * 0.004,
            color: GREEN,
            opacity: countP,
            transform: `translateY(${(1 - countP) * 18}px)`,
            textShadow: `0 0 36px ${theme.glow}`,
          }}
        >
          {count}
        </div>
      </AbsoluteFill>
      <Fade opacity={exit} />
    </AbsoluteFill>
  );
};

export type LineupProps = { title: string; cards: string[]; sizes: [number, number][]; names: string[]; style: Style };

// The four icon players shown together once, before they are auctioned one by one.
export const IconLineup: React.FC<LineupProps> = ({ title, cards, sizes, names, style }) => {
  const theme = THEMES[style];
  const { frame, fps, t, width, height, exit } = useChapter();
  const titleP = spring({ frame: frame - 2, fps, config: { damping: 17 } });
  const cardH = height * 0.52;

  return (
    <AbsoluteFill style={{ backgroundColor: "#04070d" }}>
      <Stage theme={theme} cameraZ={interpolate(t, [0, 6], [-100, 70])} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: width * 0.012,
            opacity: titleP,
            transform: `translateY(${(1 - titleP) * -24}px)`,
            marginBottom: height * 0.035,
          }}
        >
          <Football size={width * 0.034} spin={frame * 9} theme={theme} />
          <span style={{ fontFamily: DISPLAY, fontSize: width * 0.05, color: "#FFFFFF", textShadow: `0 0 50px ${theme.glow}` }}>
            {title}
          </span>
        </div>
        <div style={{ display: "flex", gap: width * 0.018, alignItems: "flex-end", perspective: width }}>
          {cards.map((card, i) => {
            const s = spring({ frame: frame - Math.round((1.5 + i * 0.5) * fps), fps, config: { damping: 14, stiffness: 120 } });
            const aspect = sizes[i][0] / sizes[i][1];
            return (
              <div key={card} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.018 }}>
                <div
                  style={{
                    width: cardH * aspect,
                    height: cardH,
                    borderRadius: 12,
                    overflow: "hidden",
                    opacity: s,
                    transform: `translateY(${(1 - s) * 60}px) rotateY(${(1 - s) * -70}deg) scale(${0.8 + 0.2 * s})`,
                    boxShadow: `0 0 0 2px ${theme.metal}, 0 0 46px ${theme.glow}, 0 26px 60px rgba(0,0,0,0.7)`,
                  }}
                >
                  <Img src={staticFile(`cards/${card}.png`)} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
                </div>
                <span
                  style={{
                    fontFamily: UI,
                    fontWeight: 700,
                    fontSize: width * 0.0155,
                    letterSpacing: width * 0.002,
                    color: theme.metal,
                    opacity: Math.max(0, s * 1.4 - 0.5),
                  }}
                >
                  {`0${i + 1}  ${names[i]}`}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Fade opacity={exit} />
    </AbsoluteFill>
  );
};
