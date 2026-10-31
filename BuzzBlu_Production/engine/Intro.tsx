import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Football } from "./components/Football";
import { Stage } from "./components/Stage";
import { DISPLAY, UI } from "./fonts";
import { GREEN, THEMES } from "./theme";
import "./fonts";

export type IntroLine = { text: string; at: number; seconds: number };
export type IntroProps = {
  lines: IntroLine[];
  /** Every player card, for the wall behind "40 players". */
  cards: string[];
  cardSizes: [number, number][];
  /** The four leaders and their teams. */
  leaders: { card: string; size: [number, number]; name: string; team: string }[];
};

const theme = THEMES.icon;

const ease = Easing.bezier(0.33, 0, 0.15, 1);
const ramp = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
const window_ = (t: number, a: number, b: number, fade = 0.45) =>
  Math.min(ramp(t, a, a + fade), 1 - ramp(t, b - fade, b));

// The opening announcement. Each act is cut to a line of the voiceover, so the picture
// always lands on the word being spoken.
export const Intro: React.FC<IntroProps> = ({ lines, cards, cardSizes, leaders }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const at = (i: number) => lines[i]?.at ?? 0;

  // One slow move through the whole piece, pushing in as the stakes rise.
  const camZ = interpolate(t, [0, at(2), at(5), at(8), at(12), at(13), durationInFrames / fps],
    [-420, -180, -40, -120, 40, 180, 320],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  // Which acts own the frame. When none does, the words themselves become the picture.
  const artAt = (x: number) =>
    (x > at(2) - 0.3 && x < at(4)) || (x > at(3) - 0.2 && x < at(5) - 0.15) ||
    (x > at(5) - 0.2 && x < at(8) - 0.2) || (x > at(10) - 0.2 && x < at(12) - 0.25) ||
    (x > at(12) - 0.25);

  const flash =
    ramp(t, at(13) - 0.12, at(13)) * (1 - ramp(t, at(13), at(13) + 0.7)) * 0.85 +
    ramp(t, at(2) - 0.1, at(2)) * (1 - ramp(t, at(2), at(2) + 0.4)) * 0.25;
  const blackout = ramp(t, durationInFrames / fps - 0.8, durationInFrames / fps - 0.1);

  return (
    <AbsoluteFill style={{ backgroundColor: "#04070d" }}>
      <Stage theme={theme} cameraZ={camZ} />

      {/* "40 PLAYERS. COUNTLESS AMBITIONS." — the whole auction sweeping past. */}
      <CardWall cards={cards} sizes={cardSizes} t={t} from={at(2) - 0.3} to={at(4)} />

      {/* "HELLO, LEADERS!" / "WELCOME…" — the four who will build the teams. */}
      <LeaderSweep leaders={leaders} t={t} from={at(3) - 0.2} to={at(5) - 0.15} />

      {/* "THINK SMART. STRATEGIZE." — a board being drawn on. */}
      <Tactics t={t} from={at(5) - 0.2} to={at(8) - 0.2} />

      {/* "SUPPORTERS, THE CHOICE IS YOURS." — the four teams. */}
      <Teams teams={leaders.map((l) => l.team)} t={t} from={at(10) - 0.2} to={at(12) - 0.25} />

      {/* "THIS IS BUZZBLU 2026." — the lockup, held through the closing line. */}
      <Lockup t={t} from={at(12) - 0.25} to={durationInFrames / fps - 0.2} frame={frame} />

      {/* The ball carries the quiet beats where nothing else is on screen. */}
      <BallMoment t={t} from={0} to={at(2) - 0.4} drift={1} />
      <BallMoment t={t} from={at(8) - 0.3} to={at(10) - 0.3} drift={-1} />

      <Lines lines={lines} t={t} hasArt={artAt} />

      <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: flash * 0.5 }} />
      <AbsoluteFill style={{ backgroundColor: "#04070d", opacity: blackout }} />
    </AbsoluteFill>
  );
};

