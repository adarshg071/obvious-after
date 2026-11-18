#!/usr/bin/env bash
# Verify every editing tool is present and runnable.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ok=0
bad=0

row() {
  if [ "$1" -eq 0 ]; then
    printf "  \033[32m✓\033[0m  %-14s %s\n" "$2" "$3"
    ok=$((ok + 1))
  else
    printf "  \033[31m✗\033[0m  %-14s %s\n" "$2" "$3"
    bad=$((bad + 1))
  fi
}

echo
echo "Editing tools — $ROOT"
echo

v=$("$ROOT/bin/ffmpeg" -version 2>/dev/null | head -1)
row $? ffmpeg "${v:-missing}"

v=$("$ROOT/bin/ffprobe" -version 2>/dev/null | head -1)
row $? ffprobe "${v:-missing}"

v=$("$ROOT/bin/yt-dlp" --version 2>/dev/null)
row $? yt-dlp "${v:-missing}"

v=$("$ROOT/tools/whisper.cpp/build/bin/whisper-cli" --version 2>/dev/null | head -1)
row $? whisper.cpp "${v:-missing}"

if [ -f "$ROOT/tools/whisper.cpp/models/ggml-small.en.bin" ]; then
  row 0 "whisper model" "ggml-small.en.bin (466 MB)"
else
  row 1 "whisper model" "missing — download ggml-small.en.bin"
fi

v=$(cd "$ROOT/tools/remotion" && npx remotion versions 2>/dev/null | sed -n '3p')
row $? remotion "${v:-missing}"

v=$("$ROOT/tools/hyperframes/node_modules/.bin/hyperframes" --version 2>/dev/null | tail -1)
row $? hyperframes "${v:-missing}"

if [ -x "$ROOT/bin/piper/piper" ]; then
  row 0 "piper" "en_US-amy-medium voice"
else
  row 1 "piper" "missing"
fi

echo
echo "  $ok ok, $bad missing"
echo
[ "$bad" -eq 0 ]
