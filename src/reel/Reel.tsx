import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "./Camera";
import { Captions } from "./Captions";
import { GraphicView } from "./Graphics";
import { FaceTrack, ReelPlan } from "./types";
import "../fonts";

export type ReelProps = { src: string; sourceSeconds: number; face: FaceTrack; plan: ReelPlan };

export const Reel: React.FC<ReelProps> = ({ src, sourceSeconds, face, plan }) => {
  const { fps } = useVideoConfig();
  // Captions step aside while a graphic that lives in the caption band is on screen.
  const captionHidden = (t: number) =>
    plan.graphics.some((g) => g.type === "label" && t >= g.at && t < g.at + g.duration);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Camera src={src} face={face} keys={plan.camera} sourceSeconds={sourceSeconds} />
      <Grade />
      {plan.graphics.map((g, i) => (
        <Sequence key={i} from={Math.round(g.at * fps)} durationInFrames={Math.round(g.duration * fps)}>
          <GraphicView g={g} accent={plan.accent} />
        </Sequence>
      ))}
      <Captions lines={plan.captions} accent={plan.accent} hidden={captionHidden} />
      {plan.sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s.t * fps))} layout="none">
          <Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.volume} />
        </Sequence>
      ))}
      <FadeOut />
    </AbsoluteFill>
  );
};

// Soft vignette for depth; keeps the face area untouched.
const Grade: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 42%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.38) 100%)" }} />
);

const FadeOut: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const o = interpolate(frame, [durationInFrames - Math.round(0.35 * fps), durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ backgroundColor: "black", opacity: o }} />;
};
