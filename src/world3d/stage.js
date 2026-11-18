import * as THREE from "three";
import { makeCharacter, poseCharacter } from "./rig.js";
import { buildSet } from "./sets.js";

const W = 1080;
const H = 1920;

const glCanvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 300);

const out = document.createElement("canvas");
out.width = W;
out.height = H;
const ctx = out.getContext("2d");

const SHOTS = {
  wide: { r: 11.0, y: 2.2, ty: 1.4, fov: 42 },
  two: { r: 7.1, y: 1.9, ty: 1.45, fov: 38 },
  medium: { r: 6.8, y: 1.8, ty: 1.4, fov: 36 },
  close: { r: 4.5, y: 2.0, ty: 1.95, fov: 32 },
  ots: { r: 4.3, y: 1.9, ty: 1.6, fov: 34 },
  door: { r: 3.2, y: 1.55, ty: 1.5, fov: 34 },
  tight: { r: 2.9, y: 1.4, ty: 1.25, fov: 34 },
};

const GRADE = {
  bus_stop: { bg: 0x0d1526, fog: 0.016, hemiSky: 0x93b4e6, hemiGround: 0x1a1620, hemi: 1.0, key: 0xa8beff, keyI: 2.4 },
  bedroom: { bg: 0x100c18, fog: 0.012, hemiSky: 0x8f9ecf, hemiGround: 0x1d1216, hemi: 0.7, key: 0x9fb4ff, keyI: 1.5, faceFill: 26 },
  diner: { bg: 0x0b0e15, fog: 0.024, hemiSky: 0x7f93bd, hemiGround: 0x1c1410, hemi: 0.6, key: 0xc3d4f5, keyI: 1.5, faceFill: 30 },
  laundromat: { bg: 0x0a0d12, fog: 0.021, hemiSky: 0x9db2d0, hemiGround: 0x15181e, hemi: 0.8, key: 0xcfe0f5, keyI: 1.3, faceFill: 24 },
  library: { bg: 0x0a0d0c, fog: 0.026, hemiSky: 0x6d8390, hemiGround: 0x180f0a, hemi: 0.42, key: 0xffc98a, keyI: 0.8, faceFill: 12, exposure: 1.08 },
  // the same room at 6:52 a.m.: cold light through the glass, the lamps still off
  morning: { bg: 0x141c26, fog: 0.019, hemiSky: 0x9fbad8, hemiGround: 0x1b1712, hemi: 0.62, key: 0xb9d0ee, keyI: 1.5, faceFill: 13, exposure: 1.06 },
  street: { bg: 0x0c1424, fog: 0.028, hemiSky: 0x9dc0e8, hemiGround: 0x2a1e1a, hemi: 1.15, key: 0xa8c0f0, keyI: 2.4, faceFill: 26, exposure: 1.3 },
  balcony: { bg: 0x0b1526, fog: 0.013, hemiSky: 0x93b2da, hemiGround: 0x2a201c, hemi: 0.9, key: 0x9db6de, keyI: 1.9, faceFill: 20, exposure: 1.02 },
  jungle: { bg: 0x08120f, fog: 0.028, hemiSky: 0x7a99c4, hemiGround: 0x201a12, hemi: 0.75, key: 0x9db6de, keyI: 1.1, faceFill: 8, exposure: 1.1 },
};

let story = null;
let scenes = [];
let current = -1;
let lastT = 0;

