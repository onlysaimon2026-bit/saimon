import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandIntro } from "./components/BrandIntro";
import { Card } from "./components/Card";
import { Hero } from "./components/Hero";
import { Signature } from "./components/Signature";
import { Stage } from "./components/Stage";
import { Subject, THEMES } from "./theme";
import "./fonts";

export type RevealProps = { subject: Subject };

// One continuous 10-second shot: a single camera moves through the five acts, so the
// brand intro, the reveal and the signature read as one take rather than five clips.
export const Reveal: React.FC<RevealProps> = ({ subject }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const theme = THEMES[subject.style];
  const leader = subject.style === "leader";

  const ease = Easing.bezier(0.4, 0, 0.2, 1);
  // Leaders get a slower, grander move through the same beats.
  const scale = leader ? 1.18 : 1;
  const camZ = interpolate(t, [0, 1.5, 3.0, 5.0, 8.0, 10.0],
    [-300 * scale, -120, 110, 55, 10, -240 * scale],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const camX = interpolate(t, [0, 3.0, 5.0, 8.0, 10.0], [0, -40, 30, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const camRot = interpolate(t, [0, 3.0, 5.0, 8.0, 10.0],
    [0, 1.4 * scale, -0.9 * scale, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

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
          <Card card={subject.card} aspect={subject.aspect} theme={theme} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Hero subject={subject} theme={theme} />
      <BrandIntro theme={theme} subtitle={subject.category} />
      <Signature theme={theme} subtitle={subject.category} />
    </AbsoluteFill>
  );
};
