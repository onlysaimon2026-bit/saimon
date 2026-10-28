"""Track the speaker's face for intelligent reframing.

Writes JSON {fps, width, height, frames: [[cx, cy, faceH] | null, ...]} in source pixels,
where faceH is the forehead-to-chin height.
Usage: python face_track.py <in.mp4> <out.json> <face_landmarker.task>
"""
import json
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

src, dst, model = sys.argv[1:4]
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
landmarker = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model), running_mode=vision.RunningMode.VIDEO, num_faces=1))
frames = []
i = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    small = cv2.resize(frame, (w // 2, h // 2))
    res = landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(small, cv2.COLOR_BGR2RGB)),
                                      int(i * 1000 / fps))
    if res.face_landmarks:
        lm = res.face_landmarks[0]
        top, chin, nose = lm[10], lm[152], lm[1]
        frames.append([round(nose.x * w, 1), round((top.y + chin.y) / 2 * h, 1), round((chin.y - top.y) * h, 1)])
    else:
        frames.append(None)
    i += 1
landmarker.close()
json.dump({"fps": fps, "width": w, "height": h, "frames": frames}, open(dst, "w"))
print(f"face track: {sum(f is not None for f in frames)}/{len(frames)} frames")
