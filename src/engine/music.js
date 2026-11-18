import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { P } from "../lib/paths.js";
import { run } from "../lib/exec.js";

// Lemo-Opuscar's python env (music tier); override with MUSIC_PY
const PY = process.env.MUSIC_PY || path.join(os.homedir(), "lemo-opuscar", ".venv", "bin", "python");

/** Synthesise a music bed with sound effects at each beat, already loudness-normalised. */
export async function buildMusicBed({ duration, beats, kinds, scenes, ducks, mood, slug, workFile, outFile }) {
  if (!fs.existsSync(PY)) {
    throw new Error(
      `music reel needs the Lemo-Opuscar audio tier: sh ~/lemo-opuscar/plugin/skills/lemo-opuscar/scripts/setup.sh deps music`
    );
  }
  await run(PY, [
    path.join(P.root, "src", "audio", "bed.py"),
    "--out",
    workFile,
    "--duration",
    duration.toFixed(2),
    "--mood",
    mood,
    "--seed",
    slug || "",
    "--beats",
    beats.map((b) => b.toFixed(2)).join(","),
    ...(kinds && kinds.length ? ["--kinds", kinds.join(",")] : []),
    ...(scenes && scenes.length ? ["--scenes", scenes.join(",")] : []),
    ...(ducks && ducks.length ? ["--duck", ducks.map((d) => d.toFixed(2)).join(",")] : []),
  ]);
  await run(P.ffmpeg, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    workFile,
    "-af",
    "loudnorm=I=-15:TP=-1.5:LRA=11",
    "-ar",
    "48000",
    outFile,
  ]);
  return outFile;
}
