import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandIntro } from "./components/BrandIntro";
import { Card } from "./components/Card";
import { Hero } from "./components/Hero";
import { Signature } from "./components/Signature";
import { Stage } from "./components/Stage";
import { Player, THEMES } from "./theme";
import "./fonts";

export type RevealProps = { player: Player };

// One continuous 10-second shot: a single camera moves through the five acts, so the
// brand intro, the reveal and the signature read as one take rather than five clips.
export const Reveal: React.FC<RevealProps> = ({ player }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const theme = THEMES[player.is_icon ? "icon" : "regular"];

  const ease = Easing.bezier(0.4, 0, 0.2, 1);
  const camZ = interpolate(t, [0, 1.5, 3.0, 5.0, 8.0, 10.0], [-300, -120, 150, 70, 10, -240], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const camX = interpolate(t, [0, 3.0, 5.0, 8.0, 10.0], [0, -40, 30, 0, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const camRot = interpolate(t, [0, 3.0, 5.0, 8.0, 10.0], [0, 1.4, -0.9, 0, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#04070d" }}>
      <Stage theme={theme} cameraZ={camZ} />
      <AbsoluteFill style={{ perspective: width * 0.85, perspectiveOrigin: "50% 46%" }}>
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transform: `translate3d(${camX}px, 0px, ${camZ}px) rotateY(${camRot}deg)`,
          }}
        >
          <Card card={player.card} aspect={player.aspect} theme={theme} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Hero player={player} theme={theme} />
      <BrandIntro theme={theme} />
      <Signature theme={theme} />
    </AbsoluteFill>
  );
};
