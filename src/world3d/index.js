import fs from "node:fs/promises";
import path from "node:path";
import { P } from "../lib/paths.js";
import { run } from "../lib/exec.js";
import { renderReel } from "./capture.js";

// a repo .venv wins (see requirements.txt), then the older Lemo-Opuscar venv,
// then whatever python3 is on PATH
const PY = process.env.MUSIC_PY || await (async () => {
  for (const p of [
    path.join(P.root, ".venv", "bin", "python"),
    path.join(process.env.HOME, "lemo-opuscar", ".venv", "bin", "python"),
  ]) {
    if (await fs.access(p).then(() => true, () => false)) return p;
  }
  return "python3";
})();

const log = (m) => console.log(`· ${m}`);

async function loadJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function loadCharacters(ids) {
  const out = {};
  for (const id of ids) out[id] = await loadJson(path.join(P.root, "characters", `${id}.json`));
  return out;
}

/* Nobody speaks: the line is a card and an SRT cue, and its length is the time
   the eye needs. It is set in the storyboard; an unset line gets reading time. */
const readTime = (say) => Number((0.32 * say.split(/\s+/).filter(Boolean).length + 0.25).toFixed(3));
const lineDur = (ln) => ln.dur ?? Math.max(0.7, readTime(ln.say));

/* A line that ends on a dash was cut off, so the next one lands almost on top
   of it; an ellipsis is a character that stops talking, so it gets extra air. */
function gapAfter(ln, story) {
  if (typeof ln.gap === "number") return ln.gap;
  if (/[—-]\s*$/.test(ln.say)) return 0.08;
  if (/…\s*$/.test(ln.say)) return (story.gap ?? 0.3) + 0.4;
  return story.gap ?? 0.3;
}

/* Timeline: every line is on screen for its own length and the scenes flow from
   it, so a card is never cut off mid-read. A scene's `tail` is the silence after
   its last line ends, so a storyboard can hold one beat longer than the next
   without touching the global default. */
async function buildTimeline(story) {
  const leadIn = story.leadIn ?? 0.5;
  let cursor = leadIn;
  const scenes = [];

  for (const sc of story.scenes) {
    const scene = { ...sc, start: cursor, lines: [], cast: sc.cast || [] };
    for (const ln of sc.lines || []) {
      const dur = lineDur(ln);
      // spread the line so flags stage.js reads (`look`, `laugh`) survive the timeline
      scene.lines.push({ ...ln, t0: cursor, t1: cursor + dur, dur });
      cursor += dur + gapAfter(ln, story);
    }
    const tail = sc.tail ?? story.tail ?? 0.9;
    const last = scene.lines[scene.lines.length - 1];
    scene.end = (last ? last.t1 : cursor) + tail + (sc.hold || 0);
    cursor = scene.end;
    scenes.push(scene);
  }

  return { scenes, duration: cursor };
}

/* Subtitle cue: one short line, on screen a beat before the card and held after
   it, never over the next cue. Burned into Instagram, a sidecar file for
   YouTube. */
