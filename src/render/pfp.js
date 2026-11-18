import fs from "node:fs/promises";
import path from "node:path";
import { P } from "../lib/paths.js";
import { ensureDir } from "../lib/fsx.js";
import { openBrowser } from "./capture.js";

function pfpHtml(config) {
  const ink = config.theme.ink;
  const accent = config.theme.accents[0];
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:1080px;height:1080px;overflow:hidden;}
  #c{position:relative;width:1080px;height:1080px;background:${accent};display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .doodle{width:820px;height:820px;}
  .doodle svg{width:100%;height:100%;display:block;}
</style></head>
<body><div id="c"><div class="doodle" id="d"></div></div>
<script>/*__DOODLES__*/</script>
<script>
  // Crop the 400x400 drawing box down to the figure so it reads at 32px.
  document.getElementById('d').innerHTML = window.DOODLES
    .character({ variant: 'wave', accent: '#FFFDF7', ink: '${ink}', mood: 'smile' })
    .replace('viewBox="0 0 400 400"', 'viewBox="55 18 290 372"');
  document.fonts.ready.then(()=>{window.__READY__=true;});
</script>
</body></html>`;
}

export async function renderPfp(config, outFile) {
  const doodles = await fs.readFile(path.join(P.render, "doodles.js"), "utf8");
  const html = pfpHtml(config).replace("/*__DOODLES__*/", doodles);
  await ensureDir(path.dirname(outFile));
  const browser = await openBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction("window.__READY__ === true", { timeout: 15000 });
    await page.screenshot({ path: outFile, type: "png" });
    await page.close();
  } finally {
    await browser.close();
  }
  return outFile;
}
