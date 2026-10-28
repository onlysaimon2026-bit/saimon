import { AbsoluteFill, Audio, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionConfig } from "./config";
import { Intro } from "./components/Intro";
import { Footage } from "./components/Footage";
import { LowerThirdView } from "./components/LowerThird";
import { CalloutView } from "./components/Callout";
import { Captions } from "./components/Captions";
import { CutFx } from "./components/CutFx";
import { FrameCorners } from "./components/FrameCorners";
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
  // A card intro/outro overlaps the footage slightly so they blend instead of hard-cutting.
  const blend = Math.round(0.5 * fps);
  const bodyStart = config.introStyle === "card" ? intro - blend : 0;
  const outroStart = bodyStart + body - Math.round(0.3 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#05060a" }}>
      <Sequence from={bodyStart} durationInFrames={body}>
        <Footage src={src} config={config} />
        {config.cuts.map((t) => (
          <Sequence key={t} from={Math.round(t * fps) - 3} durationInFrames={12} layout="none">
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
        <FrameCorners config={config} />
        {config.showProgressBar && <ProgressBar config={config} />}
      </Sequence>
      <Sequence durationInFrames={intro}>
        <Intro config={config} />
        {config.sfx && <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} />}
      </Sequence>
      <Sequence from={outroStart} durationInFrames={outro}>
        <OutroBackdrop src={src} config={config} lastFrame={body - 1} />
        <Outro config={config} />
        {config.sfx && <Audio src={staticFile("sfx/whoosh.wav")} volume={0.45} />}
        {config.sfx && (
          <Sequence from={60}>
            <Audio src={staticFile("sfx/click.wav")} volume={0.6} />
          </Sequence>
        )}
      </Sequence>
      <Overlay config={config} />
    </AbsoluteFill>
  );
};

// Last frame of the footage, frozen and blurred, behind the end card.
const OutroBackdrop: React.FC<{ src: string; config: MotionConfig; lastFrame: number }> = ({ src, config, lastFrame }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const blur = interpolate(frame, [0, 15], [0, 18], { extrapolateRight: "clamp" });
  const fade = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ filter: `blur(${blur}px)`, opacity: fade, transform: "scale(1.1)" }}>
      <Freeze frame={lastFrame}>
        <Footage src={src} config={config} muted />
      </Freeze>
    </AbsoluteFill>
  );
};
