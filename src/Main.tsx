import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { MotionConfig } from "./config";
import { Intro } from "./components/Intro";
import { Footage } from "./components/Footage";
import { LowerThirdView } from "./components/LowerThird";
import { CalloutView } from "./components/Callout";
import { Captions } from "./components/Captions";
import { CutFx } from "./components/CutFx";
import { ProgressBar } from "./components/ProgressBar";
import { Outro } from "./components/Outro";
import { Overlay } from "./components/Overlay";

export type MainProps = {
  src: string;
  videoSeconds: number;
  width: number;
  height: number;
  config: MotionConfig;
};

export const Main: React.FC<MainProps> = ({ src, videoSeconds, config }) => {
  const { fps } = useVideoConfig();
  const intro = Math.round(config.introSeconds * fps);
  const body = Math.round(videoSeconds * fps);
  const outro = Math.round(config.outroSeconds * fps);
  // Overlap intro/outro with the footage so they blend instead of hard-cutting.
  const blend = Math.round(0.6 * fps);
  const bodyStart = intro - blend;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05060a" }}>
      <Sequence from={bodyStart} durationInFrames={body}>
        <Footage src={src} config={config} />
        {config.cuts.map((t) => (
          <Sequence key={t} from={Math.round(t * fps) - 4} durationInFrames={14} layout="none">
            <CutFx config={config} />
          </Sequence>
        ))}
        {config.lowerThirds.map((l, i) => (
          <Sequence key={i} from={Math.round(l.at * fps)} durationInFrames={Math.round(l.duration * fps)}>
            <LowerThirdView item={l} config={config} />
          </Sequence>
        ))}
        {config.callouts.map((c, i) => (
          <Sequence key={i} from={Math.round(c.at * fps)} durationInFrames={Math.round(c.duration * fps)}>
            <CalloutView item={c} config={config} />
          </Sequence>
        ))}
        <Captions captions={config.captions} config={config} />
        {config.showProgressBar && <ProgressBar config={config} />}
      </Sequence>
      <Sequence durationInFrames={intro}>
        <Intro config={config} />
      </Sequence>
      <Sequence from={bodyStart + body - blend} durationInFrames={outro + blend}>
        <Outro config={config} />
      </Sequence>
      <Overlay config={config} />
    </AbsoluteFill>
  );
};
