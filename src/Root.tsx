import { Composition } from "remotion";
import { Main, MainProps } from "./Main";
import { defaultConfig } from "./config";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
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
        (props.videoSeconds + props.config.introSeconds + props.config.outroSeconds) * FPS,
      ),
    })}
  />
);
