// Edit this file to customise the graphics. Times are in seconds of the source video.
export type LowerThird = { at: number; duration: number; title: string; subtitle?: string };
export type Callout = { at: number; duration: number; text: string; position?: "top" | "center" | "bottom" };
export type Caption = { from: number; to: number; text: string };

export type MotionConfig = {
  title: string;
  subtitle: string;
  channelName: string;
  outroText: string;
  accent: string;
  accent2: string;
  introSeconds: number;
  outroSeconds: number;
  lowerThirds: LowerThird[];
  callouts: Callout[];
  captions: Caption[];
  // Filled in automatically by render.mjs from scene detection.
  cuts: number[];
  showProgressBar: boolean;
  grain: boolean;
};

export const defaultConfig: MotionConfig = {
  title: "MY FIRST VIDEO",
  subtitle: "Watch till the end",
  channelName: "SAIMON",
  outroText: "LIKE • SHARE • SUBSCRIBE",
  accent: "#00E5FF",
  accent2: "#FF2E88",
  introSeconds: 3.5,
  outroSeconds: 4,
  lowerThirds: [{ at: 1.5, duration: 4, title: "Saimon", subtitle: "Creator" }],
  callouts: [],
  captions: [],
  cuts: [],
  showProgressBar: true,
  grain: true,
};
