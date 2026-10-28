import { Composition } from "remotion";
import { Main, MainProps } from "./Main";
import { defaultConfig } from "./config";
import { Reel, ReelProps } from "./reel/Reel";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Reel"
    component={Reel}
    fps={60}
    width={1080}
    height={1920}
    durationInFrames={60 * 45}
    defaultProps={{
      src: "input.mp4",
      sourceSeconds: 45,
      face: { fps: 60, width: 1440, height: 1920, frames: [] },
      plan: { accent: "#A8E6FF", camera: [{ t: 0, zoom: 1 }], captions: [], graphics: [], sfx: [], duration: 45 },
    } satisfies ReelProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round(props.plan.duration * 60) })}
  />
  <Composition
    id="Main"
    component={Main}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={FPS * 10}
    defaultProps={{
      src: "input.mp4",
      videoSeconds: 10,
      width: 1920,
      height: 1080,
      config: defaultConfig,
    } satisfies MainProps}
    calculateMetadata={({ props }) => ({
      width: props.width,
      height: props.height,
      durationInFrames: Math.ceil(
        (props.videoSeconds +
          (props.config.introStyle === "card" ? props.config.introSeconds - 0.5 : 0) +
          props.config.outroSeconds -
          0.3) *
          FPS,
      ),
    })}
  />

  </>
);
