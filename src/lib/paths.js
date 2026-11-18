import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const P = {
  root: ROOT,
  bin: (f) => path.join(ROOT, "bin", f),
  ffmpeg: path.join(ROOT, "bin", "ffmpeg"),
  ffprobe: path.join(ROOT, "bin", "ffprobe"),
  piper: path.join(ROOT, "bin", "piper", "piper"),
  espeak: path.join(ROOT, "bin", "piper", "espeak-ng-data"),
  assets: path.join(ROOT, "assets"),
  fonts: path.join(ROOT, "assets", "fonts"),
  topics: path.join(ROOT, "topics"),
  out: path.join(ROOT, "out"),
  tmp: path.join(ROOT, ".tmp"),
  state: path.join(ROOT, "state"),
  render: path.join(ROOT, "src", "render"),
};
