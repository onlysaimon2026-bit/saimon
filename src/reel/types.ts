import type { IconName } from "../components/Icons";

// Camera keyframe: zoom (1 = full-height 9:16 crop of the source), optional horizontal
// bias in output px, and how to arrive at it ("cut" snaps, others ease).
export type CamKey = { t: number; zoom: number; x?: number; ease?: "cut" | "smooth" | "push" | "snap" };

export type CaptionWord = { w: string; s: number; e: number; hl?: boolean };
export type CaptionLine = { from: number; to: number; words: CaptionWord[] };

export type Graphic =
  | { type: "keyword"; at: number; duration: number; kicker?: string; text: string; icon?: IconName }
  | { type: "label"; at: number; duration: number; title: string; subtitle?: string }
  | { type: "orbit"; at: number; duration: number; items: { icon: IconName; label: string }[] }
  | { type: "trend"; at: number; duration: number; label: string; from: string; to: string }
  | { type: "headline"; at: number; duration: number; text: string }
  | { type: "end"; at: number; duration: number; title: string; cta: string };

export type Sfx = { t: number; name: string; volume: number };

export type ReelPlan = {
  accent: string;
  camera: CamKey[];
  captions: CaptionLine[];
  graphics: Graphic[];
  sfx: Sfx[];
  // Total output length; the last source frame is held if the footage is shorter.
  duration: number;
};

export type FaceTrack = { fps: number; width: number; height: number; frames: ([number, number, number] | null)[] };
