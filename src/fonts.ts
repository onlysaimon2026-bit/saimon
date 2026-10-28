import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts are vendored in public/fonts so renders don't depend on Google Fonts at runtime.
const faces: [string, string, string][] = [
  ["Montserrat", "500", "Montserrat-500.ttf"],
  ["Montserrat", "800", "Montserrat-800.ttf"],
  ["Montserrat", "900", "Montserrat-900.ttf"],
  ["Hind Siliguri", "500", "HindSiliguri-500.ttf"],
  ["Hind Siliguri", "700", "HindSiliguri-700.ttf"],
];
for (const [family, weight, file] of faces) {
  loadFont({ family, weight, url: staticFile(`fonts/${file}`) });
}

// Hind Siliguri covers Bengali text, Montserrat everything Latin.
export const FONT = `Montserrat, "Hind Siliguri", sans-serif`;
