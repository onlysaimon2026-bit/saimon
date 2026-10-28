"""Natural lip-tone correction: tracks lips with MediaPipe Face Landmarker and gently
lifts lightness and warmth inside a feathered lip mask (mouth opening excluded).

Usage: python lip_tone.py <in.mp4> <out.mp4> <face_landmarker.task> [strength]
Audio is copied from the input.
"""
import subprocess
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191]


def lip_mask(shape, outer, inner):
    h, w = shape[:2]
    mask = np.zeros((h, w), np.float32)
    cv2.fillPoly(mask, [outer.astype(np.int32)], 1.0, lineType=cv2.LINE_AA)
    cv2.fillPoly(mask, [inner.astype(np.int32)], 0.0, lineType=cv2.LINE_AA)
    width = np.ptp(outer[:, 0])
    k = max(3, int(width * 0.14)) | 1
    return cv2.GaussianBlur(mask, (k, k), 0)


def correct(frame, mask, strength):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB).astype(np.float32)
    m = mask * strength
    lab[..., 0] += 14 * m  # lightness
    lab[..., 1] += 9 * m   # towards natural red/pink
    lab[..., 2] += 2 * m   # slight warmth
    return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


def main():
    src, dst, model = sys.argv[1:4]
    strength = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    landmarker = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model), running_mode=vision.RunningMode.VIDEO, num_faces=1))
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}",
                            "-r", str(fps), "-i", "-", "-i", src, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264",
                            "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", dst],
                           stdin=subprocess.PIPE)
    smooth = None
    i = found = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        rgb = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        res = landmarker.detect_for_video(rgb, int(i * 1000 / fps))
        if res.face_landmarks:
            pts = np.array([[p.x * w, p.y * h] for p in res.face_landmarks[0]], np.float32)
            # Light temporal smoothing to stop the mask shimmering; snap on large moves (jump cuts).
            if smooth is None or np.abs(pts - smooth).mean() > w * 0.02:
                smooth = pts
            else:
                smooth = 0.6 * pts + 0.4 * smooth
            frame = correct(frame, lip_mask(frame.shape, smooth[OUTER], smooth[INNER]), strength)
            found += 1
        enc.stdin.write(frame.tobytes())
        i += 1
    enc.stdin.close()
    enc.wait()
    print(f"lip tone: face found in {found}/{i} frames")


if __name__ == "__main__":
    main()
