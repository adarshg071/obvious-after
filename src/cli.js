#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { P } from "./lib/paths.js";
import { readJSON, ensureDir, writeJSON, today } from "./lib/fsx.js";
import { loadTopics, compile } from "./engine/compile.js";
import { buildBatch, markUsed, usedSlugs } from "./engine/pipeline.js";
import { renderPfp } from "./render/pfp.js";
import { renderBanner } from "./render/banner.js";

const argv = process.argv.slice(2);
const cmd = argv[0] || "help";

function flag(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const config = await readJSON(path.join(P.root, "config.json"));

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
};

async function pickTopics(count, wanted) {
  const topics = await loadTopics();
  if (wanted && wanted !== true) {
    const ids = String(wanted).split(",").map((s) => s.trim());
    const found = ids.map((id) => topics.find((t) => t.id === id)).filter(Boolean);
    if (found.length !== ids.length) {
      const missing = ids.filter((id) => !topics.some((t) => t.id === id));
      console.error(C.warn(`Unknown topic(s): ${missing.join(", ")}`));
    }
    return found;
  }
  const used = await usedSlugs();
  const fresh = topics.filter((t) => !used[t.id]);
  const stale = topics.filter((t) => used[t.id]).sort((a, b) => (used[a.id] > used[b.id] ? 1 : -1));

  // the daily format is one love + one funny story: never fall back to the old list bank
  if (count === 2) {
    const picks = ["love", "funny"].map((p) => {
      const bucket = topics.filter((t) => t.pillar === p);
      return bucket.find((t) => !used[t.id]) || bucket.sort((a, b) => String(used[a.id] || "").localeCompare(String(used[b.id] || "")))[0];
    });
    if (picks.every(Boolean)) {
      const recycled = picks.filter((t) => used[t.id]);
      if (recycled.length) {
        console.log(C.warn(`Recycling ${recycled.map((t) => t.id).join(", ")} — add fresh love/funny topics.`));
      }
      return picks;
    }
    console.log(C.warn("No love/funny topics found — falling back to the mixed bank."));
  }

  // round-robin across pillars so a day's batch covers mind / money / body / life
  const buckets = new Map();
  for (const t of fresh) {
    if (!buckets.has(t.pillar)) buckets.set(t.pillar, []);
    buckets.get(t.pillar).push(t);
  }
  const mixed = [];
  while (mixed.length < fresh.length) {
    let moved = false;
    for (const list of buckets.values()) {
      if (list.length) {
        mixed.push(list.shift());
        moved = true;
      }
    }
    if (!moved) break;
  }
  const pool = [...mixed, ...stale];
  if (fresh.length < count) {
    console.log(
      C.warn(
        `Only ${fresh.length} unused topic(s). Recycling the oldest ${count - fresh.length}. Consider adding topics/*.json.`
      )
    );
  }
  return pool.slice(0, count);
}

async function cmdList() {
  const topics = await loadTopics();
  const used = await usedSlugs();
  const fresh = topics.filter((t) => !used[t.id]);
  console.log(C.bold(`\n${topics.length} topics · ${fresh.length} unused\n`));
  for (const t of topics) {
    const mark = used[t.id] ? C.dim("used") : C.ok("new ");
    console.log(`  ${mark}  ${t.id.padEnd(22)} ${C.dim(t.subject)}`);
  }
  console.log();
}

async function cmdMake() {
  const count = parseInt(flag("count", "2"), 10);
  const wanted = flag("topics", null);
  const topics = await pickTopics(count, wanted);
  if (!topics.length) return console.error("Nothing to render.");

  if (flag("dry-run", false)) {
    console.log(C.bold("\nWould render:"));
    for (const t of topics) console.log(`  ${t.id.padEnd(22)} ${C.dim(t.pillar + " · " + (t.style || "doodle"))}`);
    console.log();
    return;
  }

  const dateFlag = flag("date", null);
  const date = dateFlag && dateFlag !== true ? String(dateFlag) : today();
  const outRoot = path.join(P.out, date);
  await ensureDir(outRoot);

  console.log(C.bold(`\nRendering ${topics.length} reel(s) → ${path.relative(P.root, outRoot)}\n`));
  const started = Date.now();

  const style = flag("style", null);
  const { results } = await buildBatch(topics, config, {
    outRoot,
    style: style && style !== true ? String(style) : undefined,
    onProgress: (m) => console.log("  " + C.dim(m)),
  });

  await markUsed(topics.map((t) => t.id));
  await writePostSheet(outRoot);

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(C.ok(`\nDone in ${secs}s`));
  for (const r of results) console.log(`  ${path.relative(P.root, r.dir)}  ${C.dim(r.duration.toFixed(1) + "s")}`);
  console.log(`\n  Open: ${C.bold(path.relative(P.root, path.join(outRoot, "POST.md")))}\n`);
}

