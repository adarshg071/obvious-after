import { stripMarks } from "./tts.js";

const MAX_WORDS = 3;
const MAX_CHARS = 20;

export function chunkWords(words) {
  const chunks = [];
  let cur = [];
  for (const w of words) {
    const next = [...cur, w];
    const chars = next.join(" ").length;
    if (cur.length && (next.length > MAX_WORDS || chars > MAX_CHARS)) {
      chunks.push(cur);
      cur = [w];
    } else {
      cur = next;
    }
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

/** Distribute chunk timings inside a beat window, weighted by character length. */
export function buildCaptions(beat) {
  if (!beat.captions) return [];
  const words = stripMarks(beat.text).split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const chunks = chunkWords(words);
  const totalChars = chunks.reduce((a, c) => a + c.join(" ").length, 0);

  // speech occupies the middle of the window: +0.06s lead, -0.08s tail
  const start = beat.t0 + 0.06;
  const end = Math.max(start + 0.2, beat.t1 - 0.08);
  const span = end - start;

  let cursor = start;
  const out = [];
  for (const chunk of chunks) {
    const weight = chunk.join(" ").length / totalChars;
    const dur = Math.max(0.22, span * weight);
    const cStart = cursor;
    const cEnd = Math.min(end, cursor + dur);
    const per = (cEnd - cStart) / chunk.length;
    out.push({
      t0: cStart,
      t1: cEnd,
      words: chunk.map((w, i) => ({
        w,
        t0: cStart + per * i,
        t1: cStart + per * (i + 1),
      })),
    });
    cursor = cEnd;
  }
  return out;
}