const easeOutSine = (x) => Math.sin((x * Math.PI) / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/* ---------- text ---------- */

function parseRich(text) {
  return text.split(/\s+/).filter(Boolean).map((w) => {
    const accent = w.startsWith("*");
    return { text: w.replace(/\*/g, ""), accent };
  });
}

function wrapRich(tokens, maxWidth, size) {
  ctx.font = `900 ${size}px Archivo`;
  const lines = [];
  let line = [];
  let width = 0;
  const space = ctx.measureText(" ").width;
  for (const tk of tokens) {
    const w = ctx.measureText(tk.text.toUpperCase()).width;
    if (line.length && width + space + w > maxWidth) {
      lines.push(line);
      line = [];
      width = 0;
    }
    line.push({ ...tk, w });
    width += (line.length > 1 ? space : 0) + w;
  }
  if (line.length) lines.push(line);
  return { lines, space };
}

function drawRich(text, { x = W / 2, y = H * 0.58, size = 92, maxWidth = 880, accent = "#35d8ff", alpha = 1 } = {}) {
  const tokens = parseRich(text.toUpperCase());
  const { lines, space } = wrapRich(tokens, maxWidth, size);
  const lineH = size * 1.08;
  const startY = y - ((lines.length - 1) * lineH) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px Archivo`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = size * 0.28;
  ctx.shadowOffsetY = size * 0.08;

  lines.forEach((line, li) => {
    const total = line.reduce((s, t) => s + t.w, 0) + space * (line.length - 1);
    let cx = x - total / 2;
    const ly = startY + li * lineH;
    for (const tk of line) {
      ctx.fillStyle = tk.accent ? accent : "#ffffff";
      ctx.fillText(tk.text, cx, ly);
      cx += tk.w + space;
    }
  });
  ctx.restore();
}

/* ---------- comment card ---------- */

const headAt = new THREE.Vector3();

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* The spoken line also lands on screen: a comment card whose tail points at
   whoever is talking. With the speaker out of shot the card sits centred. */
function drawCard(who, say, hx, hy, t, from, out = 1, mode = null) {
  const narration = mode === "narration";
  const size = narration ? 48 : 44;
  const pad = 30;
  const maxW = narration ? 620 : 560;
  const body = say.replace(/^[—–-]\s*/, "").replace(/…/g, "...").trim();

  ctx.font = `600 ${size}px InterB`;
  const lines = [];
  let cur = "";
  for (const word of body.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(next).width > maxW) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);

  const lh = size * 1.3;
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = Math.min(maxW, textW) + pad * 2;
  const nameH = narration ? 0 : 34;
  const h = nameH + lines.length * lh + pad * 2;
  const seen = !narration && hx !== null;
  const x = seen ? Math.max(56, Math.min(W - w - 56, hx - w / 2)) : (W - w) / 2;
  const tx = seen ? Math.max(x + 46, Math.min(x + w - 46, hx)) : x + w / 2;

  // Always the lower third: the app's caption bar sits above it, the icon bar
  // below, and the faces stay clear. Only a speaker already low in frame
  // pushes the card above their head, where the tail then points down.
  let top = H * 0.8 - h;
  let up = true;
  if (seen && hy > top + 60) {
    top = Math.max(H * 0.15, hy - h - 110);
    up = false;
  }
  const edge = up ? top : top + h;

  const pop = 1 - Math.pow(1 - clamp01((t - from) / 0.16), 3);
  const tipY = seen ? edge + (up ? -1 : 1) * Math.min(96, Math.abs(hy - edge) * 0.6) : edge;

  ctx.save();
  ctx.globalAlpha = pop * out;
  // pop out of the tail tip so the card reads as coming from the speaker
  ctx.translate(tx, tipY);
  ctx.scale(0.86 + 0.14 * pop, 0.86 + 0.14 * pop);
  ctx.translate(-tx, -tipY);

  ctx.fillStyle = "rgba(9,11,16,0.88)";
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  roundRect(x, top, w, h, 30);
  ctx.fill();

  if (seen) {
    ctx.beginPath();
    ctx.moveTo(tx - 24, edge);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(tx + 24, edge);
    ctx.closePath();
    ctx.fill();
  }

  roundRect(x, top, w, h, 30);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (!narration) {
    ctx.font = `700 24px InterB`;
    ctx.fillStyle = "#35d8ff";
    ctx.fillText(`@${who}`, x + pad, top + pad + 6);
  }

  ctx.font = `600 ${size}px InterB`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 12;
  if (narration) {
    // a line of narration has no speaker: centred, and it sits on the picture
    // rather than pointing at anyone
    ctx.textAlign = "center";
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2, top + pad + lh * (i + 0.78)));
  } else {
    lines.forEach((l, i) => ctx.fillText(l, x + pad, top + pad + 34 + lh * (i + 0.78)));
  }
  ctx.restore();
}

/* ---------- grain + vignette ---------- */

let vignette = null;
const noises = [];

function buildOverlays() {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.16, W / 2, H * 0.5, H * 0.78);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.62, "rgba(0,0,0,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0.42)");
  vignette = g;

  for (let n = 0; n < 4; n++) {
    const c = document.createElement("canvas");
    c.width = 270;
    c.height = 480;
    const x = c.getContext("2d");
    const img = x.createImageData(270, 480);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    noises.push(c);
  }
}

/* ---------- setup ---------- */

window.__READY__ = false;

window.__setup = async (payload) => {
  story = payload.story;
  scenes = story.scenes;

  await document.fonts.load('900 92px Archivo');
  buildOverlays();

  const grade = GRADE[story.grade || scenes[0].set] || GRADE.bus_stop;
  renderer.toneMappingExposure = grade.exposure ?? 1.3;
  scene.background = new THREE.Color(grade.bg);
  scene.fog = new THREE.FogExp2(grade.bg, grade.fog);

  const hemi = new THREE.HemisphereLight(grade.hemiSky, grade.hemiGround, grade.hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(grade.key, grade.keyI);
  key.position.set(-5, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.0008;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x44608a, 0.45);
  fill.position.set(6, 4, -6);
  scene.add(fill);

  // camera-mounted fill: guarantees faces are never a silhouette
  const faceFill = new THREE.PointLight(0xffd9b4, grade.faceFill ?? 9, 16, 2);
  faceFill.position.set(0, 2.2, 5);
  scene.add(faceFill);
  scene.userData.faceFill = faceFill;

  // rim light separates blocky silhouettes from the night
  const rim = new THREE.DirectionalLight(0x6f8fd6, 1.1);
  rim.position.set(3, 5, -7);
  scene.add(rim);

  for (const sc of scenes) {
    const built = buildSet(sc.set, sc.opts || {}, sc.start);
    sc.__set = built;
    sc.__update = built.update;
    sc.__actors = [];

    const seat = typeof sc.seat === "number" ? sc.seat : built.seat;
    sc.__tx = sc.cast.length
      ? sc.cast.reduce((s, c) => s + (c.x || 0), 0) / sc.cast.length
      : 0;

    for (const c of sc.cast) {
      const base = payload.characters[c.id];
      // a scene may drop a character's props: the notebook does not come to the jungle
      const spec = {
        ...base,
        ...(c.props ? { props: c.props } : {}),
        ...(c.wardrobe ? { wardrobe: c.wardrobe } : {}),
      };
      const ch = makeCharacter(spec);
      ch.group.position.x = c.x || 0;
      ch.group.position.z = c.z || 0;
      ch.group.rotation.y = c.faceTo || 0;
      const sits = (c.pose || "").startsWith("sit") || c.pose === "call";
      ch.__sit = sits;
      ch.__seat = seat;
      ch.__basePose = c.pose || "idle";
      built.group.add(ch.group);

      // contact shadow
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.62, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false })
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.set(c.x || 0, 0.012, (c.z || 0) + 0.08);
      built.group.add(sh);

      sc.__actors.push({
        id: c.id,
        ch,
        x: c.x || 0,
        z: c.z || 0,
        sits,
        seat,
        phase: sc.__actors.length * 1.7,
        business: c.business || null,
        gaze: { y: 0, x: 0 },
      });
    }

    built.group.visible = false;
    scene.add(built.group);
  }

  window.__READY__ = true;
};

function activeLine(sc, t) {
  for (const ln of sc.lines || []) {
    if (t >= ln.t0 && t < ln.t1 + 0.12) return ln;
  }
  return null;
}

function updateCamera(sc, local, t) {
  const c = sc.cam || {};
  const shot = SHOTS[c.shot] || SHOTS.medium;
  const p = clamp01(local / Math.max(0.001, sc.end - sc.start));
  const e = easeOutSine(p);
  const move = c.move || "static";

  let r = shot.r;
  if (move === "push") r = shot.r * (1 - 0.16 * e);
  if (move === "pull") r = shot.r * (1.14 - 0.14 * e);

  const angle = ((c.angle ?? 0) * Math.PI) / 180;
  let tx = c.targetX ?? sc.__tx ?? 0;
  if (move === "track") tx += (c.pan ?? 1.4) * (e - 0.5);
  const ty = c.targetY ?? shot.ty;
  const tz = c.targetZ ?? 0;
  let cx = tx + Math.sin(angle) * r;
  let cy = c.y ?? shot.y;
  let cz = tz + Math.cos(angle) * r;
  if (move === "handheld") {
    // breathing operator: far too small to read as a bug, big enough to feel alive
    cx += Math.sin(t * 1.7) * 0.03 + Math.sin(t * 5.3) * 0.012;
    cy += Math.sin(t * 2.3 + 1.1) * 0.025;
  }
  camera.position.set(cx, cy, cz);
  camera.lookAt(tx, ty, tz);
  camera.fov = shot.fov + (c.fovAdd || 0);
  camera.updateProjectionMatrix();

  const ff = scene.userData.faceFill;
  if (ff) ff.position.set(camera.position.x * 0.72, ty + 0.35, camera.position.z * 0.92);
}

window.__frame = (ms, quality = 0.92, both = false) => {
  const t = ms / 1000;
  const dt = Math.max(0.001, t - lastT);
  lastT = t;

  let idx = 0;
  for (let i = 0; i < scenes.length; i++) if (t >= scenes[i].start) idx = i;
  if (idx !== current) {
    scenes.forEach((s, i) => (s.__set.group.visible = i === idx));
    current = idx;
  }
  const sc = scenes[idx];
  const local = t - sc.start;

  updateCamera(sc, local, t);
  sc.__update(t, dt);

  const line = activeLine(sc, t);
  const speaker = line ? sc.__actors.find((o) => o.id === line.who) : null;
  for (const a of sc.__actors) {
    const speaking = Boolean(line && line.who === a.id);
    const pose = speaking ? line.pose || "talk" : a.ch.__basePose;
    const still = Boolean(line && line.react === "still");
    poseCharacter(a.ch, pose, t, {
      talking: speaking,
      sit: a.sits,
      seat: a.ch.__seat,
      call: a.ch.__basePose === "call",
      phase: a.phase,
      walk: a.ch.__basePose === "walk",
      business: speaking || still ? null : a.business,
    });

    // Gaze, held across frames: the listener looks at whoever is talking and
    // drifts back to the page when the room goes quiet. The body already faces
    // the other person, so only the leftover angle goes into the neck.
    const other = sc.__actors.find((o) => o !== a);
    const target = speaking ? other : speaker;
    let yaw = 0;
    if (target) {
      const want = Math.atan2(target.x - a.x, target.z - a.z) - a.ch.group.rotation.y;
      const residual = Math.atan2(Math.sin(want), Math.cos(want));
      yaw = Math.max(-0.32, Math.min(0.32, residual));
    }
    let pitch = 0;
    if (line && !still) {
      const react = line.react || "look";
      if (speaking) {
        const look = line.look || "other";
        pitch = look === "down" ? 0.22 : 0;
        yaw = look === "other" ? yaw : 0;
      } else {
        yaw = react === "away" ? -0.34 : yaw;
        pitch = react === "down" ? 0.2 : 0;
      }
    } else if (!line && a.business === "read") {
      pitch = 0.16;
    }
    const k = 1 - Math.exp(-dt * 4.5);
    a.gaze.y += (yaw - a.gaze.y) * k;
    a.gaze.x += (pitch - a.gaze.x) * k;
    a.ch.head.rotation.y += a.gaze.y;
    a.ch.head.rotation.x += a.gaze.x;
    if (line && !speaking && line.react === "nod") a.ch.head.rotation.x += 0.07 * Math.sin(t * 7.5);
    if (line && !speaking && line.react === "lean") a.ch.torso.rotation.x += 0.1;
    // the reel's one laugh is a reaction the speaker makes with head and shoulders
    if (line && speaking && line.laugh) {
      a.ch.head.rotation.x -= 0.2 + Math.sin(t * 12) * 0.06;
      a.ch.torso.rotation.x -= 0.06 + Math.sin(t * 12 + 0.8) * 0.04;
    }
  }

  renderer.render(scene, camera);

  // ---- composite ----
  ctx.globalAlpha = 1;
  ctx.drawImage(glCanvas, 0, 0, W, H);

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  const fi = Math.round(ms / 33.33);
  const tile = noises[fi % noises.length];
  ctx.globalAlpha = 0.05;
  const ox = (fi * 37) % 270;
  const oy = (fi * 53) % 480;
  for (let y = -oy; y < H; y += 480) {
    for (let x = -ox; x < W; x += 270) {
      ctx.drawImage(tile, x, y);
    }
  }
  ctx.globalAlpha = 1;

  if (sc.caption) {
    const from = sc.start + (sc.caption.from || 0);
    const dur = sc.caption.dur || 2.5;
    if (t >= from && t <= from + dur) {
      const fadeIn = clamp01((t - from) / 0.18);
      const fadeOut = clamp01((from + dur - t) / 0.22);
      drawRich(sc.caption.text, {
        y: H * (sc.caption.y ?? 0.74),
        size: sc.caption.size || 92,
        alpha: Math.min(fadeIn, fadeOut),
        accent: sc.caption.accent || "#35d8ff",
      });
    }
  }

  if (story.endCard && t >= story.endCard.from) {
    const e = story.endCard;
    const p = clamp01((t - e.from) / 0.3);
    drawRich(e.text, { y: H * 0.5, size: e.size || 128, alpha: p, accent: e.accent || "#35d8ff" });
    if (e.sub) {
      ctx.save();
      ctx.globalAlpha = p * 0.75;
      ctx.font = "700 42px InterB";
      ctx.fillStyle = "#dfe6f0";
      ctx.textAlign = "center";
      ctx.fillText(e.sub.toUpperCase(), W / 2, H * 0.5 + 130);
      ctx.restore();
    }
  }

  // one 3D frame, two deliveries: the clean plate for YouTube (subtitles come
  // from the .srt) and the carded frame Instagram gets. Grabbing the plate
  // before the card costs a second JPEG encode, not a second render.
  const clean = both ? out.toDataURL("image/jpeg", quality) : null;

  const carded = Boolean(line && line.card !== false);
  if (carded) {
    const p = speaker && speaker.ch.head.getWorldPosition(headAt).project(camera);
    const seen = Boolean(p) && p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1;
    drawCard(
      line.who,
      line.say,
      seen ? (p.x * 0.5 + 0.5) * W : null,
      seen ? (-p.y * 0.5 + 0.5) * H : null,
      t,
      line.t0,
      clamp01((line.t1 + 0.1 - t) / 0.14),
      line.mode
    );
  }

  const card = carded ? out.toDataURL("image/jpeg", quality) : clean || out.toDataURL("image/jpeg", quality);
  return { clean, card };
};