const srtTime = (x) => {
  const h = Math.floor(x / 3600);
  const m = Math.floor((x % 3600) / 60);
  const s = x % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`.replace(".", ",");
};

function writeSrt(file, scenes) {
  const cues = scenes.flatMap((sc) => sc.lines).filter((ln) => ln.card !== false);
  const rows = cues.map((ln, i) => {
    const next = cues[i + 1];
    const to = Math.min(ln.t1 + 0.3, next ? next.t0 - 0.08 : ln.t1 + 0.6);
    return `${i + 1}\n${srtTime(Math.max(0, ln.t0 - 0.05))} --> ${srtTime(to)}\n${ln.say.replace(/^[—–-]\s*/, "")}\n`;
  });
  return fs.writeFile(file, rows.join("\n"), "utf8");
}

export async function renderStory(storyPath) {
  const story = await loadJson(path.resolve(storyPath));
  const chars = await loadCharacters(story.characters || Object.keys(story.cast || {}));
  const wavDir = path.join(P.tmp, "world3d", story.id);
  await fs.mkdir(wavDir, { recursive: true });

  log(`story ${story.id} — ${story.title}`);

  const { scenes, duration } = await buildTimeline(story);
  const endCardDur = story.endCard ? story.endCard.dur || 1.8 : 0;
  const total = duration + endCardDur;
  const lineCount = scenes.reduce((n, sc) => n + sc.lines.length, 0);
  log(`timeline ${total.toFixed(1)}s · ${scenes.length} scenes · ${lineCount} cards`);

  const outDir = path.join(P.out, "world");
  await fs.mkdir(outDir, { recursive: true });
  const srtFile = path.join(outDir, `${story.id}.srt`);
  await writeSrt(srtFile, scenes);
  log(`subtitles → ${path.relative(P.root, srtFile)}`);

  if (process.argv.includes("--dry")) {
    // audio-only pass: check the cut before paying for 15 minutes of frames
    scenes.forEach((sc) => {
      log(`${sc.start.toFixed(2)}–${sc.end.toFixed(2)}s  ${sc.cam?.shot || "medium"}`);
      sc.lines.forEach((ln) => log(`   ${ln.t0.toFixed(2)} ${ln.who}: ${ln.say}  (${ln.dur.toFixed(2)}s)`));
    });
    return null;
  }

  // music bed, seeded by episode id
  const music = path.join(wavDir, "music.wav");
  const beats = [];
  const kinds = [];
  const scenesIdx = [];
  scenes.forEach((sc, i) => {
    for (const ln of sc.lines) {
      beats.push(ln.t0.toFixed(2));
      kinds.push("action");
      scenesIdx.push(i);
    }
  });
  await run(PY, [
    path.join(P.root, "src", "audio", "bed.py"),
    "--out", music,
    "--duration", total.toFixed(2),
    "--mood", story.music || "warm",
    "--beats", beats.join(","),
    "--kinds", kinds.join(","),
    "--scenes", scenesIdx.join(","),
    "--seed", story.seed || story.id,
  ]);
  log("music bed done");

  // room tone + foley: the set has to sound like somewhere, not like a studio
  const ambienceFile = path.join(wavDir, "ambience.wav");
  const cues = [];
  scenes.forEach((sc) => {
    (sc.fx || []).forEach((name) => cues.push(`${(sc.start + 0.02).toFixed(2)}:${name}`));
    sc.lines.forEach((ln) => ln.fx && cues.push(`${ln.t0.toFixed(2)}:${ln.fx}`));
  });
  await run(PY, [
    path.join(P.root, "src", "audio", "bed.py"),
    "--out", ambienceFile,
    "--duration", total.toFixed(2),
    "--amb", story.ambience || "room",
    "--fx", cues.join(","),
  ]);
  log(`room tone done${cues.length ? ` · ${cues.length} cues` : ""}`);

  // mix: room tone and foley carry the reel, the bed sits under them, and the
  // whole thing is mastered to the same −14 LUFS target as before. The tail pad
  // keeps the encoder's `-shortest` from clipping the last frames of picture.
  const mixed = path.join(wavDir, "mix.wav");
  await run(P.ffmpeg, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", music, "-i", ambienceFile,
    "-filter_complex",
    "[0:a]volume=0.55[m];[1:a]volume=0.5[a];" +
      "[m][a]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0," +
      "loudnorm=I=-14:TP=-2.8:LRA=11[n];[n]apad=pad_dur=0.3[out]",
    "-map", "[out]", "-ar", "48000", "-ac", "2", "-t", (total + 0.2).toFixed(2), mixed,
  ]);

  // audio-only pass: fix a cue and remux with `-c:v copy`
  if (process.argv.includes("--audio")) {
    console.log(mixed);
    return mixed;
  }

  const payload = {
    story: {
      id: story.id,
      scenes: scenes.map((sc) => ({
        set: sc.set,
        cam: sc.cam,
        cast: sc.cast,
        caption: sc.caption,
        seat: sc.seat,
        start: sc.start,
        end: sc.end,
        lines: sc.lines,
      })),
      endCard: story.endCard ? { ...story.endCard, from: duration - 0.15 } : null,
    },
    characters: chars,
  };

  const outFile = path.join(outDir, `${story.id}.mp4`);
  const cleanFile = path.join(outDir, `${story.id}-clean.mp4`);
  log(`rendering → ${path.relative(P.root, outFile)}`);
  const res = await renderReel({
    payload,
    duration: total,
    fps: story.fps || 30,
    audioFile: mixed,
    outFile,
    cleanFile,
    log,
  });

  console.log(`\n${outFile}`);
  console.log(`${path.relative(P.root, cleanFile)}`);
  console.log(`${res.frames} frames · ${(res.ms / 1000).toFixed(0)}s render · ${total.toFixed(1)}s video`);
  return outFile;
}

const target = process.argv[2];
if (!target) {
  console.error("usage: node src/world3d/index.js stories/<ep>.json");
  process.exit(1);
}
renderStory(target).catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
