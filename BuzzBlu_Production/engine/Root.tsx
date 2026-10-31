import { Composition } from "remotion";
import { Reveal, RevealProps } from "./Reveal";
import { DURATION, FPS } from "./theme";

export const RevealRoot: React.FC = () => (
  <Composition
    id="Reveal"
    component={Reveal}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={DURATION * FPS}
    defaultProps={{
      player: {
        sequence: 1,
        name: "MAHADI HASAN",
        position: "ATTACKING MIDFIELDER (AM)",
        base_price: "$ 25",
        order: "01/04",
        is_icon: true,
        card: "cards/01_mahadi_hasan.png",
        aspect: 1024 / 1536,
      },
    } satisfies RevealProps}
  />
);
