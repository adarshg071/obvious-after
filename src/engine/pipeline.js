import path from "node:path";
import fs from "node:fs/promises";
import { P } from "../lib/paths.js";
import { ensureDir, writeJSON, today, readJSON } from "../lib/fsx.js";
import { run } from "../lib/exec.js";
import { synth, concatWithSilence } from "./tts.js";
import { buildCaptions } from "./captions.js";
import { buildMusicBed } from "./music.js";
import { compile } from "./compile.js";
import { renderVideo, openBrowser } from "../render/capture.js";

const GAP = { hook: 0.18, type: 0.18, line: 0.12, kicker: 0.22, end: 0.0 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Read time for a caption. Faster than speech: the viewer reads the whole line, not word by word. */
function readTime(b) {
  if (b.dur) return b.dur;
  const words = b.text.replace(/\*+/g, "").split(/\s+/).filter(Boolean).length;
  if (b.kind === "line") return clamp(words * 0.24 + 0.55, 0.9, 2.4);
  if (b.kind === "hook") return clamp(words * 0.3 + 0.9, 1.8, 3.2);
  if (b.kind === "kicker") return clamp(words * 0.3 + 1.0, 2.2, 3.6);
  if (b.kind === "end") return clamp(words * 0.26 + 0.8, 1.8, 2.8);
  return clamp(words * 0.33 + 1.2, 2.4, 6);
}

export async function buildReel(topic, config, { browser, outRoot, onProgress, style } = {}) {
  const compiled = compile(topic, config, { style });
  const theme = config.theme[compiled.style] || config.theme;
  const slug = compiled.slug;
  const work = path.join(P.tmp, slug);
  await fs.rm(work, { recursive: true, force: true });
  await ensureDir(work);

  const log = (m) => onProgress && onProgress(`${slug}: ${m}`);

  // 1. voice, or read-time for caption-only reels
  log(compiled.mode === "voice" ? "voice" : "timing");
  const voiced = [];
  for (let i = 0; i < compiled.beats.length; i++) {
    const b = compiled.beats[i];
    if (compiled.mode === "voice") {
      const file = path.join(work, `b${i}.mp3`);
      const dur = await synth(b.text, { voice: config.voice, outFile: file });
      voiced.push({ ...b, file, dur });
    } else {
      voiced.push({ ...b, dur: readTime(b) });
    }
  }

  // 2. timeline
  const t = config.timing;
  const tailFile = path.join(work, "tail.wav");
  await run(P.ffmpeg, [
    "-y",
    "-f",
    "lavfi",
    "-t",
    String(t.tail),
    "-i",
    "anullsrc=r=22050:cl=mono",
    tailFile,
  ]);

  let cursor = t.hookLeadIn;
  const timed = voiced.map((b, i) => {
    const gapBefore = i === 0 ? t.hookLeadIn : 0;
    const beat = { ...b, t0: cursor, t1: cursor + b.dur, gapBefore };
    cursor = beat.t1 + (GAP[b.kind] ?? t.beatGap);
    return beat;
  });
  const duration = cursor + t.tail;

  // 3. audio track
  log("audio");
  const audio = path.join(work, "audio.wav");
  if (compiled.mode === "voice") {
    const parts = timed.map((b, i) => ({
      file: b.file,
      silenceBefore: i === 0 ? t.hookLeadIn : GAP[b.kind] ?? t.beatGap,
    }));
    parts.push({ file: tailFile, silenceBefore: 0 });
    await concatWithSilence(parts, audio);
  } else {
    await buildMusicBed({
      duration,
      beats: timed.map((b) => b.t0),
      kinds: timed.map((b) => b.sfx || b.kind),
      scenes: timed.map((b) => b.scene ?? 0),
      ducks: timed.filter((b) => b.duck).map((b) => b.t0),
      mood: compiled.mood,
      slug,
      workFile: path.join(work, "bed.wav"),
      outFile: audio,
    });
  }

  // 4. captions
  const caps = timed.flatMap((b) => buildCaptions(b));

  const data = {
    slug,
    mode: compiled.mode,
    style: compiled.style,
    motion: compiled.motion,
    format: compiled.format,
    cast: compiled.cast,
    scenes: compiled.scenes,
    accent: compiled.accent,
    duration,
    theme: {
      paper: theme.paper,
      ink: theme.ink,
      muted: theme.muted,
    },
    brand: {
      tagline: config.brand.tagline,
      handle: config.brand.handle,
      showHandle: config.brand.showHandle,
    },
    beats: timed.map((b) => ({
      kind: b.kind,
      t0: b.t0,
      t1: b.t1,
      accent: b.accent,
      lines: b.lines,
      icon: b.icon,
      index: b.index,
      total: b.total,
      name: b.name,
      tag: b.tag,
      character: b.character,
      mood: b.mood,
      figure: b.figure,
      who: b.who,
      scene: b.scene,
      text: b.text,
      sub: b.sub,
      pill: b.pill,
      prop: b.prop,
      propTurn: b.propTurn,
      propY: b.propY,
      propX: b.propX,
      propScale: b.propScale,
      cam: b.cam,
    })),
    caps,
  };

  // 5. render
  log("render");
  const dir = path.join(outRoot, slug);
  await ensureDir(dir);
  const video = path.join(dir, "reel.mp4");
  await renderVideo(data, {
    outFile: video,
    audioFile: audio,
    fps: config.video.fps,
    crf: config.video.crf,
    preset: config.video.preset,
    browser,
  });

  // 6. cover + metadata — mid-hook, where the hook text has landed
  const cover = path.join(dir, "cover.jpg");
  const hookBeat = timed[0];
  const coverAt = ((hookBeat.t0 + hookBeat.t1) / 2).toFixed(2);
  await run(P.ffmpeg, ["-y", "-ss", coverAt, "-i", video, "-frames:v", "1", "-q:v", "2", cover]);

  const hashtags = compiled.hashtags.join(" ");
  const captionText = [compiled.caption, hashtags].filter(Boolean).join("\n\n");
  await fs.writeFile(path.join(dir, "caption.txt"), captionText + "\n");
  await writeJSON(path.join(dir, "meta.json"), {
    slug,
    subject: compiled.subject,
    duration,
    createdAt: new Date().toISOString(),
    caption: compiled.caption,
    hashtags: compiled.hashtags,
    beats: timed.map((b) => ({ kind: b.kind, t0: +b.t0.toFixed(2), t1: +b.t1.toFixed(2), text: b.text })),
  });
  writeJSON(path.join(dir, "reel.json"), data);
  await fs.rm(work, { recursive: true, force: true });

  log(`done (${duration.toFixed(1)}s)`);
  return { dir, video, cover, duration };
}

export async function buildBatch(topics, config, opts = {}) {
  const outRoot = opts.outRoot || path.join(P.out, today());
  await ensureDir(outRoot);
  const browser = await openBrowser();
  const results = [];
  try {
    for (const topic of topics) {
      const res = await buildReel(topic, config, { ...opts, browser, outRoot });
      results.push(res);
    }
  } finally {
    await browser.close();
  }
  return { outRoot, results };
}

export async function markUsed(slugs) {
  const file = path.join(P.state, "used.json");
  const used = (await readJSON(file, {})) || {};
  for (const s of slugs) used[s] = new Date().toISOString();
  await writeJSON(file, used);
  return used;
}

export async function usedSlugs() {
  return (await readJSON(path.join(P.state, "used.json"), {})) || {};
}
