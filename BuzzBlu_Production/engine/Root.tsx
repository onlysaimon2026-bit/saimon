import { Composition } from "remotion";
import { Intro, IntroProps } from "./Intro";
import { Reveal, RevealProps } from "./Reveal";
import { CategoryCard, CategoryProps, Divider, DividerProps, IconLineup, LineupProps } from "./Segments";
import { FPS } from "./theme";

// Four compositions cover the whole film: one reveal used by every card, and three
// chapter slides. Nothing about a specific player is baked into the engine.
export const RevealRoot: React.FC = () => (
  <>
    <Composition
      id="Intro"
      component={Intro}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={FPS * 36}
      defaultProps={{ lines: [], cards: [], cardSizes: [], leaders: [] } satisfies IntroProps}
    />
    <Composition
      id="Reveal"
      component={Reveal}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={FPS * 10}
      defaultProps={{
        subject: {
          name: "MAHADI HASAN",
          detail: "ATTACKING MIDFIELDER (AM)",
          kicker: "ICON PLAYER / LIVE AUCTION",
          price: "$ 25",
          order: "01/04",
          category: "ICON PLAYER",
          style: "icon",
          card: "cards/01_mahadi_hasan.png",
          aspect: 1024 / 1536,
        },
      } satisfies RevealProps}
    />
    <Composition
      id="Divider"
      component={Divider}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={FPS * 4}
      defaultProps={{ title: ["MEET THE", "FOUR LEADERS"], subtitle: "FOUR AMBITIONS. ONE CHAMPIONSHIP.", style: "leader" } satisfies DividerProps}
    />
    <Composition
      id="CategoryCard"
      component={CategoryCard}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={FPS * 4}
      defaultProps={{ title: "GOALKEEPER", count: "05 PLAYERS", style: "regular" } satisfies CategoryProps}
    />
    <Composition
      id="IconLineup"
      component={IconLineup}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={FPS * 6}
      defaultProps={{
        title: "THE FOUR ICONS",
        cards: ["01_mahadi_hasan", "02_saidul", "03_shahin_alom", "04_md_rana"],
        sizes: [[1024, 1536], [1024, 1536], [1024, 1536], [1024, 1536]],
        names: ["MAHADI HASAN", "SAIDUL", "SHAHIN ALOM", "MD RANA"],
        style: "icon",
      } satisfies LineupProps}
    />
  </>
);
