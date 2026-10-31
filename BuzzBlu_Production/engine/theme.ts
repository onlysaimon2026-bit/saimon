// One BuzzBlu identity, two metals. Icon players get gold, regular players steel blue;
// the green is the tournament's own accent and stays constant across both.
export type Style = "icon" | "regular";

export type Player = {
  sequence: number;
  name: string;
  position: string;
  base_price: string;
  order: string;
  is_icon: boolean;
  card: string;
  // Width / height of the source card image, so it is shown uncropped.
  aspect: number;
};

export type Theme = {
  metal: string;
  metalDim: string;
  metalBright: string;
  glow: string;
  rim: string;
  kicker: string;
  light: string;
};

export const GREEN = "#5BE63C";

export const THEMES: Record<Style, Theme> = {
  icon: {
    metal: "#F2C14B",
    metalDim: "#8A6418",
    metalBright: "#FFF0C2",
    glow: "rgba(242,193,75,0.55)",
    rim: "rgba(255,226,150,0.9)",
    kicker: "ICON PLAYER",
    light: "#FFD98A",
  },
  regular: {
    metal: "#9FC4E8",
    metalDim: "#2C4F77",
    metalBright: "#EAF4FF",
    glow: "rgba(110,170,235,0.5)",
    rim: "rgba(205,232,255,0.85)",
    kicker: "PLAYER",
    light: "#BFE0FF",
  },
};

export const FPS = 30;
export const DURATION = 10;

// Act boundaries in seconds; the sound design is pinned to the same numbers.
export const ACT = {
  brand: [0.0, 1.5],
  build: [1.5, 3.0],
  reveal: [3.0, 5.0],
  hero: [5.0, 8.0],
  sign: [8.0, 10.0],
} as const;

export const sec = (s: number) => Math.round(s * FPS);
