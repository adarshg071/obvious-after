import fs from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import puppeteer from "puppeteer-core";
import { P } from "../lib/paths.js";
import { run } from "../lib/exec.js";

const CHROME =
  process.env.CHROME_PATH ||
  ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium"].find(Boolean);

let cache = null;

async function b64(file, mime) {
  const buf = await fs.readFile(file);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function loadTemplate() {
  if (cache) return cache;
  const [html, css, doodles, voxel, reel] = await Promise.all([
    fs.readFile(path.join(P.render, "reel.html"), "utf8"),
    fs.readFile(path.join(P.render, "reel.css"), "utf8"),
    fs.readFile(path.join(P.render, "doodles.js"), "utf8"),
    fs.readFile(path.join(P.render, "voxel.js"), "utf8"),
    fs.readFile(path.join(P.render, "reel.js"), "utf8"),
  ]);
  const [archivo, inter, interBlack] = await Promise.all([
    b64(path.join(P.fonts, "ArchivoBlack.ttf"), "font/ttf"),
    b64(path.join(P.fonts, "Inter-Bold.ttf"), "font/ttf"),
    b64(path.join(P.fonts, "Inter-Black.ttf"), "font/ttf"),
  ]);
  const cssInlined = css
    .replace("__FONT_ARCHIVO__", archivo)
    .replace("__FONT_INTER_BLACK__", interBlack)
    .replace("__FONT_INTER__", inter);

  cache = html
    .replace("/*__CSS__*/", cssInlined)
    .replace("/*__DOODLES__*/", doodles)
    .replace("/*__VOXEL__*/", voxel)
    .replace("/*__REEL__*/", reel);
  return cache;
}

export async function buildPageHtml(data) {
  const tpl = await loadTemplate();
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return tpl.replace("/*__DATA__*/", `window.__REEL__ = ${json};`);
}

export async function openBrowser() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--force-color-profile=srgb",
      "--hide-scrollbars",
      "--font-render-hinting=none",
      "--force-device-scale-factor=1",
    ],
    defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
  });
}

export async function renderVideo(data, { outFile, audioFile, fps = 30, crf = 20, preset = "veryfast", browser }) {
  const html = await buildPageHtml(data);
  const own = !browser;
  const b = browser || (await openBrowser());
  const page = await b.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction("window.__READY__ === true", { timeout: 20000 });

  const totalFrames = Math.max(1, Math.round(data.duration * fps));
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-framerate",
    String(fps),
    "-i",
    "pipe:0",
    "-i",
    audioFile,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-profile:v",
    "high",
    "-level",
    "4.2",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-shortest",
    "-movflags",
    "+faststart",
    outFile,
  ];

  const { spawnPiped } = await import("../lib/exec.js");
  const ff = spawnPiped(P.ffmpeg, args);
  let ffErr = "";
  ff.stderr.on("data", (d) => (ffErr += d));

  for (let i = 0; i < totalFrames; i++) {
    const ms = (i / fps) * 1000;
    await page.evaluate((t) => window.renderAt(t), ms);
    const buf = await page.screenshot({ type: "jpeg", quality: 94, optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await once(ff.stdin, "drain");
  }

  ff.stdin.end();
  const [code] = await once(ff, "close");
  await page.close();
  if (own) await b.close();
  if (code !== 0) throw new Error(`ffmpeg failed (${code}):\n${ffErr.slice(-2000)}`);

  return { frames: totalFrames };
}

export async function renderStill(page, { html, timeMs, outFile, file }) {
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction("window.__READY__ === true", { timeout: 20000 });
  await page.evaluate((t) => window.renderAt(t), timeMs);
  await page.screenshot({ path: outFile, type: "jpeg", quality: 95 });
  return outFile;
}

export async function probeDuration(file) {
  const { out } = await run(P.ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file,
  ]);
  return parseFloat(out.trim());
}
