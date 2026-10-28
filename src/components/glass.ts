import type { CSSProperties } from "react";

// Shared smoked-glass surface: translucent dark fill (keeps white text readable over
// bright footage), backdrop blur, hairline border and a soft top highlight.
export const glass = (base: number, opts: { blur?: number; tint?: string; radius?: number } = {}): CSSProperties => ({
  background: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 45%, ${opts.tint ?? "rgba(255,255,255,0.04)"} 100%), rgba(12,16,28,0.32)`,
  backdropFilter: `blur(${opts.blur ?? 18}px) saturate(150%) brightness(0.85)`,
  WebkitBackdropFilter: `blur(${opts.blur ?? 18}px) saturate(150%) brightness(0.85)`,
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: opts.radius ?? base * 0.035,
  boxShadow: `0 ${base * 0.02}px ${base * 0.06}px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.08)`,
});
