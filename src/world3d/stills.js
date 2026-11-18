/* Storyboard preview: render a handful of frames to /tmp, no audio, no video.
   usage: node src/world3d/stills.js stories/ep-001.json 1,4,7.5,11 */

import fs from "node:fs/promises";
import path from "node:path";
import { P } from "../lib/paths.js";
import { withStage } from "./capture.js";

const [storyPath, timesArg, outDir = "/tmp/world3d-stills"] = process.argv.slice(2);
if (!storyPath) {
  console.error("usage: node src/world3d/stills.js stories/<ep>.json <t1,t2,...> [outDir]");
  process.exit(1);
}

const story = JSON.parse(await fs.readFile(path.resolve(storyPath), "utf8"));
const characters = {};
for (const id of story.characters) {
  characters[id] = JSON.parse(await fs.readFile(path.join(P.root, "characters", `${id}.json`), "utf8"));
}

// Times are given in scene-relative seconds: "1:0.5" = scene 0, 0.5 s in.
const durations = story.__durations || null;
const marks = timesArg.split(",").map((s) => {
  const [a, b] = s.split(":");
  return b === undefined ? { scene: null, t: parseFloat(a) } : { scene: parseInt(a, 10), t: parseFloat(b) };
});

/* Without the audio pass we don't know real TTS durations, so a preview uses a
   fixed 1.8 s per line. Good enough for framing, never for final timing. */
const LEAD = story.leadIn ?? 0.4;
const GAP = story.gap ?? 0.3;
const TAIL = story.tail ?? 0.7;
let cursor = LEAD;
const scenes = story.scenes.map((sc) => {
  const start = cursor;
  const lines = (sc.lines || []).map((ln) => {
    const t0 = cursor;
    cursor += 1.8 + GAP;
    return { ...ln, t0, t1: cursor };
  });
  cursor += sc.hold || 0;
  const end = cursor + (sc.tail ?? TAIL);
  cursor = end;
  return { ...sc, start, end, lines };
});

const payload = {
  story: { id: story.id, scenes, endCard: story.endCard ? { ...story.endCard, from: cursor - 0.3 } : null },
  characters,
};

await fs.mkdir(outDir, { recursive: true });
await withStage(payload, async (page) => {
  for (const m of marks) {
    let t = m.t;
    if (m.scene !== null) t = scenes[m.scene].start + m.t;
    const frame = await page.evaluate((ms) => window.__frame(ms, 0.9), t * 1000);
    const file = path.join(outDir, `t${t.toFixed(2)}.jpg`);
    await fs.writeFile(file, Buffer.from(frame.card.split(",")[1], "base64"));
    console.log(file);
  }
});
