import { AbsoluteFill, Easing, Freeze, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CamKey, FaceTrack } from "./types";

const EASE = {
  smooth: Easing.bezier(0.45, 0, 0.25, 1),
  push: Easing.bezier(0.3, 0, 0.15, 1),
  snap: Easing.bezier(0.2, 0.9, 0.2, 1),
};

// Zoom/x-bias at time t from keyframes; "cut" keys switch instantly.
export const cameraAt = (keys: CamKey[], t: number) => {
  let prev = keys[0];
  for (const k of keys) {
    if (k.t > t) {
      if (k.ease === "cut" || k.t === prev.t) return { zoom: prev.zoom, x: prev.x ?? 0 };
      const span = k.t - prev.t;
      const p = EASE[k.ease ?? "smooth"](Math.min(1, Math.max(0, (t - prev.t) / span)));
      return { zoom: prev.zoom + (k.zoom - prev.zoom) * p, x: (prev.x ?? 0) + ((k.x ?? 0) - (prev.x ?? 0)) * p };
    }
    prev = k;
  }
  return { zoom: prev.zoom, x: prev.x ?? 0 };
};

// Source-to-output transform keeping the face at a fixed eye-line, clamped to the frame.
export const framing = (face: FaceTrack, keys: CamKey[], t: number, outW: number, outH: number) => {
  const { zoom, x } = cameraAt(keys, t);
  const s = (outH / face.height) * zoom;
  const i = Math.min(face.frames.length - 1, Math.max(0, Math.round(t * face.fps)));
  const f = face.frames[i] ?? [face.width / 2, face.height * 0.4, face.height * 0.27];
  const targetX = outW / 2 + x;
  const targetY = outH * 0.4;
  let fx = f[0] - (targetX - outW / 2) / s;
  let fy = f[1];
  fx = Math.min(face.width - (outW - targetX) / s, Math.max(targetX / s, fx));
  fy = Math.min(face.height - (outH - targetY) / s, Math.max(targetY / s, fy));
  return { s, tx: targetX - fx * s, ty: targetY - fy * s, face: f };
};

export const Camera: React.FC<{ src: string; face: FaceTrack; keys: CamKey[]; sourceSeconds: number }> = ({
  src,
  face,
  keys,
  sourceSeconds,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const lastFrame = Math.floor(sourceSeconds * fps) - 1;
  const t = Math.min(frame, lastFrame) / fps;
  const { s, tx, ty } = framing(face, keys, t, width, height);
  const video = (
    <OffthreadVideo
      src={staticFile(src)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: face.width,
        height: face.height,
        transformOrigin: "0 0",
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      {frame > lastFrame ? <Freeze frame={lastFrame}>{video}</Freeze> : video}
    </AbsoluteFill>
  );
};
