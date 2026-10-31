import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Vendored so a render never depends on a font CDN.
const FACES: [string, string, string][] = [
  ["Anton", "400", "Anton-400.ttf"],
  ["Oswald", "500", "Oswald-500.ttf"],
  ["Oswald", "700", "Oswald-700.ttf"],
  ["Montserrat", "600", "Montserrat-600.ttf"],
  ["Montserrat", "800", "Montserrat-800.ttf"],
  ["Montserrat", "900", "Montserrat-900.ttf"],
];
for (const [family, weight, file] of FACES) {
  loadFont({ family, weight, url: staticFile(`fonts/${file}`) });
}

export const DISPLAY = "Anton, Oswald, sans-serif";
export const UI = "Oswald, Montserrat, sans-serif";
