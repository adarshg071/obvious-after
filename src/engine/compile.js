import path from "node:path";
import fs from "node:fs/promises";
import { P } from "../lib/paths.js";
import { readJSON, slugify } from "../lib/fsx.js";

function toSegments(line) {
  // keep empty parts in place: they carry the *…* parity
  return line
    .split(/\*(.+?)\*/g)
    .map((t, i) => ({ t, hl: i % 2 === 1 }))
    .filter((s) => s.t !== "");
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export async function loadTopics() {
  await fs.mkdir(P.topics, { recursive: true });
  const files = (await fs.readdir(P.topics)).filter((f) => f.endsWith(".json")).sort();
  const topics = [];
  for (const f of files) {
    const data = await readJSON(path.join(P.topics, f), null);
    if (!data) continue;
    const list = Array.isArray(data) ? data : [data];
    const pillar = f.replace(/^\d+-/, "").replace(/\.json$/, "");
    for (const t of list) {
      topics.push({ ...t, id: t.id || slugify(t.subject || f), pillar });
    }
  }
  return topics;
}

const MOOD_BY_PILLAR = {
  mind: "tense",
  money: "warm",
  body: "warm",
  life: "warm",
  love: "warm",
  funny: "bright",
};
const MOTION_BY_PILLAR = { love: "drift", funny: "snap" };

/** Named actors, each with a horizontal spot on stage (0..1). */
function normalizeCast(topic, accent) {
  const raw = topic.cast || {};
  const keys = Object.keys(raw);
  const out = {};
  keys.forEach((k, i) => {
    const c = raw[k] || {};
    const x =
      typeof c.x === "number"
        ? c.x
        : keys.length <= 2
        ? k === "right"
          ? 0.82
          : 0.18
        : 0.12 + (0.76 * i) / Math.max(1, keys.length - 1);
    out[k] = {
      figure: c.figure || "stand",
      mood: c.mood || "smile",
      accent: c.accent || accent,
      x,
      scale: c.scale || 1,
    };
  });
  return out;
}

/** A story is a list of scenes; older two-handers are one implicit scene. */
function normalizeScenes(topic) {
  if (Array.isArray(topic.scenes)) {
    return topic.scenes.map((s) => ({
      bg: s.bg || "room",
      time: s.time || "day",
      cast: Array.isArray(s.cast) ? s.cast : Object.keys(topic.cast || {}),
      lines: s.lines || [],
      pos: s.pos || null,
    }));
  }
  return [
    {
      bg: topic.bg || "room",
      time: topic.time || "day",
      cast: Object.keys(topic.cast || {}),
      lines: topic.lines || [],
      pos: null,
    },
  ];
}

export function compile(topic, config, opts = {}) {
  const style = topic.style || opts.style || "doodle";
  // no AI narrator: every reel is captions over music + sfx
  const mode = topic.mode === "voice" ? "voice" : "music";
  const mood = topic.music || MOOD_BY_PILLAR[topic.pillar] || "warm";
  const motion = topic.motion || MOTION_BY_PILLAR[topic.pillar] || "rise";
  const theme = config.theme[style] || config.theme;
  const accents = theme.accents;
  const accent = accents[hash(topic.id) % accents.length];
  const silent = Boolean(topic.silent);
  const scene = topic.format === "scene" && (Array.isArray(topic.lines) || Array.isArray(topic.scenes));
  const scenes = scene ? normalizeScenes(topic) : [];
  const cast = scene ? normalizeCast(topic, accent) : {};
  const beats = [];

  const hookLines = (topic.hook.lines || []).map(toSegments);
  beats.push({
    kind: "hook",
    text: topic.hook.say || "",
    lines: hookLines,
    icon: topic.hook.icon || "burst",
    prop: topic.hook.prop || null,
    propScale: topic.hook.propScale || 1,
    accent,
    scene: 0,
    captions: false,
    ...(silent ? { dur: topic.hook.dur || 1.0 } : {}),
  });

  if (scene) {
    // story: every line is a beat, credited to a named actor inside a scene
    scenes.forEach((s, si) => {
      s.lines.forEach((l) => {
        beats.push({
          kind: "line",
          scene: si,
          who: l.who,
          mood: l.mood || "open",
          figure: l.figure || null,
          text: l.say || "",
          accent,
          dur: l.dur,
          cam: l.cam || null,
          duck: Boolean(l.duck),
          sfx: l.sfx || (silent ? "action" : null),
          react: Boolean(l.react),
          prop: l.prop || null,
          propTurn: l.propTurn || 0,
          propY: l.propY || 0,
          propX: typeof l.propX === "number" ? l.propX : null,
          propScale: l.propScale || 1,
          captions: false,
        });
      });
    });
  } else {
    const total = topic.types.length;
    topic.types.forEach((t, i) => {
      beats.push({
        kind: "type",
        accent: accents[(hash(topic.id) + i + 1) % accents.length],
        text: t.say,
        index: i + 1,
        total,
        name: t.name,
        tag: t.tag || "",
        character: t.figure || "stand",
        icon: t.icon || null,
        mood: t.mood || "smile",
        captions: true,
      });
    });
  }

  if (!silent && topic.kicker) {
    beats.push({
      kind: "kicker",
      text: topic.kicker.say,
      lines: (topic.kicker.lines || []).map(toSegments),
      accent,
      captions: !scene,
    });
  }

  // silent action reels end on the action, with no end card
  if (!silent) {
    const end = topic.end || {};
    const handle = config.brand.handle;
    beats.push({
      kind: "end",
      text: end.say || (end.lines || []).join(" ") || "Follow for the stuff nobody teaches you.",
      lines: (end.lines || ["The stuff nobody", "teaches *you*."]).map(toSegments),
      sub: handle ? `@${handle}` : end.sub || "",
      pill: end.pill || "FOLLOW FOR MORE",
      icon: "burst",
      accent,
      captions: false,
    });
  }

  return {
    slug: topic.id,
    subject: topic.subject,
    style,
    mode,
    motion,
    mood,
    format: scene ? "scene" : "list",
    cast,
    scenes,
    accent,
    beats,
    caption: topic.caption || "",
    hashtags: topic.hashtags || [],
  };
}
