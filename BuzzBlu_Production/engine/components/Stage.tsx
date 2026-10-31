import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ACT, Theme, sec } from "../theme";

// The stadium the whole reveal lives in: dark bowl, rig of spotlights that snap on
// during the build-up, volumetric beams, drifting smoke and a reflective floor.
// Everything reacts to one `lights` value so the environment feels like one place.
export const Stage: React.FC<{ theme: Theme; cameraZ: number }> = ({ theme, cameraZ }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;

  // Lights come up in three steps across the build-up, matching the three ticks in the mix.
  const lights = interpolate(t, [ACT.build[0], 1.62, 1.74, 2.4], [0, 0.45, 0.78, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // Two bursts of extra brightness: the card impact and the final signature.
  const flash =
    interpolate(t, [2.98, 3.06, 3.55], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) +
    interpolate(t, [7.98, 8.06, 8.6], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const horizon = height * 0.62;

  return (
    <AbsoluteFill style={{ backgroundColor: "#04070d", overflow: "hidden" }}>
      {/* Back of the bowl: bokeh stand lights, dim until the rig comes up. */}
      <img
        src={staticFile("textures/crowd.png")}
        style={{
          position: "absolute",
          left: "-10%",
          width: "120%",
          top: horizon - height * 0.46,
          height: height * 0.5,
          objectFit: "cover",
          opacity: 0.16 + lights * 0.62,
          filter: `blur(${9 - lights * 3}px) saturate(${0.6 + lights * 0.6})`,
          transform: `translateY(${cameraZ * 0.02}px) scale(${1 + cameraZ * 0.00004})`,
        }}
      />
      {/* Stadium bowl: dark tiers framing the back of the arena. */}
      {[0.30, 0.42, 0.54].map((k, i) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: `${-30 + i * 4}%`,
            width: `${160 - i * 8}%`,
            top: horizon - height * (0.62 - i * 0.07),
            height: height * 0.3,
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
            border: `1px solid ${theme.metalDim}`,
            borderBottom: "none",
            opacity: (0.1 + lights * 0.25) * (1 - i * 0.2),
            boxShadow: `inset 0 ${height * 0.05}px ${height * 0.08}px rgba(0,0,0,0.8)`,
          }}
        />
      ))}
      {/* Overhead rig: narrow shafts of light raking down into the haze. */}
      {[-0.36, -0.13, 0.13, 0.36].map((x, i) => {
        const on = interpolate(lights, [i * 0.18, i * 0.18 + 0.4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const sway = Math.sin(t * 0.5 + i) * 1.1;
        return (
          <div key={i} style={{ position: "absolute", left: width * (0.5 + x), top: -height * 0.05 }}>
            <div
              style={{
                position: "absolute",
                left: -width * 0.055,
                width: width * 0.11,
                height: height * 0.95,
                transform: `rotate(${x * 20 + sway}deg)`,
                transformOrigin: "50% 0%",
                background: `linear-gradient(to bottom, ${theme.light}, rgba(255,255,255,0) 78%)`,
                maskImage:
                  "linear-gradient(to right, transparent, black 42%, black 58%, transparent), linear-gradient(to bottom, black 10%, transparent 85%)",
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
                opacity: on * (0.17 + flash * 0.16),
                filter: "blur(14px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -16,
                top: 0,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: theme.light,
                boxShadow: `0 0 ${44 + flash * 90}px ${16 + flash * 26}px ${theme.glow}`,
                opacity: on * 0.95,
              }}
            />
          </div>
        );
      })}
      {/* Pool of light on the floor where the card lands. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: horizon - height * 0.05,
          width: width * 0.62,
          height: height * 0.3,
          transform: "translateX(-50%)",
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${theme.glow}, rgba(0,0,0,0) 70%)`,
          opacity: lights * (0.22 + flash * 0.4),
          filter: "blur(40px)",
        }}
      />
      {/* Reflective floor: perspective grid fading into the dark. */}
      <div
        style={{
          position: "absolute",
          left: "-60%",
          right: "-60%",
          top: horizon,
          height: height * 0.9,
          transform: "perspective(900px) rotateX(74deg)",
          transformOrigin: "50% 0%",
          backgroundImage: `linear-gradient(to right, ${theme.metal}66 2px, transparent 1px),
                            linear-gradient(to bottom, ${theme.metal}66 2px, transparent 1px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `${-t * 10}px ${t * 26}px`,
          opacity: 0.3 + lights * 0.7,
          maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: horizon - 2,
          height: 3,
          background: `linear-gradient(to right, transparent, ${theme.rim}, transparent)`,
          opacity: lights * (0.5 + flash * 0.5),
          filter: "blur(1px)",
        }}
      />
      {/* Ground haze and two smoke sheets drifting at different speeds for depth. */}
      <img
        src={staticFile("textures/haze.png")}
        style={{
          position: "absolute",
          left: `${-10 - t * 1.4}%`,
          width: "150%",
          top: horizon - height * 0.2,
          height: height * 0.4,
          opacity: (0.1 + lights * 0.3) * 0.9,
          mixBlendMode: "screen",
        }}
      />
      <img
        src={staticFile("textures/smoke.png")}
        style={{
          position: "absolute",
          left: `${-20 + Math.sin(t * 0.22) * 4 - t * 2.2}%`,
          width: "170%",
          top: horizon - height * 0.58,
          height: height * 0.8,
          opacity: (0.05 + lights * 0.14) * (1 + flash * 0.8),
          mixBlendMode: "screen",
          filter: "blur(2px)",
        }}
      />
      <img
        src={staticFile("textures/smoke.png")}
        style={{
          position: "absolute",
          left: `${-5 + t * 3.4}%`,
          width: "190%",
          top: horizon - height * 0.34,
          height: height * 0.62,
          opacity: (0.04 + lights * 0.1) * (1 + flash),
          mixBlendMode: "screen",
          transform: "scaleX(-1)",
          filter: "blur(6px)",
        }}
      />
      {/* Impact wash, then vignette and grain to bind it together. */}
      <AbsoluteFill style={{ backgroundColor: theme.metalBright, opacity: flash * 0.1 }} />
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse 62% 58% at 50% 46%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.72) 100%)" }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("textures/grain.png")})`,
          backgroundSize: "512px 512px",
          backgroundPosition: `${(frame * 37) % 512}px ${(frame * 53) % 512}px`,
          opacity: 0.045,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
