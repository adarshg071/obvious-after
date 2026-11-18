#!/usr/bin/env python3
"""Pitch-scan a multi-speaker piper model so casting starts from data, not guesses."""
import json, os, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, "voices/en_US-libritts_r-medium.onnx")
PIPER = os.path.join(ROOT, "bin/piper/piper")
ESPEAK = os.path.join(ROOT, "bin/piper/espeak-ng-data")
LINE = "You're going to say that in four seconds."
TMP = "/tmp/opencode/scan.wav"


def f0(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    # voiced frames only: autocorrelation peak on 40 ms windows
    win = int(0.04 * sr)
    est = []
    for s in range(0, len(x) - win, win // 2):
        f = x[s:s + win]
        if np.sqrt((f ** 2).mean()) < 0.02:
            continue
        f = f - f.mean()
        c = np.correlate(f, f, "full")[win - 1:]
        lo, hi = int(sr / 400), int(sr / 70)
        if hi >= len(c):
            continue
        k = lo + int(np.argmax(c[lo:hi]))
        if c[k] > 0.3 * c[0]:
            est.append(sr / k)
    return float(np.median(est)) if est else 0.0


ids = [int(v) for v in json.load(open(MODEL + ".json"))["speaker_id_map"].values()]
ids.sort()
rows = []
for sid in ids[: int(sys.argv[1]) if len(sys.argv) > 1 else 120]:
    subprocess.run(
        [PIPER, "--model", MODEL, "--espeak_data", ESPEAK, "--speaker", str(sid), "--output_file", TMP],
        input=LINE + "\n", text=True, capture_output=True, check=True,
    )
    rows.append((sid, f0(TMP)))

for sid, hz in rows:
    print(f"{sid}\t{hz:.0f}")
