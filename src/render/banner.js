import fs from "node:fs/promises";
import path from "node:path";
import { P } from "../lib/paths.js";
import { ensureDir } from "../lib/fsx.js";
import { openBrowser } from "./capture.js";

const W = 2048;
const H = 1152;

function bannerHtml(config, { tagline, name }) {
  const ink = config.theme.ink;
  const accent = config.theme.accents[0];
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face{font-family:Archivo;src:url(__FONT_ARCHIVO__);}
  @font-face{font-family:Inter;src:url(__FONT_INTER__);font-weight:700;}
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;}
  #c{position:relative;width:${W}px;height:${H}px;background:${accent};display:flex;align-items:center;justify-content:center;}
  .lock{display:flex;align-items:center;gap:56px;width:1235px;height:338px;justify-content:center;}
  .doodle{width:300px;height:300px;flex:none;}
  .doodle svg{width:100%;height:100%;display:block;}
  .type{display:flex;flex-direction:column;gap:14px;}
  h1{margin:0;font-family:Archivo;font-size:104px;line-height:.95;letter-spacing:-2px;color:#FFFDF7;text-transform:uppercase;}
  p{margin:0;font-family:Inter;font-weight:700;font-size:34px;letter-spacing:.02em;color:${ink};opacity:.75;}
</style></head>
<body><div id="c"><div class="lock">
  <div class="doodle" id="d"></div>
  <div class="type"><h1>${name}</h1><p>${tagline}</p></div>
</div></div>
<script>/*__DOODLES__*/</script>
<script>
  document.getElementById('d').innerHTML = window.DOODLES
    .character({ variant: 'wave', accent: '#FFFDF7', ink: '${ink}', mood: 'smile' })
    .replace('viewBox="0 0 400 400"', 'viewBox="55 18 290 372"');
  document.fonts.ready.then(()=>{window.__READY__=true;});
</script>
</body></html>`;
}

export async function renderBanner(config, outFile) {
  const [doodles, archivo, inter] = await Promise.all([
    fs.readFile(path.join(P.render, "doodles.js"), "utf8"),
    fs.readFile(path.join(P.fonts, "ArchivoBlack.ttf")),
    fs.readFile(path.join(P.fonts, "Inter-Bold.ttf")),
  ]);
  const html = bannerHtml(config, { tagline: "the stuff nobody teaches you", name: "Obvious After" })
    .replace("/*__DOODLES__*/", doodles)
    .replace("__FONT_ARCHIVO__", `data:font/ttf;base64,${archivo.toString("base64")}`)
    .replace("__FONT_INTER__", `data:font/ttf;base64,${inter.toString("base64")}`);
  await ensureDir(path.dirname(outFile));
  const browser = await openBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction("window.__READY__ === true", { timeout: 15000 });
    await page.screenshot({ path: outFile, type: "png" });
    await page.close();
  } finally {
    await browser.close();
  }
  return outFile;
}
