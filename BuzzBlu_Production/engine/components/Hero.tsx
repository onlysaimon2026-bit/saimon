import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, UI } from "../fonts";
import { GREEN, Subject, Theme } from "../theme";

// 5.0-8.0s. The card has slid left; the subject's details build on the right, taken
// verbatim from their slide. Players show position, base price and auction order.
// Team leaders show their team instead, set larger, and carry no price.
export const Hero: React.FC<{ subject: Subject; theme: Theme }> = ({ subject, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  if (t < 4.75 || t > 8.05) return null;

  const leader = subject.style === "leader";
  const show = (at: number, damping = 16) =>
    spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness: 150 } });
  const out = interpolate(t, [7.72, 8.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const kickerP = show(4.9);
  const ruleP = show(5.05, 20);
  const detailP = show(5.65);
  const priceP = show(6.05, 13);
  const orderP = show(6.45);
  const words = subject.name.split(" ");
  // Long names step down a size so they always fit beside the card.
  const nameSize = width * (subject.name.length > 17 ? 0.052 : subject.name.length > 12 ? 0.064 : 0.078);
  const detailSize = leader ? width * 0.042 : width * 0.026;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        paddingLeft: width * 0.52,
        paddingRight: width * 0.05,
        opacity: 1 - out,
        transform: `translateX(${out * 90}px)`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: height * 0.012 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: kickerP, transform: `translateX(${(1 - kickerP) * -40}px)` }}>
          <div style={{ width: 10, height: 10, transform: "rotate(45deg)", background: theme.accent, boxShadow: `0 0 16px ${theme.glow}` }} />
          <span style={{ fontFamily: UI, fontWeight: 700, fontSize: width * 0.0165, letterSpacing: width * 0.006, color: theme.accent }}>
            {subject.kicker}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.95 }}>
          {words.map((w, i) => {
            const s = show(5.15 + i * 0.1, 15);
            return (
              <span
                key={i}
                style={{
                  fontFamily: DISPLAY,
                  fontSize: nameSize,
                  color: "#FFFFFF",
                  letterSpacing: nameSize * 0.015,
                  opacity: s,
                  transform: `translateX(${(1 - s) * -60}px)`,
                  filter: `blur(${(1 - s) * 10}px)`,
                  textShadow: `0 0 60px ${theme.glow}, 0 8px 30px rgba(0,0,0,0.6)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>

        <div
          style={{
            height: 3,
            width: width * 0.3 * ruleP,
            background: `linear-gradient(90deg, ${theme.metal}, ${theme.accent}, transparent)`,
            boxShadow: `0 0 18px ${theme.glow}`,
            marginTop: height * 0.008,
          }}
        />

        <div
          style={{
            marginTop: height * 0.014,
            fontFamily: leader ? DISPLAY : UI,
            fontWeight: 700,
            fontSize: detailSize,
            letterSpacing: detailSize * (leader ? 0.03 : 0.14),
            color: leader ? theme.accent : GREEN,
            opacity: detailP,
            transform: `translateX(${(1 - detailP) * -40}px)`,
            textShadow: leader ? `0 0 42px ${theme.glow}` : "none",
          }}
        >
          {subject.detail}
        </div>

        {!leader && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: width * 0.035, marginTop: height * 0.035 }}>
            <div style={{ opacity: priceP, transform: `translateY(${(1 - priceP) * 26}px)` }}>
              <div style={{ fontFamily: UI, fontWeight: 500, fontSize: width * 0.0135, letterSpacing: width * 0.005, color: "rgba(226,238,252,0.72)" }}>
                BASE PRICE
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: width * 0.055, lineHeight: 1.05, color: theme.metal, textShadow: `0 0 36px ${theme.glow}` }}>
                {subject.price}
              </div>
            </div>
            <div
              style={{
                opacity: orderP,
                transform: `translateY(${(1 - orderP) * 20}px)`,
                padding: `${height * 0.009}px ${width * 0.016}px`,
                border: `1px solid ${theme.metal}88`,
                borderRadius: 6,
                background: "rgba(8,12,20,0.55)",
                fontFamily: UI,
                fontWeight: 500,
                fontSize: width * 0.016,
                letterSpacing: width * 0.003,
                color: "rgba(234,244,255,0.9)",
                marginBottom: height * 0.012,
              }}
            >
              {subject.order.replace("/", " / ")}
            </div>
          </div>
        )}

        {leader && (
          <div
            style={{
              marginTop: height * 0.03,
              opacity: priceP,
              transform: `translateY(${(1 - priceP) * 22}px)`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ width: width * 0.05, height: 2, background: theme.metal, opacity: 0.6 }} />
            <span style={{ fontFamily: UI, fontWeight: 500, fontSize: width * 0.015, letterSpacing: width * 0.005, color: "rgba(226,238,252,0.75)" }}>
              {subject.order.replace("/", " / ")}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
