#!/usr/bin/env bash
# Transcribe a video with whisper.cpp and burn styled captions into a copy.
#
#   bash scripts/captions.sh input.mp4 [model.bin]
#
# Output: <input>.srt and <input>.captions.mp4 (audio is copied, video re-encoded)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FFMPEG="$ROOT/bin/ffmpeg"
WHISPER="$ROOT/tools/whisper.cpp/build/bin/whisper-cli"
MODEL="${2:-$ROOT/tools/whisper.cpp/models/ggml-small.en.bin}"

if [ "$#" -lt 1 ]; then
  echo "usage: bash scripts/captions.sh input.mp4 [model.bin]" >&2
  exit 1
fi

IN="$1"
[ -f "$IN" ] || { echo "no such file: $IN" >&2; exit 1; }
[ -x "$WHISPER" ] || { echo "whisper.cpp not built at $WHISPER" >&2; exit 1; }
[ -f "$MODEL" ] || { echo "model not found: $MODEL" >&2; exit 1; }

DIR="$(cd "$(dirname "$IN")" && pwd)"
BASE="$(basename "${IN%.*}")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ extracting audio"
"$FFMPEG" -v error -y -i "$IN" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$TMP/audio.wav"

echo "→ transcribing ($(basename "$MODEL"))"
"$WHISPER" -m "$MODEL" -f "$TMP/audio.wav" -l en -t 4 -osrt -otxt -of "$TMP/$BASE" >/dev/null

cp "$TMP/$BASE.srt" "$DIR/$BASE.srt"

echo "→ burning captions"
STYLE="FontName=Inter,FontSize=9,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=52"

# libass resolves the subtitle path relative to the working directory
cd "$TMP"
"$FFMPEG" -v error -y -i "$DIR/$(basename "$IN")" \
  -vf "subtitles=$BASE.srt:fontsdir=$ROOT/assets/fonts:force_style='$STYLE'" \
  -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p \
  -c:a copy -movflags +faststart \
  "$DIR/$BASE.captions.mp4"

echo "done:"
echo "  $DIR/$BASE.srt"
echo "  $DIR/$BASE.captions.mp4"
