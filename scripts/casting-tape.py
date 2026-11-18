#!/usr/bin/env python3
"""Casting tape: same line, many speakers, one gap between, so a human can pick by ear."""
import os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, "voices/en_US-libritts_r-medium.onnx")
PIPER = os.path.join(ROOT, "bin/piper/piper")
ESPEAK = os.path.join(ROOT, "bin/piper/espeak-ng-data")
FFMPEG = os.path.join(ROOT, "bin/ffmpeg")
LINE = os.environ.get("LINE", "You're going to say that in four seconds.")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/opencode/casting"
SPEAKERS = [int(s) for s in sys.argv[2].split(",")]

tmp = tempfile.mkdtemp()
parts = []
for i, sid in enumerate(SPEAKERS):
    wav = os.path.join(tmp, f"{i:02d}.wav")
    subprocess.run(
        [PIPER, "--model", MODEL, "--espeak_data", ESPEAK, "--speaker", str(sid), "--output_file", wav],
        input=LINE + "\n", text=True, capture_output=True, check=True,
    )
    parts.append(wav)
    print(f"{i + 1}. speaker {sid}")

gap = os.path.join(tmp, "gap.wav")
subprocess.run([FFMPEG, "-y", "-v", "error", "-f", "lavfi", "-t", "0.9", "-i", "anullsrc=r=22050:cl=mono", gap], check=True)

with open(os.path.join(tmp, "list.txt"), "w") as f:
    for p in parts:
        f.write(f"file '{p}'\nfile '{gap}'\n")

subprocess.run(
    [FFMPEG, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "list.txt"),
     "-ar", "44100", "-ac", "1", OUT + ".mp3"], check=True,
)
print(OUT + ".mp3")