async function writePostSheet(outRoot) {
  const rows = [];
  for (const name of (await fs.readdir(outRoot)).sort()) {
    const dir = path.join(outRoot, name);
    const st = await fs.stat(dir).catch(() => null);
    if (!st || !st.isDirectory()) continue;
    const meta = await readJSON(path.join(dir, "meta.json"), null);
    if (!meta) continue;
    const caption = await fs.readFile(path.join(dir, "caption.txt"), "utf8").catch(() => "");
    rows.push({ name, meta, caption });
  }
  rows.sort((a, b) => String(a.meta.createdAt || "").localeCompare(String(b.meta.createdAt || "")));

  const lines = [
    `# Post sheet — ${path.basename(outRoot)}`,
    "",
    "Post 2–3 per day. Wait at least 3 hours between them.",
    "Order matters least; the first 30 minutes after posting matters most.",
    "",
  ];
  rows.forEach((r, i) => {
    lines.push(`## ${i + 1}. ${r.meta.subject}  \`${r.name}\``);
    lines.push("");
    lines.push(`- file: \`${r.name}/reel.mp4\` (${r.meta.duration.toFixed(1)}s)`);
    lines.push(`- cover: \`${r.name}/cover.jpg\``);
    lines.push(`- caption: \`${r.name}/caption.txt\``);
    lines.push("");
    lines.push("```");
    lines.push(r.caption.trim());
    lines.push("```");
    lines.push("");
  });
  lines.push("---");
  lines.push("");
  lines.push("Checklist per post: choose `cover.jpg` as cover, paste caption, add 3–5 hashtags max,");
  lines.push("reply to the first 10 comments within an hour, then leave it alone.");
  lines.push("");
  await fs.writeFile(path.join(outRoot, "POST.md"), lines.join("\n"));
}

async function cmdSheet() {
  const d = flag("date", null);
  const outRoot = path.join(P.out, d && d !== true ? String(d) : today());
  await ensureDir(outRoot);
  await writePostSheet(outRoot);
  console.log(C.ok(`Post sheet rebuilt → ${path.relative(P.root, path.join(outRoot, "POST.md"))}`));
}

async function cmdPfp() {
  const out = path.join(P.out, "pfp.png");
  await renderPfp(config, out);
  console.log(C.ok(`Profile picture → ${path.relative(P.root, out)}`));
  console.log(C.dim("Upload at instagram.com → profile → Edit profile → Change photo."));
}

async function cmdBanner() {
  const out = path.join(P.out, "banner.png");
  await renderBanner(config, out);
  console.log(C.ok(`Channel banner → ${path.relative(P.root, out)}`));
  console.log(C.dim("Upload at YouTube Studio → Customisation → Branding → Banner image."));
}

async function cmdDaily() {
  await cmdMake();
}

async function cmdClean() {
  await fs.rm(P.tmp, { recursive: true, force: true });
  console.log("Temp cleared.");
}

async function cmdHelp() {
  console.log(`
${C.bold("reels")} — faceless short-form video pipeline

  ${C.bold("npm run list")}                        topics + what's unused
  ${C.bold("npm run make")}                        render 2 reels (next unused topics)
  ${C.bold("npm run make -- --count 2")}           render any number
  ${C.bold("npm run make -- --topics social-battery,chronotypes")}
  ${C.bold("npm run make -- --date 2026-11-07")}    render into a specific day's folder
  ${C.bold("npm run make -- --style voxel")}        dark blocky 3D look
  ${C.bold("npm run make -- --count 3 --dry-run")}  see what would be picked
  ${C.bold("npm run daily")}                       what cron calls
  ${C.bold("npm run sheet")}                       rebuild today's POST.md from the folder
  ${C.bold("npm run pfp")}                         generate profile picture
  ${C.bold("npm run banner")}                      generate YouTube channel banner (2048×1152)
  ${C.bold("npm run clean")}                       clear temp files
  ${C.bold("npm run captions -- myvideo.mp4")}     whisper captions burned into a copy
  ${C.bold("npm run tools")}                       verify ffmpeg / whisper / yt-dlp / remotion / hyperframes

  Output: out/YYYY-MM-DD/<topic>/{reel.mp4,cover.jpg,caption.txt,meta.json}
  Post sheet: out/YYYY-MM-DD/POST.md
`);
}

const table = {
  list: cmdList,
  make: cmdMake,
  daily: cmdDaily,
  pfp: cmdPfp,
  banner: cmdBanner,
  sheet: cmdSheet,
  clean: cmdClean,
  help: cmdHelp,
};

const fn = table[cmd];
if (!fn) {
  console.error(`Unknown command: ${cmd}`);
  await cmdHelp();
  process.exit(1);
}
await fn();
