import { spawn } from "node:child_process";

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} exited ${code}\n${err.slice(-2500)}`));
    });
    if (opts.stdin) {
      p.stdin.end(opts.stdin);
    }
  });
}

export function runStdout(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ["pipe", "pipe", "pipe"] });
    const chunks = [];
    let err = "";
    p.stdout.on("data", (d) => chunks.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`${cmd} exited ${code}\n${err.slice(-2500)}`));
    });
    if (opts.stdin) p.stdin.end(opts.stdin);
  });
}

export function spawnPiped(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { ...opts, stdio: ["pipe", "pipe", "pipe"] });
  return p;
}
