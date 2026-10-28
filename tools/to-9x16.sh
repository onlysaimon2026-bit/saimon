#!/usr/bin/env bash
# Fit a finished video into 1080x1920 (Reels/TikTok/Shorts) over a blurred, darkened
# copy of itself instead of black bars.
# Usage: tools/to-9x16.sh <in.mp4> <out.mp4>
set -euo pipefail
ffmpeg -v error -y -i "$1" -filter_complex \
  "[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:3,eq=brightness=-0.08:saturation=0.9[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p" \
  -c:v libx264 -crf 17 -preset medium -c:a copy -movflags +faststart "$2"
