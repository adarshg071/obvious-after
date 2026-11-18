// Generate profile-picture candidates and a contact sheet with circular crops.
// Usage: node scripts/pfp-lab.mjs
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { openBrowser } from "../src/render/capture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out", "pfp");
const doodles = await fs.readFile(path.join(ROOT, "src/render/doodles.js"), "utf8");

const sandbox = { window: {} };
vm.runInNewContext(doodles, sandbox);
const DOODLES = sandbox.window.DOODLES;

const INK = "#141110";
const PAPER = "#F2ECE1";
const ORANGE = "#FF5A3C";
const CREAM = "#FFFDF7";
const NAVY = "#0B1024";
const YELLOW = "#FFD84D";
const TEAL = "#54E1C8";

// Doodles are drawn in a 400x400 box with generous margins. Crop to the figure.
const crop = (svg, vb = "55 18 290 372") =>
  svg.replace('viewBox="0 0 400 400"', `viewBox="${vb}"`);

const character = (variant, accent, mood = "smile") =>
  crop(DOODLES.character({ variant, accent, ink: INK, mood }));

const cube = `
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <polygon points="200,40 340,120 200,200 60,120" fill="#FFE27A"/>
  <polygon points="60,120 200,200 200,360 60,280" fill="#E0B93A"/>
  <polygon points="340,120 200,200 200,360 340,280" fill="#B8952A"/>
  <polygon points="200,20 270,60 200,100 130,60" fill="${TEAL}"/>
  <polygon points="130,60 200,100 200,180 130,140" fill="#3CBBA6"/>
  <polygon points="270,60 200,100 200,180 270,140" fill="#2E9C8B"/>
</svg>`;

const variants = [
  {
    id: "orange-cream",
    bg: ORANGE,
    svg: character("wave", CREAM),
    fit: 800,
  },
  {
    id: "cream-orange",
    bg: PAPER,
    svg: character("stand", ORANGE),
    fit: 800,
  },
  {
    id: "navy-cube",
    bg: NAVY,
    svg: cube,
    fit: 700,
    glow: true,
  },
  {
    id: "ink-four",
    bg: INK,
    html: `<div class="four"><i style="background:${ORANGE}"></i><i style="background:${TEAL}"></i><i style="background:${YELLOW}"></i><i style="background:#4C6FFF"></i></div>`,
    fit: 520,
  },
];

function pageHtml(v) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1080px;height:1080px;overflow:hidden;}
    #c{position:relative;width:1080px;height:1080px;background:${v.bg};display:flex;align-items:center;justify-content:center;overflow:hidden;}
    ${v.glow ? `#c::before{content:"";position:absolute;inset:-10%;background:radial-gradient(50% 50% at 50% 50%, #1c2650 0%, transparent 70%);}` : ""}
    .art{position:relative;display:flex;align-items:center;justify-content:center;width:${v.fit}px;height:${v.fit}px;}
    .art svg{width:100%;height:100%;display:block;}
    .four{position:relative;display:grid;grid-template-columns:repeat(2,1fr);gap:44px;width:${v.fit}px;height:${v.fit}px;transform:rotate(-6deg);}
    .four i{display:block;border-radius:26px;}
  </style></head><body><div id="c"><div class="art">${v.html || v.svg}</div></div></body></html>`;
}

await fs.mkdir(OUT, { recursive: true });
const browser = await openBrowser();
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });

for (const v of variants) {
  await page.setContent(pageHtml(v), { waitUntil: "load" });
  await page.screenshot({ path: path.join(OUT, `${v.id}.png`) });
  console.log("wrote", `out/pfp/${v.id}.png`);
}

// Contact sheet: each candidate as a 150px circle on light and dark strips.
const cells = variants
  .map(
    (v) => `<figure>
      <div class="pair">
        <div class="circle light"><img src="${v.id}.png"></div>
        <div class="circle dark"><img src="${v.id}.png"></div>
      </div>
      <figcaption>${v.id}</figcaption>
    </figure>`
  )
  .join("");

const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#fff;font:600 20px/1.4 system-ui,sans-serif;color:#141110;}
    main{display:flex;gap:40px;padding:48px;align-items:flex-start;}
    figure{margin:0;text-align:center;}
    .pair{display:flex;gap:16px;padding:16px;border-radius:22px;background:#f4f1ec;}
    .circle{width:150px;height:150px;border-radius:50%;overflow:hidden;display:grid;place-items:center;}
    .circle img{width:100%;height:100%;object-fit:cover;}
    .light{background:#fff;}
    .dark{background:#15171c;}
    figcaption{margin-top:12px;letter-spacing:.02em;}
  </style></head><body><main>${cells}</main></body></html>`;

await fs.writeFile(path.join(OUT, "contact-sheet.html"), sheet);
await page.setViewport({ width: 1600, height: 460, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(OUT, "contact-sheet.html")}`, { waitUntil: "load" });
await page.screenshot({ path: path.join(OUT, "contact-sheet.png") });
console.log("wrote", "out/pfp/contact-sheet.png");
await page.close();
await browser.close();
