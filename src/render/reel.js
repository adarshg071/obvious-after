/* Deterministic animation engine. renderAt(ms) must fully describe the frame. */
(function () {
  const D = window.__REEL__;
  const stage = document.getElementById("stage");
  const beatsEl = document.getElementById("beats");
  const capsEl = document.getElementById("caps");
  const progressFill = document.querySelector("#progress i");
  const brandEl = document.getElementById("brand");

  const root = document.documentElement.style;
  root.setProperty("--paper", D.theme.paper);
  root.setProperty("--ink", D.theme.ink);
  root.setProperty("--muted", D.theme.muted);
  root.setProperty("--accent", D.accent || "#FFD84D");
  if (D.style && D.style !== "doodle") document.body.classList.add(D.style);

  const icon = (name, accent) =>
    D.style === "voxel"
      ? window.VOXEL.cubeIcon({ accent, ink: D.theme.paper })
      : window.DOODLES.prop(name, { accent, ink: D.theme.ink });

  const figure = (b) =>
    D.style === "voxel"
      ? window.VOXEL.figure({ variant: b.character || "stand", accent: b.accent, ink: D.theme.paper })
      : window.DOODLES.character({
          variant: b.character || "stand",
          accent: b.accent,
          ink: D.theme.ink,
          mood: b.mood || "smile",
        });

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (u) => 1 - Math.pow(1 - clamp01(u), 3);
  const back = (u) => {
    u = clamp01(u);
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
  };
  const seg = (u, a, b) => clamp01((u - a) / (b - a || 0.0001));

  // Three entrance beats so every reel doesn't move the same way.
  const MOTION = D.motion || "rise";
  const SNAP = MOTION === "snap";   // comic: fast, oversized, a little off-axis
  const DRIFT = MOTION === "drift"; // love: slow, soft, floating

  if (D.brand && D.brand.tagline) {
    brandEl.innerHTML = `<span class="dot"></span><span>${D.brand.tagline}</span>`;
  } else {
    brandEl.style.display = "none";
  }

  function renderLines(lines, cls) {
    return lines
      .map((segs) => {
        const inner = segs
          .map((s) =>
            s.hl
              ? `<span class="hl"><span class="hl-bg"></span>${s.t}</span>`
              : `<span>${s.t}</span>`
          )
          .join("");
        return `<div class="${cls}">${inner}</div>`;
      })
      .join("");
  }

  function buildBeat(b) {
    const el = document.createElement("div");
    el.className = "beat";
    el.style.setProperty("--accent", b.accent);

    // scene reels draw hook + dialogue in the persistent #scene layer
    if (b.kind === "line" || (D.format === "scene" && b.kind === "hook")) {
      return { el, update() {} };
    }

    const geo =
      b.kind === "type"
        ? { w: 1020, h: 1020, top: 150, left: 30 }
        : b.kind === "kicker"
        ? { w: 1100, h: 1100, top: 380, left: -10 }
        : { w: 900, h: 900, top: 400, left: 90 };
    const blob = document.createElement("div");
    blob.className = "beat-blob";
    blob.style.cssText = `width:${geo.w}px;height:${geo.h}px;top:${geo.top}px;left:${geo.left}px;background:${b.accent}`;
    el.appendChild(blob);

    if (b.kind === "hook") {
      el.innerHTML = `
        <div class="hook-wrap">
          <div class="hook-icon">${b.icon ? icon(b.icon, b.accent) : ""}</div>
          ${renderLines(b.lines, "hook-line display")}
        </div>`;
      const iconEl = el.querySelector(".hook-icon");
      const lines = [...el.querySelectorAll(".hook-line")];
      const bgs = [...el.querySelectorAll(".hl-bg")];
      return {
        el,
        update(u) {
          if (SNAP) {
            const pi = back(seg(u, 0.02, 0.18));
            iconEl.style.transform = `scale(${0.6 + pi * 0.4}) rotate(${(1 - pi) * -8}deg)`;
            iconEl.style.opacity = clamp01(seg(u, 0.01, 0.08));
            lines.forEach((ln, i) => {
              const p = back(seg(u, 0.08 + i * 0.06, 0.26 + i * 0.06));
              ln.style.opacity = clamp01(seg(u, 0.06 + i * 0.06, 0.14 + i * 0.06));
              ln.style.transform = `translateY(${(1 - p) * 82}px) rotate(${(1 - p) * -3}deg)`;
            });
          } else if (DRIFT) {
            const pi = ease(seg(u, 0.03, 0.6));
            iconEl.style.transform = `scale(${0.88 + pi * 0.12}) translateY(${Math.sin(u * Math.PI * 2) * 8}px)`;
            iconEl.style.opacity = clamp01(seg(u, 0.01, 0.25));
            lines.forEach((ln, i) => {
              const p = ease(seg(u, 0.1 + i * 0.18, 0.62 + i * 0.18));
              ln.style.opacity = p;
              ln.style.transform = `translateY(${(1 - p) * 62}px)`;
            });
          } else {
            const pi = back(seg(u, 0.04, 0.5));
            iconEl.style.transform = `scale(${pi}) translateY(${(1 - ease(seg(u, 0.04, 0.5))) * 30}px)`;
            iconEl.style.opacity = clamp01(seg(u, 0.02, 0.2));
            lines.forEach((ln, i) => {
              const p = ease(seg(u, 0.18 + i * 0.12, 0.55 + i * 0.12));
              ln.style.opacity = p;
              ln.style.transform = `translateY(${(1 - p) * 44}px)`;
            });
          }
          bgs.forEach((bg) => {
            bg.style.transform = `scaleX(${ease(seg(u, SNAP ? 0.02 : 0.06, SNAP ? 0.14 : 0.32))})`;
          });
        },
      };
    }

    if (b.kind === "type") {
      el.innerHTML = `
        <div class="card">
          <div class="card-blob"></div>
          <div class="card-idx">${b.index}/${b.total}</div>
          <div class="card-figure">${figure(b)}</div>
          <div class="card-name display">${b.name}</div>
          <div class="card-tag">${b.tag}</div>
        </div>`;
      if (b.icon) {
        const fig = el.querySelector(".card-figure");
        const p = document.createElement("div");
        const bubble =
          D.style === "voxel"
            ? "background:rgba(11,16,36,.9);border:3px solid rgba(246,242,231,.22);"
            : "background:#FFFDF7;border:8px solid " + D.theme.ink + ";";
        p.className = "card-icon";
        p.style.cssText =
          "position:absolute;right:-26px;bottom:10px;width:212px;height:212px;" +
          bubble +
          "border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;";
        p.innerHTML = `<div style="width:170px;height:170px;margin-top:14px">${icon(b.icon, b.accent)}</div>`;
        fig.appendChild(p);
      }
      const card = el.querySelector(".card");
      const fig = el.querySelector(".card-figure");
      const name = el.querySelector(".card-name");
      const tag = el.querySelector(".card-tag");
      const idx = el.querySelector(".card-idx");
      const blob = el.querySelector(".card-blob");
      return {
        el,
        update(u) {
          const c = ease(seg(u, 0, SNAP ? 0.12 : 0.22));
          card.style.opacity = c;
          const din = 1 - c;
          card.style.transform = SNAP
            ? `scale(${1.08 - c * 0.08}) translateY(${din * 90}px) rotate(${din * 5}deg)`
            : `scale(${0.94 + c * 0.06}) translateY(${din * 36}px) rotate(-1.2deg)`;
          const fp = back(seg(u, 0.03, SNAP ? 0.18 : 0.3));
          fig.style.transform = `scale(${fp}) translateY(${Math.sin(u * Math.PI * 2) * (DRIFT ? 9 : 4)}px)`;
          fig.style.opacity = clamp01(seg(u, 0.01, 0.1));
          const n = ease(seg(u, SNAP ? 0.12 : 0.22, SNAP ? 0.3 : 0.45));
          name.style.opacity = n;
          name.style.transform = `translateY(${(1 - n) * 28}px)`;
          const tg = back(seg(u, SNAP ? 0.3 : 0.4, SNAP ? 0.45 : 0.62));
          tag.style.opacity = clamp01(seg(u, SNAP ? 0.3 : 0.4, SNAP ? 0.38 : 0.5));
          tag.style.transform = `translateX(-50%) scale(${Math.max(0.001, tg)})`;
          idx.style.opacity = clamp01(seg(u, 0.3, 0.5));
          blob.style.transform = `scale(${1 + u * 0.06}) rotate(${u * 8}deg)`;
        },
      };
    }

    if (b.kind === "kicker") {
      el.innerHTML = `<div class="kicker-wrap">${renderLines(b.lines, "kicker-line display")}</div>`;
      const lines = [...el.querySelectorAll(".kicker-line")];
      const marks = [...el.querySelectorAll(".mark")];
      marks.forEach((m) => (m.style.transform = "scaleX(0)"));
      return {
        el,
        update(u) {
          lines.forEach((ln, i) => {
            const p = ease(seg(u, (SNAP ? 0.03 : 0.04) + i * (SNAP ? 0.07 : 0.14), (SNAP ? 0.22 : 0.4) + i * (SNAP ? 0.07 : 0.14)));
            ln.style.opacity = p;
            ln.style.transform = `translateY(${(1 - p) * (SNAP ? 60 : 34)}px)`;
          });
          marks.forEach((m) => {
            m.style.transform = `scaleX(${ease(seg(u, SNAP ? 0.12 : 0.3, SNAP ? 0.28 : 0.6))})`;
          });
        },
      };
    }

    if (b.kind === "list") {
      el.innerHTML = `<div class="list-wrap">${b.items
        .map(
          (it, i) =>
            `<div class="list-row"><div class="num">${i + 1}</div><div>${it}</div></div>`
        )
        .join("")}</div>`;
      const rows = [...el.querySelectorAll(".list-row")];
      return {
        el,
        update(u) {
          rows.forEach((r, i) => {
            const p = ease(seg(u, 0.05 + i * 0.16, 0.4 + i * 0.16));
            r.style.opacity = p;
            r.style.transform = `translateX(${(1 - p) * -34}px)`;
          });
        },
      };
    }

    // end
    el.innerHTML = `
      <div class="end-wrap">
        <div class="end-icon">${icon(b.icon || "burst", b.accent)}</div>
        ${renderLines(b.lines, "end-line display")}
        ${b.sub ? `<div class="end-sub">${b.sub}</div>` : ""}
        ${b.pill ? `<div class="end-pill">${b.pill}</div>` : ""}
      </div>`;
    const endIcon = el.querySelector(".end-icon");
    const lines = [...el.querySelectorAll(".end-line")];
    const pill = el.querySelector(".end-pill");
    const sub = el.querySelector(".end-sub");
    return {
      el,
      update(u) {
        const p = back(seg(u, 0.02, 0.42));
        endIcon.style.transform = `scale(${Math.max(0.001, SNAP ? 0.4 + p * 0.6 : p)}) rotate(${SNAP ? (1 - p) * -10 : 0}deg)`;
        lines.forEach((ln, i) => {
          const q = ease(seg(u, (SNAP ? 0.08 : 0.14) + i * (SNAP ? 0.06 : 0.1), (SNAP ? 0.26 : 0.44) + i * (SNAP ? 0.06 : 0.1)));
          ln.style.opacity = q;
          ln.style.transform = `translateY(${(1 - q) * 30}px)`;
        });
        if (sub) {
          const q = ease(seg(u, 0.4, 0.6));
          sub.style.opacity = q;
          sub.style.transform = `translateY(${(1 - q) * 16}px)`;
        }
        if (pill) {
          const q = back(seg(u, 0.5, 0.75));
          pill.style.opacity = clamp01(seg(u, 0.5, 0.6));
          pill.style.transform = `scale(${Math.max(0.001, q)})`;
        }
      },
    };
  }

  // ---------- scene / story (dialogue reels) ----------
  let sceneEl = null;
  let sceneBeat = -1;
  let sceneTitle = null;
  let bubble = null;
  let propEl = null;
  const actors = new Map(); // name -> { el, inner, mouth, eyes }
  const ambient = { el: null, parts: [], key: "", kind: null };

  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const marks = (s) =>
    s
      .split(/\*(.+?)\*/g)
      .map((t, i) => ({ t: esc(t), hl: i % 2 === 1 }))
      .filter((m) => m.t !== "");
  const actorFigure = (c, mood) =>
    D.style === "voxel"
      ? window.VOXEL.figure({ variant: c.figure || "stand", accent: c.accent, ink: D.theme.paper })
      : window.DOODLES.character({
          variant: c.figure || "stand",
          accent: c.accent,
          ink: D.theme.ink,
          mood: mood || c.mood || "smile",
        });
  const seeded = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  function buildAmbient(s) {
    const key = `${s.bg}/${s.time}`;
    if (ambient.key === key) return;
    ambient.key = key;
    const el = ambient.el;
    el.className = "ambient";
    el.innerHTML = "";
    el.style.opacity = "";
    ambient.parts = [];
    const kind =
      s.bg === "street" && s.time === "night"
        ? "rain"
        : s.bg === "park"
        ? "dust"
        : s.time === "night"
        ? "glow"
        : null;
    ambient.kind = kind;
    if (!kind) return;
    el.classList.add(kind);
    const n = kind === "rain" ? 34 : kind === "steam" ? 3 : kind === "dust" ? 16 : 1;
    for (let i = 0; i < n; i++) {
      const r = (k) => seeded(i * 7.3 + k * 13.7);
      const d = document.createElement("span");
      d.style.left = `${(r(1) * 100).toFixed(1)}%`;
      if (kind === "rain") d.style.height = `${(40 + r(2) * 80).toFixed(0)}px`;
      el.appendChild(d);
      ambient.parts.push({ el: d, x: r(1), y: r(3), sp: 0.05 + r(4) * 0.12, amp: 8 + r(5) * 26, ph: r(6) * 6.28 });
    }
  }

  if (D.format === "scene") {
    const cast = D.cast || {};
    sceneEl = document.createElement("div");
    sceneEl.id = "scene";
    sceneEl.innerHTML =
      `<div class="backdrop"></div><div class="ambient"></div><div class="scene-title display"></div><div class="bubble"></div>` +
      Object.entries(cast)
        .map(([name, c]) => {
          const x = typeof c.x === "number" ? c.x : 0.5;
          return `<div class="actor" data-name="${name}" style="--x:${x}">
            <div class="actor-inner">${actorFigure(c)}</div>
          </div>`;
        })
        .join("") +
      `<div class="prop"></div>`;
    stage.appendChild(sceneEl);
    sceneTitle = sceneEl.querySelector(".scene-title");
    bubble = sceneEl.querySelector(".bubble");
    propEl = sceneEl.querySelector(".prop");
    ambient.el = sceneEl.querySelector(".ambient");
    sceneEl.querySelectorAll(".actor").forEach((el) => {
      const c = cast[el.dataset.name] || {};
      actors.set(el.dataset.name, {
        el,
        inner: el.querySelector(".actor-inner"),
        mouth: el.querySelector(".mouth"),
        eyes: el.querySelector(".eyes"),
        x: parseFloat(el.style.getPropertyValue("--x")),
        baseX: parseFloat(el.style.getPropertyValue("--x")),
        scale: typeof c.scale === "number" ? c.scale : 1,
      });
    });
  }

  function setSceneBeat(i) {
    const b = D.beats[i];
    sceneBeat = i;
    const s = (D.scenes || [])[b.scene || 0] || { bg: "room", time: "day", cast: [] };
    sceneEl.dataset.bg = s.bg;
    sceneEl.dataset.time = s.time;
    sceneTitle.innerHTML = b.kind === "hook" ? renderLines(b.lines, "hook-line display") : "";
    actors.forEach((a, name) => {
      a.el.classList.toggle("in", s.cast.includes(name));
      const px = s.pos && typeof s.pos[name] === "number" ? s.pos[name] : a.baseX;
      a.el.style.left = `${px * 100}%`;
      a.x = px;
    });

    // The speaker wears the line's expression; everyone else keeps their cast face.
    const isLine = b.kind === "line";
    actors.forEach((a, name) => {
      const c = (D.cast || {})[name] || {};
      const mood = isLine && name === b.who ? b.mood || c.mood : c.mood;
      const figure = isLine && name === b.who && b.figure ? b.figure : c.figure;
      a.inner.innerHTML = actorFigure({ ...c, figure }, mood);
      a.mouth = a.inner.querySelector(".mouth");
      a.eyes = a.inner.querySelector(".eyes");
    });

    buildAmbient(s);

    // One prop at a time, in the speaker's outer hand so it never covers a face.
    const sx =
      s.pos && typeof s.pos[b.who] === "number"
        ? s.pos[b.who]
        : typeof (D.cast || {})[b.who]?.x === "number"
        ? D.cast[b.who].x
        : 0.5;
    propEl.style.setProperty("--prop-x", typeof b.propX === "number" ? b.propX : isLine ? sx + (sx <= 0.5 ? -0.09 : 0.09) : 0.5);
    propEl.innerHTML = b.prop ? icon(b.prop, b.accent || D.accent) : "";
    propEl.classList.toggle("on", Boolean(b.prop));

    bubble.classList.toggle("on", isLine && Boolean(b.text));
    bubble.style.opacity = "0";
    bubble.innerHTML = "";
    if (!isLine || !b.text) return;
    const c = (D.cast || {})[b.who] || {};
    bubble.style.setProperty("--accent", c.accent || D.accent);
    // Sit above the speaker's head (480px art centred in the 700px actor box), never over a face.
    const headTop = 400 + (c.figure === "slump" ? 488 : 525) * (c.scale || 1);
    bubble.style.bottom = `${Math.max(960, Math.min(1180, Math.round(headTop + 46)))}px`;
    // A close-up zooms about frame centre, so centre the bubble and let the tail point at the speaker.
    const x = b.cam === "close" ? 0.5 : Math.min(0.66, Math.max(0.34, sx));
    bubble.style.left = `${x * 100}%`;
    const tail = Math.max(-260, Math.min(260, (sx - x) * 1080));
    bubble.style.setProperty("--tail", `${tail.toFixed(1)}px`);
    bubble.innerHTML = `<span class="say">${marks(b.text || "")
      .map((m) => (m.hl ? `<span class="hl">${m.t}</span>` : m.t))
      .join(" ")}</span>`;
  }

  const built = D.beats.map((b) => {
    const node = buildBeat(b);
    node.el.classList.add("beat");
    beatsEl.appendChild(node.el);
    return { ...node, t0: b.t0, t1: b.t1, kind: b.kind, cam: b.cam, react: b.react };
  });

  const sceneStart = [];
  if (sceneEl) {
    D.beats.forEach((b) => {
      const si = b.scene || 0;
      if (sceneStart[si] === undefined) sceneStart[si] = b.t0;
    });
  }

  // captions
  const caps = (D.caps || []).map((c) => {
    const el = document.createElement("div");
    el.className = "cap";
    el.innerHTML = c.words
      .map((w) => `<span class="w" data-t0="${w.t0}" data-t1="${w.t1}">${w.w}</span>`)
      .join("");
    capsEl.appendChild(el);
    const spans = [...el.querySelectorAll(".w")];
    return { el, spans, t0: c.t0, t1: c.t1 };
  });

  let last = -1;
  window.renderAt = function (ms) {
    const t = ms / 1000;
    if (t === last) return;
    last = t;

    progressFill.style.width = `${clamp01(t / D.duration) * 100}%`;


    let active = -1;
    for (let i = 0; i < built.length; i++) {
      if (t >= built[i].t0 && t < built[i].t1) {
        active = i;
        break;
      }
    }
    if (active === -1 && t >= built[built.length - 1].t1) active = built.length - 1;

    // camera: push into hooks and reveals, let the payoff breathe
    if (active >= 0) {
      const ab = built[active];
      const u = clamp01((t - ab.t0) / Math.max(0.001, ab.t1 - ab.t0));
      let scale = 1.02 + u * 0.012;
      if (ab.kind === "hook") scale = 1.0 + ease(u) * 0.055;
      else if (ab.kind === "kicker") scale = 1.0 + ease(u) * 0.04;
      else if (ab.cam === "push") scale = 1.02 + ease(u) * 0.05;
      else if (ab.cam === "pull") scale = 1.06 - ease(u) * 0.05;
      else if (ab.cam === "snap") scale = 1.0 + Math.min(1, u * 3.5) * 0.12;
      else if (ab.cam === "close") scale = 1.18 + ease(u) * 0.04;
      const shake = ab.cam === "shake" ? Math.sin(t * 92) * 9 * (1 - u) : 0;
      stage.style.transform = `scale(${scale.toFixed(4)}) translate(${shake.toFixed(1)}px, ${(-u * 8).toFixed(1)}px)`;
    }

    // scene reels: one persistent cast, bubbles carry the dialogue
    if (sceneEl) {
      const sb = active >= 0 ? D.beats[active] : null;
      const inScene = !!sb && (sb.kind === "hook" || sb.kind === "line");
      sceneEl.style.display = inScene ? "block" : "none";
      if (inScene) {
        if (sceneBeat !== active) setSceneBeat(active);
        const u = clamp01((t - sb.t0) / Math.max(0.001, sb.t1 - sb.t0));
        const si = sb.scene || 0;
        const sinceScene = t - (sceneStart[si] ?? sb.t0);
        // each scene cut lights up from a dim backdrop
        sceneEl.querySelector(".backdrop").style.opacity = 0.4 + 0.6 * ease(seg(sinceScene, 0, 0.22));

        sceneEl.style.setProperty("--px", (Math.sin(t * 0.7) * 7).toFixed(1));

        actors.forEach((a, name) => {
          const speaking = sb.kind === "line" && sb.who === name;
          const bob = Math.sin(t * 6.5 + a.x * 9) * 4;
          const lift = speaking ? Math.abs(Math.sin(t * 9)) * 9 : 0;
          const lean = speaking ? (a.x > 0.5 ? -2.4 : 2.4) : 0;
          // a listener takes the hit: quick pop away from the speaker, then settle
          const take = sb.react && !speaking ? Math.sin(Math.min(1, u * 2.4) * Math.PI) : 0;
          a.inner.style.transform = `translateY(${bob + lift - take * 24}px) rotate(${lean}deg) scale(${a.scale * (speaking ? 1.02 : 1) * (1 + take * 0.16)})`;
          const phase = (t + a.x * 1.7) % 4.2;
          if (a.eyes) a.eyes.style.transform = take > 0.25 ? "scale(1.45)" : phase < 0.11 ? "scaleY(0.12)" : "scaleY(1)";
          if (a.mouth) {
            a.mouth.style.transform = speaking
              ? `scaleY(${0.45 + 0.75 * Math.abs(Math.sin(t * 14))})`
              : "scaleY(1)";
          }
        });

        // ambient weather / light, driven by video time so every frame is deterministic
        if (ambient.parts.length) {
          const kind = ambient.kind;
          if (kind === "glow") {
            ambient.el.style.opacity = (0.55 + 0.25 * Math.sin(t * 2.3)).toFixed(3);
          } else {
            ambient.parts.forEach((p) => {
              let x = p.x * 1080;
              let y;
              if (kind === "rain") {
                y = ((p.y + p.sp * t * 5) % 1) * 1300 - 120;
              } else if (kind === "steam") {
                y = 1320 - ((p.y + p.sp * t) % 1) * 880;
                x = 120 + p.x * 780 + Math.sin(t * 1.3 + p.ph) * 26;
              } else {
                y = ((p.y + p.sp * t * 0.35) % 1) * 1200;
                x = p.x * 1080 + Math.sin(t * 0.8 + p.ph) * p.amp;
              }
              p.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            });
          }
        }

        if (sb.kind === "hook") {
          const lines = [...sceneTitle.querySelectorAll(".hook-line")];
          lines.forEach((ln, i) => {
            const p = ease(seg(u, 0.02 + i * 0.07, 0.26 + i * 0.07));
            ln.style.opacity = p;
            ln.style.transform = `translateY(${(1 - p) * 40}px)`;
          });
          propEl.style.opacity = sb.prop ? clamp01(seg(u, 0, 0.05)) : 0;
          propEl.style.transform = `translateX(-50%) translateY(${sb.propY || 0}px) rotate(${sb.propTurn || 0}deg) scale(${(0.7 + back(seg(u, 0, 0.14)) * 0.3) * (sb.propScale || 1)})`;
        } else {
          const pop = back(seg(u, 0, 0.1));
          bubble.style.opacity = sb.text ? clamp01(seg(u, 0, 0.05)) : 0;
          bubble.style.transform = `translateX(-50%) scale(${0.92 + pop * 0.08})`;
          propEl.style.opacity = sb.prop ? clamp01(seg(u, 0, 0.05)) : 0;
          propEl.style.transform = `translateX(-50%) translateY(${sb.propY || 0}px) rotate(${sb.propTurn || 0}deg) scale(${(0.7 + back(seg(u, 0, 0.14)) * 0.3) * (sb.propScale || 1)})`;
        }
      }
    }

    built.forEach((b, i) => {
      if (i === active) {
        if (!b.el.classList.contains("on")) b.el.classList.add("on");
        b.update(t - b.t0);
        const blob = b.el.querySelector(".beat-blob");
        if (blob) {
          const u = (t - b.t0) / Math.max(0.001, b.t1 - b.t0);
          blob.style.transform = SNAP
            ? `scale(${1.06 + u * 0.1}) translateY(${-u * 46}px) rotate(${u * -6}deg)`
            : DRIFT
            ? `scale(${1 + u * 0.09}) translateX(${u * 46}px)`
            : `scale(${1 + u * 0.12}) translateY(${-u * 20}px)`;
        }
      } else {
        b.el.classList.remove("on");
      }
    });

    caps.forEach((c) => {
      const on = t >= c.t0 && t < c.t1;
      if (on !== c.el.classList.contains("on")) c.el.classList.toggle("on", on);
      if (on) {
        c.spans.forEach((s) => {
          const a = parseFloat(s.dataset.t0);
          const b = parseFloat(s.dataset.t1);
          const q = clamp01((t - a) / 0.16);
          const isOn = t >= a && t < b;
          s.style.transform = `scale(${0.96 + q * 0.04 + (isOn ? 0.05 : 0)})`;
          s.style.opacity = 1;
          if (isOn) s.classList.add("on");
          else s.classList.remove("on");
        });
      }
    });
  };

  document.fonts.ready.then(() => {
    window.renderAt(0);
    window.__READY__ = true;
  });
})();
