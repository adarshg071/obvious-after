/* Isometric "blocky 3D" figures, drawn as shaded cube faces.
   Deterministic, no WebGL, no textures. */
(function () {
  const COS = 0.8660254;
  const proj = (x, y, z) => [(x - y) * COS, (x + y) * 0.5 - z];

  function mul(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const t = (v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0");
    return "#" + t((n >> 16) & 255) + t((n >> 8) & 255) + t(n & 255);
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g},${b})`;
  }

  function cube(c, P) {
    const { x, y, z, w, d, h } = c;
    const p = (X, Y, Z) => P(X, Y, Z).join(",");
    const top = [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)];
    const left = [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)];
    const right = [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)];
    return [
      `<polygon points="${right.join(" ")}" fill="${shade(c.fill, 0.60)}"/>`,
      `<polygon points="${left.join(" ")}" fill="${shade(c.fill, 0.82)}"/>`,
      `<polygon points="${top.join(" ")}" fill="${shade(c.fill, 1.08)}"/>`,
    ].join("");
  }

  const PALETTE = {
    shirt: "#FFD84D",
    pants: "#3B4874",
    skin: "#E9B98F",
    hair: "#171C2E",
    shoe: "#F4F1E8",
    platform: "#161D38",
  };

  function build({ variant, accent }) {
    const S = { ...PALETTE, shirt: accent };
    const c = [];
    const add = (x, y, z, w, d, h, fill, layer = 2) =>
      c.push({ x, y, z, w, d, h, fill, layer });

    // stage
    add(-0.6, -0.45, -0.24, 3.1, 2.1, 0.24, S.platform, 0);

    const torsoZ = variant === "sit" ? 1.24 : variant === "slump" ? 1.58 : 1.72;
    const torsoH = variant === "slump" ? 1.92 : 2.08;
    const arm = mul(accent, 0.82);

    // legs + shoes
    if (variant === "sit") {
      add(0.62, 0.5, 0.78, 0.46, 1.45, 0.5, S.pants, 1.4); // thighs forward
      add(1.22, 0.5, 0.78, 0.46, 1.45, 0.5, S.pants, 1.4);
      add(0.62, 1.82, 0.05, 0.46, 0.58, 0.78, S.pants, 1.5); // shins
      add(1.22, 1.82, 0.05, 0.46, 0.58, 0.78, S.pants, 1.5);
      add(0.6, 1.72, 0, 0.5, 0.76, 0.26, S.pants, 1.6);
      add(1.2, 1.72, 0, 0.5, 0.76, 0.26, S.pants, 1.6);
    } else {
      add(0.62, 0.5, 0, 0.46, 0.62, torsoZ, S.pants, 1);
      add(1.22, 0.5, 0, 0.46, 0.62, torsoZ, S.pants, 1);
      add(0.6, 0.4, 0, 0.5, 0.7, 0.24, S.pants, 1.2);
      add(1.2, 0.4, 0, 0.5, 0.7, 0.24, S.pants, 1.2);
    }

    // torso
    add(0.4, 0.3, torsoZ, 1.5, 1.15, torsoH, S.shirt, 2);

    // arms
    const armZ = torsoZ + 0.32;
    if (variant === "wave") {
      add(-0.04, 0.44, armZ, 0.38, 0.7, 1.26, arm, 3);
      add(1.92, 0.44, 3.35, 0.38, 0.7, 1.4, arm, 3);
      add(1.9, 0.42, 4.75, 0.42, 0.74, 0.4, S.skin, 3.1);
    } else if (variant === "slump") {
      add(-0.04, 0.44, armZ - 0.08, 0.38, 0.7, 1.2, arm, 3);
      add(1.92, 0.44, armZ - 0.08, 0.38, 0.7, 1.2, arm, 3);
    } else if (variant === "sit") {
      add(-0.04, 0.56, armZ, 0.38, 0.88, 1.08, arm, 3);
      add(1.92, 0.56, armZ, 0.38, 0.88, 1.08, arm, 3);
      add(-0.06, 0.6, 2.34, 0.42, 0.94, 0.34, S.skin, 3.1); // hands on knees
      add(1.9, 0.6, 2.34, 0.42, 0.94, 0.34, S.skin, 3.1);
    } else {
      add(-0.04, 0.44, armZ, 0.38, 0.7, 1.3, arm, 3);
      add(1.92, 0.44, armZ, 0.38, 0.7, 1.3, arm, 3);
    }

    // head + hair
    const headZ = variant === "sit" ? 3.2 : variant === "slump" ? 3.46 : 3.84;
    add(0.55, 0.4, headZ, 1.2, 0.9, 0.98, S.skin, 4);
    add(0.53, 0.38, headZ + 0.86, 1.24, 0.94, 0.26, S.hair, 4.2);
    add(0.53, 1.28, headZ + 0.62, 1.24, 0.12, 0.24, S.hair, 4.3);

    return { cubes: c, eyes: { z: headZ + 0.44, y: 1.305, r: 0.062 } };
  }

  function figure({ variant = "stand", accent = PALETTE.shirt, ink = "#0B1024" } = {}) {
    const { cubes, eyes } = build({ variant, accent });
    const pts = [];
    for (const c of cubes) {
      for (const dx of [0, c.w])
        for (const dy of [0, c.d])
          for (const dz of [0, c.h]) pts.push(proj(c.x + dx, c.y + dy, c.z + dz));
    }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const s = Math.min(772 / (maxX - minX), 772 / (maxY - minY));
    const ox = 400 - ((minX + maxX) / 2) * s;
    const oy = 400 - ((minY + maxY) / 2) * s;
    const P = (x, y, z) => {
      const [a, b] = proj(x, y, z);
      return [a * s + ox, b * s + oy];
    };

    // contact shadow under the stage
    const sh = P(0.95, 0.6, -0.235);
    const shadow = `<ellipse cx="${sh[0]}" cy="${sh[1]}" rx="${s * 1.72}" ry="${s * 0.52}" fill="rgba(0,0,0,.30)"/>`;

    // face: two eyes + a small mouth on the front plane of the head
    const e1 = P(0.82, eyes.y, eyes.z);
    const e2 = P(1.28, eyes.y, eyes.z);
    const eyeR = Math.max(3, s * eyes.r);
    const mouth = P(1.05, eyes.y, eyes.z - 0.2);
    const face =
      `<circle cx="${e1[0]}" cy="${e1[1]}" r="${eyeR}" fill="${ink}"/>` +
      `<circle cx="${e2[0]}" cy="${e2[1]}" r="${eyeR}" fill="${ink}"/>` +
      `<rect x="${mouth[0] - eyeR * 0.75}" y="${mouth[1] - eyeR * 0.2}" width="${eyeR * 1.5}" height="${eyeR * 0.42}" rx="${eyeR * 0.2}" fill="${ink}"/>`;

    // back-to-front by layer, then by depth within a layer
    const sorted = [...cubes].sort((a, b) => a.layer - b.layer || a.x + a.y - (b.x + b.y));
    const body = sorted.map((c) => cube(c, P)).join("");

    return `<svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">${shadow}${body}${face}</svg>`;
  }

  function cubeIcon({ accent = "#FFD84D", ink = "#0B1024" } = {}) {
    const c = { x: 0, y: 0, z: 0, w: 1, d: 1, h: 1, fill: accent };
    const small = { x: 0.28, y: 0.28, z: 1, w: 0.44, d: 0.44, h: 0.44, fill: accent };
    const S = 150, ox = 200, oy = 190;
    const P = (x, y, z) => {
      const [a, b] = proj(x - 0.5, y - 0.5, z - 0.5);
      return [a * S + ox, b * S + oy];
    };
    return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">${cube(c, P)}${cube(small, P)}</svg>`;
  }

  window.VOXEL = { figure, cubeIcon };
})();
