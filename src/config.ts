// Edit this file to customise the graphics. Times are in seconds of the source video.
export type LowerThird = { at: number; duration: number; title: string; subtitle?: string };
import type { IconName } from "./components/Icons";

export type Callout = {
  at: number;
  duration: number;
  text: string;
  // Small line above the main text.
  kicker?: string;
  icon?: IconName;
  position?: "top" | "center" | "bottom";
};
export type Caption = { from: number; to: number; text: string };

export type MotionConfig = {
  title: string;
  subtitle: string;
  channelName: string;
  outroText: string;
  buttonText: string;
  buttonDoneText: string;
  accent: string;
  accent2: string;
  // "overlay" plays the title over the first seconds of footage (best for reels);
  // "card" plays it on its own background before the footage starts.
  introStyle: "overlay" | "card";
  introSeconds: number;
  outroSeconds: number;
  lowerThirds: LowerThird[];
  callouts: Callout[];
  captions: Caption[];
  // Filled in automatically by render.mjs from scene detection.
  cuts: number[];
  // Alternate between wide and close framing on every cut.
  punchZoom: number;
  // [start, end] seconds where framing stays wide, e.g. while burned-in text is on screen.
  wideRanges: [number, number][];
  sfx: boolean;
  showProgressBar: boolean;
  grain: boolean;
};

export const defaultConfig: MotionConfig = {
  title: "MY FIRST VIDEO",
  subtitle: "Watch till the end",
  channelName: "SAIMON",
  outroText: "LIKE • SHARE • SUBSCRIBE",
  buttonText: "SUBSCRIBE",
  buttonDoneText: "SUBSCRIBED ✓",
  accent: "#00E5FF",
  accent2: "#FF2E88",
  introStyle: "overlay",
  introSeconds: 2.5,
  outroSeconds: 4,
  lowerThirds: [],
  callouts: [],
  captions: [],
  cuts: [],
  punchZoom: 1.12,
  wideRanges: [],
  sfx: true,
  showProgressBar: true,
  grain: true,
};
