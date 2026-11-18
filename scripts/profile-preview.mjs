// Render a mock of the Instagram profile so the setup can be checked before signing up.
// Usage: node scripts/profile-preview.mjs [handle] [displayName]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "../src/render/capture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out", "profile");
const handle = process.argv[2] || "obviousafter";
const name = process.argv[3] || "Nobody Teaches You";

const covers = [
  "out/2026-11-03/chronotypes/cover.jpg",
  "out/2026-11-03/being-alone/cover.jpg",
  "out/2026-11-03/windfall/cover.jpg",
].map((p) => `file://${path.join(ROOT, p)}`);

const grid = covers
  .map((src) => `<div class="tile"><img src="${src}"></div>`)
  .join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1080px;height:1920px;background:#000;color:#f5f5f5;
    font-family:Inter,system-ui,-apple-system,sans-serif;overflow:hidden}
  .app{width:1080px;height:1920px;display:flex;flex-direction:column}
  header{display:flex;align-items:center;gap:18px;padding:34px 40px 18px;font-size:38px;font-weight:700}
  header .chev{width:18px;height:18px;border-right:3px solid #f5f5f5;border-bottom:3px solid #f5f5f5;transform:rotate(45deg)}
  header .grow{flex:1}
  header svg{width:44px;height:44px;stroke:#f5f5f5;fill:none;stroke-width:2}
  .top{display:flex;align-items:center;gap:56px;padding:26px 40px 8px}
  .avatar{width:250px;height:250px;border-radius:50%;overflow:hidden;flex:none;background:#FF5A3C}
  .avatar img{width:100%;height:100%;object-fit:cover;display:block}
  .stats{display:flex;flex:1;justify-content:space-around;text-align:center}
  .stats b{display:block;font-size:38px;font-weight:700;letter-spacing:-.01em}
  .stats span{display:block;font-size:26px;color:#c7c7c7;margin-top:2px}
  .meta{padding:18px 40px 0}
  .name{font-size:34px;font-weight:700;letter-spacing:-.01em}
  .bio{font-size:28px;line-height:1.42;margin-top:8px;color:#f0f0f0}
  .cat{font-size:25px;color:#8e8e8e;margin-top:10px}
  .actions{display:flex;gap:12px;padding:26px 40px 8px}
  .btn{flex:1;height:78px;border-radius:10px;background:#262626;display:flex;align-items:center;justify-content:center;
    font-size:28px;font-weight:600}
  .tabs{display:flex;margin-top:22px;border-top:1px solid #262626}
  .tab{flex:1;height:96px;display:flex;align-items:center;justify-content:center;border-bottom:2px solid transparent}
  .tab.on{border-bottom-color:#f5f5f5}
  .tab svg{width:42px;height:42px;stroke:#f5f5f5;fill:none;stroke-width:2}
  .tile{width:360px;height:450px;overflow:hidden;background:#111}
  .tile img{width:100%;height:100%;object-fit:cover;display:block}
  .grid{display:grid;grid-template-columns:repeat(3,360px);gap:0}
  .nav{margin-top:auto;display:flex;align-items:center;justify-content:space-around;padding:26px 28px 38px;border-top:1px solid #1c1c1c}
  .nav svg{width:48px;height:48px;stroke:#f5f5f5;fill:none;stroke-width:2}
</style></head><body>
<div class="app">
  <header><span>@${handle}</span><span class="chev"></span><span class="grow"></span>
    <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
  </header>
  <div class="top">
    <div class="avatar"><img src="file://${path.join(ROOT, "out/pfp.png")}"></div>
    <div class="stats">
      <div><b>3</b><span>posts</span></div>
      <div><b>0</b><span>followers</span></div>
      <div><b>0</b><span>following</span></div>
    </div>
  </div>
  <div class="meta">
    <div class="name">${name}</div>
    <div class="bio">the stuff nobody teaches you<br>4 types of people — which one are you?<br>save the ones that sting.</div>
    <div class="cat">Digital creator</div>
  </div>
  <div class="actions"><div class="btn">Edit profile</div><div class="btn">Share profile</div></div>
  <div class="tabs">
    <div class="tab on"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div>
    <div class="tab"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M10 8l6 4-6 4V8z"/></svg></div>
    <div class="tab"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/></svg></div>
  </div>
  <div class="grid">${grid}</div>
  <div class="nav">
    <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>
    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M10 8l6 4-6 4V8z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M4 7h16l-1.5 13h-13z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
  </div>
</div>
</body></html>`;

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, "profile.html"), html);

const browser = await openBrowser();
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(OUT, "profile.html")}`, { waitUntil: "load" });
await page.screenshot({ path: path.join(OUT, "preview.png") });
await browser.close();
console.log("wrote out/profile/preview.png");
