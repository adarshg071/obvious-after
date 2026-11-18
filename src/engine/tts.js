import fs from "node:fs/promises";
import path from "node:path";
import { run, runStdout } from "../lib/exec.js";
import { P } from "../lib/paths.js";
import { ensureDir } from "../lib/fsx.js";

export function stripMarks(text) {
  return text.replace(/\*/g, "").replace(/…/g, ",").replace(/[—–]/g, " ").replace(/\s+/g, " ").trim();
}

export async function synth(text, { voice, outFile }) {
  await ensureDir(path.dirname(outFile));
  const clean = stripMarks(text);
  await run(
    P.piper,
    [
      "--model",
      path.resolve(P.root, voice.model),
      "--espeak_data",
      P.espeak,
      "--output_file",
      outFile,
      "--length_scale",
      String(voice.lengthScale ?? 1.0),
      "--noise_scale",
      String(voice.noiseScale ?? 0.55),
      "--noise_w",
      String(voice.noiseW ?? 0.7),
      "--sentence_silence",
      String(voice.sentenceSilence ?? 0.12),
      ...(voice.speaker === undefined ? [] : ["--speaker", String(voice.speaker)]),
    ],
    { stdin: clean + "\n" }
  );
  const { out } = await run(P.ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    outFile,
  ]);
  return parseFloat(out.trim());
}

export async function concatWithSilence(parts, outFile) {
  // parts: [{ file, silenceBefore }]
  const args = [];
  const labels = [];
  let idx = 0;
  let filter = "";

  for (const part of parts) {
    if (part.silenceBefore > 0) {
      args.push("-f", "lavfi", "-t", part.silenceBefore.toFixed(3), "-i", "anullsrc=r=22050:cl=mono");
      labels.push(`[${idx}:a]`);
      filter += `[${idx}:a]aresample=44100[s${idx}];`;
      idx++;
    }
    args.push("-i", part.file);
    filter += `[${idx}:a]aresample=44100[a${idx}];`;
    labels.push(`[a${idx}]`);
    idx++;
  }

  // chain the labeled pieces through concat
  const seq = [];
  let n = 0;
  for (const part of parts) {
    if (part.silenceBefore > 0) seq.push(`[s${n++}]`);
    seq.push(`[a${n++}]`);
  }
  filter += `${seq.join("")}concat=n=${seq.length}:v=0:a=1[cat];[cat]loudnorm=I=-14:TP=-1.5:LRA=9[out]`;

  args.push(
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    outFile,
    "-y"
  );

  await run(P.ffmpeg, args);

  // single-pass loudnorm undershoots on reels with gaps; measure and correct
  const probe = await run(P.ffmpeg, [
    "-hide_banner",
    "-nostats",
    "-i",
    outFile,
    "-af",
    "loudnorm=print_format=summary",
    "-f",
    "null",
    "-",
  ]);
  const m = /Input Integrated:\s*(-?[\d.]+)/.exec(probe.err);
  if (m) {
    const gain = -14 - parseFloat(m[1]);
    if (Math.abs(gain) > 0.4) {
      const tmp = outFile.replace(/\.wav$/i, "") + ".norm.wav";
      await run(P.ffmpeg, [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        outFile,
        "-af",
        `volume=${gain.toFixed(2)}dB,alimiter=limit=0.85:level=0`,
        "-ar",
        "44100",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        tmp,
      ]);
      await fs.rename(tmp, outFile);
    }
  }
  return outFile;
}

export async function probe(file) {
  const buf = await runStdout(P.ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file,
  ]);
  return parseFloat(buf.toString().trim());
}