// Spoken lines as kinetic type. Word by word, low in frame, out of the way of the art.
const Lines: React.FC<{ lines: IntroLine[]; t: number; hasArt: (x: number) => boolean }> = ({ lines, t, hasArt }) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  // The line currently being spoken: the last one whose cue has passed.
  const active = [...lines].reverse().find((l) => t >= l.at - 0.22);
  if (!active) return null;
  const end = active.at + active.seconds + 0.3;
  if (t > end) return null;

  const words = active.text.split(" ");
  const per = active.seconds / Math.max(words.length, 1);
  const out = 1 - ramp(t, end - 0.28, end);
  const art = hasArt(t);
  // Without art the words carry the frame, so they are set large and centred.
  const size = art
    ? width * (active.text.length <= 18 ? 0.05 : 0.04)
    : width * (active.text.length <= 18 ? 0.098 : active.text.length <= 26 ? 0.078 : 0.062);

  return (
    <AbsoluteFill
      style={{
        justifyContent: art ? "flex-end" : "center",
        alignItems: "center",
        paddingBottom: art ? height * 0.11 : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: width * 0.88,
          columnGap: width * 0.016,
          opacity: out,
        }}
      >
        {words.map((w, i) => {
          const s = spring({
            frame: frame - Math.round((active.at - 0.1 + i * per * 0.75) * fps),
            fps,
            config: { damping: 14, stiffness: 190 },
          });
          return (
            <span
              key={i}
              style={{
                fontFamily: DISPLAY,
                fontSize: size,
                lineHeight: 1.1,
                color: "#FFFFFF",
                letterSpacing: width * 0.0015,
                opacity: s,
                transform: `translateY(${(1 - s) * 26}px) scale(${1.18 - 0.18 * s})`,
                filter: `blur(${(1 - s) * 9}px)`,
                textShadow: `0 0 46px ${theme.glow}, 0 6px 24px rgba(0,0,0,0.75)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: height * 0.028,
          height: art ? 2 : 4,
          width: width * (art ? 0.18 : 0.3) * out,
          background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`,
          opacity: 0.8,
        }}
      />
    </AbsoluteFill>
  );
};

// The ball crossing frame, so the quiet beats still move.
const BallMoment: React.FC<{ t: number; from: number; to: number; drift: number }> = ({ t, from, to, drift }) => {
  const { width, height } = useVideoConfig();
  const vis = window_(t, from, to, 0.6);
  if (vis <= 0.001) return null;
  const p = (t - from) / (to - from);
  const size = width * 0.17;
  return (
    <AbsoluteFill style={{ opacity: vis * 0.5 }}>
      <div
        style={{
          position: "absolute",
          left: interpolate(p, [0, 1], drift > 0 ? [-size, width + size] : [width + size, -size]),
          top: height * 0.4,
          filter: `blur(2px) drop-shadow(0 0 40px ${theme.glow})`,
        }}
      >
        <Football size={size} spin={p * 720 * drift} theme={theme} glow={1.6} />
      </div>
    </AbsoluteFill>
  );
};

// Forty cards streaming past in three lanes, too fast to read but clearly a full auction.
const CardWall: React.FC<{ cards: string[]; sizes: [number, number][]; t: number; from: number; to: number }> = ({
  cards,
  sizes,
  t,
  from,
  to,
}) => {
  const { width, height } = useVideoConfig();
  const vis = window_(t, from, to, 0.5);
  if (vis <= 0.001) return null;
  const p = (t - from) / (to - from);
  const lanes = [0, 1, 2].map((l) => cards.filter((_, i) => i % 3 === l));
  const cardH = height * 0.3;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: vis, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: height * 0.022, transform: "rotate(-7deg) scale(1.25)" }}>
        {lanes.map((lane, l) => (
          <div
            key={l}
            style={{
              display: "flex",
              gap: width * 0.012,
              transform: `translateX(${(l % 2 ? 1 : -1) * (p - 0.5) * width * 1.5}px)`,
            }}
          >
            {lane.map((card) => {
              const i = cards.indexOf(card);
              const aspect = sizes[i][0] / sizes[i][1];
              return (
                <Img
                  key={card}
                  src={staticFile(`cards/${card}.png`)}
                  style={{
                    width: cardH * aspect,
                    height: cardH,
                    flexShrink: 0,
                    borderRadius: 8,
                    objectFit: "fill",
                    opacity: 0.55,
                    boxShadow: `0 0 0 1px ${theme.metal}66, 0 14px 40px rgba(0,0,0,0.7)`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(4,7,13,0.35), rgba(4,7,13,0.92) 75%)" }}
      />
    </AbsoluteFill>
  );
};

// The four leaders, each sliding through the centre in turn.
const LeaderSweep: React.FC<{ leaders: IntroProps["leaders"]; t: number; from: number; to: number }> = ({
  leaders,
  t,
  from,
  to,
}) => {
  const { width, height } = useVideoConfig();
  const vis = window_(t, from, to, 0.4);
  if (vis <= 0.001) return null;
  const span = (to - from) / leaders.length;
  const cardH = height * 0.56;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: vis }}>
      {leaders.map((l, i) => {
        const local = (t - from - i * span) / span;
        if (local < -0.1 || local > 1.1) return null;
        const aspect = l.size[0] / l.size[1];
        const x = interpolate(local, [0, 1], [width * 0.4, -width * 0.4]);
        const fade = Math.min(ramp(local, 0, 0.18), 1 - ramp(local, 0.78, 1));
        return (
          <div
            key={l.card}
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: height * 0.02,
              transform: `translateX(${x}px) rotateY(${local * 16 - 8}deg)`,
              opacity: fade,
            }}
          >
            <Img
              src={staticFile(`cards/${l.card}.png`)}
              style={{
                width: cardH * aspect,
                height: cardH,
                borderRadius: 12,
                objectFit: "fill",
                boxShadow: `0 0 0 2px ${theme.metal}, 0 0 50px ${theme.glow}, 0 24px 60px rgba(0,0,0,0.75)`,
              }}
            />
            <span style={{ fontFamily: UI, fontWeight: 700, fontSize: width * 0.018, letterSpacing: width * 0.004, color: theme.metal }}>
              {l.name}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// A tactics board: the shape of a side being drawn, then runs played out on it.
const Tactics: React.FC<{ t: number; from: number; to: number }> = ({ t, from, to }) => {
  const { width, height } = useVideoConfig();
  const vis = window_(t, from, to, 0.45);
  if (vis <= 0.001) return null;
  const p = (t - from) / (to - from);
  // An 8-a-side shape, which is what this tournament plays.
  const spots: [number, number][] = [
    [0.5, 0.86], [0.26, 0.68], [0.5, 0.7], [0.74, 0.68],
    [0.32, 0.46], [0.68, 0.46], [0.5, 0.3], [0.5, 0.14],
  ];
  const runs: [number, number, number, number][] = [
    [0.32, 0.46, 0.26, 0.2], [0.68, 0.46, 0.74, 0.2], [0.5, 0.3, 0.5, 0.1],
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: vis }}>
      <svg width={width * 0.34} height={height * 0.72} viewBox="0 0 100 100"
           style={{ overflow: "visible", filter: `drop-shadow(0 0 26px ${theme.glow})` }}>
        <rect x="2" y="2" width="96" height="96" rx="2" fill="rgba(8,14,10,0.45)" stroke={theme.metal} strokeWidth="1.1"
              pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ramp(p, 0, 0.25)} />
        <line x1="2" y1="50" x2="98" y2="50" stroke={`${theme.metal}99`} strokeWidth="0.9" opacity={ramp(p, 0.1, 0.3)} />
        <circle cx="50" cy="50" r="13" fill="none" stroke={`${theme.metal}99`} strokeWidth="0.9" opacity={ramp(p, 0.1, 0.3)} />
        <rect x="32" y="2" width="36" height="14" fill="none" stroke={`${theme.metal}77`} strokeWidth="0.8" opacity={ramp(p, 0.12, 0.32)} />
        <rect x="32" y="84" width="36" height="14" fill="none" stroke={`${theme.metal}77`} strokeWidth="0.8" opacity={ramp(p, 0.12, 0.32)} />
        {runs.map(([x1, y1, x2, y2], i) => {
          const draw = ramp(p, 0.5 + i * 0.1, 0.78 + i * 0.1);
          return (
            <path key={i} d={`M${x1 * 100} ${y1 * 100} Q ${(x1 + x2) * 50 + 8} ${(y1 + y2) * 50} ${x2 * 100} ${y2 * 100}`}
                  fill="none" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2"
                  pathLength={1} strokeDashoffset={1 - draw} opacity={0.9}
                  style={{ filter: `drop-shadow(0 0 3px ${GREEN})` }} />
          );
        })}
        {spots.map(([x, y], i) => {
          const s = ramp(p, 0.18 + i * 0.045, 0.34 + i * 0.045);
          return (
            <g key={i} opacity={s}>
              <circle cx={x * 100} cy={y * 100} r={3.4 * s} fill={theme.metal}
                      style={{ filter: `drop-shadow(0 0 6px ${theme.glow})` }} />
              <circle cx={x * 100} cy={y * 100} r={6.8 * s} fill="none" stroke={`${theme.metal}88`} strokeWidth="0.7" />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// The four team names, arriving one after another.
const Teams: React.FC<{ teams: string[]; t: number; from: number; to: number }> = ({ teams, t, from, to }) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const vis = window_(t, from, to, 0.4);
  if (vis <= 0.001) return null;
  const step = (to - from - 0.9) / teams.length;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: vis }}>
      <div style={{ display: "flex", flexDirection: "column", gap: height * 0.035, alignItems: "center" }}>
        {teams.map((team, i) => {
          const s = spring({ frame: frame - Math.round((from + 0.25 + i * step) * fps), fps, config: { damping: 15, stiffness: 150 } });
          return (
            <div key={team} style={{ display: "flex", alignItems: "center", gap: width * 0.016, opacity: s, transform: `translateX(${(1 - s) * (i % 2 ? 70 : -70)}px)` }}>
              <div style={{ width: width * 0.004, height: width * 0.028, background: i % 2 ? GREEN : theme.metal, boxShadow: `0 0 14px ${theme.glow}` }} />
              <span style={{ fontFamily: DISPLAY, fontSize: width * 0.047, color: "#FFFFFF", letterSpacing: width * 0.002, textShadow: `0 0 38px ${theme.glow}` }}>
                {team}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// The closing lockup: ball, wordmark, year.
const Lockup: React.FC<{ t: number; from: number; to: number; frame: number }> = ({ t, from, to, frame }) => {
  const { width, height } = useVideoConfig();
  const vis = window_(t, from, to, 0.4);
  if (vis <= 0.001) return null;
  const p = ramp(t, from, from + 0.7);
  const ring = ramp(t, from + 0.1, from + 1.1);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", opacity: vis }}>
      <div
        style={{
          position: "absolute",
          width: width * 0.8 * ring,
          height: width * 0.8 * ring,
          borderRadius: "50%",
          border: `2px solid ${theme.metal}`,
          opacity: (1 - ring) * 0.5,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: width * 0.014, transform: `scale(${0.86 + 0.14 * p})` }}>
        <div style={{ filter: `drop-shadow(0 0 26px ${theme.glow})` }}>
          <Football size={width * 0.072} spin={frame * 6} theme={theme} />
        </div>
        {"BUZZBLU".split("").map((ch, i) => (
          <span
            key={i}
            style={{
              fontFamily: DISPLAY,
              fontSize: width * 0.112,
              lineHeight: 1,
              marginLeft: i ? -width * 0.002 : 0,
              color: i < 4 ? "#FFFFFF" : GREEN,
              opacity: ramp(t, from + i * 0.045, from + 0.3 + i * 0.045),
              textShadow: `0 0 60px ${theme.glow}`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div
        style={{
          marginTop: height * 0.03,
          fontFamily: UI,
          fontWeight: 700,
          fontSize: width * 0.024,
          letterSpacing: width * 0.016,
          color: theme.metal,
          opacity: ramp(t, from + 0.5, from + 1.0),
        }}
      >
        PLAYER AUCTION 2026
      </div>
    </AbsoluteFill>
  );
};
