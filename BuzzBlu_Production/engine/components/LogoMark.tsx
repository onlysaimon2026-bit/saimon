import { useVideoConfig } from "remotion";
import { DISPLAY } from "../fonts";
import { GREEN, Theme } from "../theme";
import { Football } from "./Football";

// The small BuzzBlu mark that sits at the top of the chapter slides: the turning ball
// beside the wordmark. The full tournament lockup belongs to the film's opening; this is
// the quiet version that brands every card without repeating that moment.
export const LogoMark: React.FC<{ theme: Theme; frame: number; scale?: number }> = ({
  theme,
  frame,
  scale = 1,
}) => {
  const { width } = useVideoConfig();
  const size = width * 0.034 * scale;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <div style={{ filter: `drop-shadow(0 0 ${size * 0.35}px ${theme.glow})` }}>
        <Football size={size} spin={frame * 7} theme={theme} />
      </div>
      <span
        style={{
          fontFamily: DISPLAY,
          fontSize: size * 1.02,
          lineHeight: 1,
          letterSpacing: size * 0.02,
          color: "#FFFFFF",
          textShadow: `0 0 ${size * 0.8}px ${theme.glow}`,
        }}
      >
        BUZZ<span style={{ color: GREEN }}>BLU</span>
      </span>
    </div>
  );
};
