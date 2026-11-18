import fs from "node:fs";
import fsP from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import puppeteer from "puppeteer-core";
import { P } from "../lib/paths.js";
import { spawnPiped } from "../lib/exec.js";

const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
  ".css": "text/css; charset=utf-8",
};

function serve(root) {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/") url = "/src/world3d/index.html";
    const file = path.join(root, path.normalize(url).replace(/^(\.\.[/\\])+/, ""));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      return res.end();
    }
    try {
      const body = fs.readFileSync(file);
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

export async function openBrowser() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--force-color-profile=srgb",
      "--hide-scrollbars",
      "--font-render-hinting=none",
      "--force-device-scale-factor=1",
    ],
    defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
  });
}

export async function withStage(payload, fn) {
  const { server, port } = await serve(P.root);
  const browser = await openBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page]", String(e).slice(0, 400)));
  page.on("console", (m) => {
    if (m.type() === "error") console.error("[console]", m.text().slice(0, 400));
  });

  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/src/world3d/index.html`, { waitUntil: "load" });
  await page.evaluate((p) => window.__setup(p), payload);
  await page.waitForFunction("window.__READY__ === true", { timeout: 30000 });

  try {
    return await fn(page);
  } finally {
    // SwiftShader can wedge on teardown; the mp4 is already muxed by then, so
    // never let a stuck browser hold the run open.
    const bail = new Promise((r) => setTimeout(r, 5000));
    await Promise.race([page.close().catch(() => {}), bail]);
    const proc = browser.process?.();
    await Promise.race([browser.close().catch(() => {}), bail]);
    proc?.kill("SIGKILL");
    server.close();
  }
}

export async function renderReel({ payload, duration, fps = 30, audioFile, outFile, cleanFile, log = () => {} }) {
  const totalFrames = Math.max(1, Math.round(duration * fps));
  await fsP.mkdir(path.dirname(outFile), { recursive: true });
  const clean = cleanFile && cleanFile !== outFile ? cleanFile : null;
  if (clean) await fsP.mkdir(path.dirname(clean), { recursive: true });

  const encoder = (file) =>
    spawnPiped(P.ffmpeg, [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(fps), "-i", "pipe:0",
      "-i", audioFile,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20",
      "-profile:v", "high", "-level", "4.2",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-shortest", "-movflags", "+faststart",
      file,
    ]);

  return withStage(payload, async (page) => {
    const ff = encoder(outFile);
    const ffClean = clean ? encoder(clean) : null;
    let ffErr = "";
    ff.stderr.on("data", (d) => (ffErr += d));
    if (ffClean) ffClean.stderr.on("data", (d) => (ffErr += d));

    const write = async (stdin, dataUrl) => {
      const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
      if (!stdin.write(buf)) await once(stdin, "drain");
    };

    const started = Date.now();
    for (let i = 0; i < totalFrames; i++) {
      const ms = (i / fps) * 1000;
      const frame = await page.evaluate((t, both) => window.__frame(t, 0.92, both), ms, Boolean(ffClean));
      await write(ff.stdin, frame.card);
      if (ffClean) await write(ffClean.stdin, frame.clean);
      if (i % 60 === 0) {
        const rate = (Date.now() - started) / (i + 1);
        log(`frame ${i}/${totalFrames} · ${rate.toFixed(0)} ms/frame · eta ${(((totalFrames - i) * rate) / 1000).toFixed(0)}s`);
      }
    }

    ff.stdin.end();
    if (ffClean) ffClean.stdin.end();
    const codes = [await once(ff, "close")];
    if (ffClean) codes.push(await once(ffClean, "close"));
    for (const [code] of codes) {
      if (code !== 0) throw new Error(`ffmpeg failed (${code})\n${ffErr.slice(-2000)}`);
    }

    return { frames: totalFrames, ms: Date.now() - started, clean };
  });
}
