/* Doodle primitives — every function returns a complete 400x400 SVG. */
(function () {
  const SW = 9;

  const wrap = (inner, vb = "0 0 400 400") =>
    `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;

  const line = (d, ink, w = SW) =>
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  const face = (ink, cy, mood) => {
    const eyes = `<g class="eyes"><circle cx="181" cy="${cy - 8}" r="7" fill="${ink}"/><circle cx="219" cy="${cy - 8}" r="7" fill="${ink}"/></g>`;
    const mouths = {
      smile: `M184 ${cy + 18} q16 15 32 0`,
      flat: `M186 ${cy + 20} h28`,
      frown: `M184 ${cy + 24} q16 -13 32 0`,
      open: `M186 ${cy + 16} q14 18 28 0`,
      wavy: `M184 ${cy + 20} q8 -8 16 0 q8 8 16 0`,
    };
    // .mouth is animated by the scene renderer to flap while a character speaks
    return eyes + `<g class="mouth">${line(mouths[mood] || mouths.flat, ink, 7)}</g>`;
  };

  function character({ variant = "stand", accent = "#FF5A3C", ink = "#141110", mood = "smile" }) {
    let headY = 116;
    let bodyPath;
    let arms;
    let legs;
    let extra = "";

    const base = `M156 196 q44 -14 88 0 l10 118 q-54 20 -108 0 z`;

    if (variant === "slump") {
      headY = 148;
      bodyPath = `M158 218 q42 -16 84 0 l8 104 q-50 18 -100 0 z`;
      arms = `M162 252 q-24 34 -16 62M238 252 q20 30 14 56`;
      legs = `M178 322 q-10 24 -6 42M222 322 q10 24 6 42`;
    } else if (variant === "wave") {
      bodyPath = base;
      arms = `M162 234 q-32 18 -38 52M238 228 q36 -34 30 -78`;
      legs = `M180 318 l-6 50M220 318 l6 50`;
    } else if (variant === "sit") {
      bodyPath = `M158 206 q42 -12 84 0 l6 84 q-48 16 -96 0 z`;
      arms = `M164 240 q-22 26 -14 48M236 240 q22 26 14 48`;
      legs = `M188 288 q-40 24 -32 62M212 288 q40 24 32 62`;
      extra = line(`M152 292 q48 16 96 0`, ink, 7);
    } else {
      bodyPath = base;
      arms = `M162 236 q-26 30 -22 60M238 236 q26 30 22 60`;
      legs = `M180 316 l-6 52M220 316 l6 52`;
    }

    const inner = `
      ${line(legs, ink)}
      <path d="${bodyPath}" fill="${accent}" stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"/>
      ${line(arms, ink)}
      <circle cx="200" cy="${headY}" r="58" fill="#FFFDF7" stroke="${ink}" stroke-width="${SW}"/>
      ${face(ink, headY, mood)}
      ${extra}`;

    return wrap(inner);
  }

  function battery({ accent, ink, level = 0.55 }) {
    const h = 190;
    const fillH = Math.max(12, h * level);
    return wrap(`
      <rect x="148" y="104" width="104" height="196" rx="18" fill="#FFFDF7" stroke="${ink}" stroke-width="${SW}"/>
      <rect x="180" y="86" width="40" height="22" rx="6" fill="${ink}"/>
      <rect x="162" y="${104 + h - fillH + 10}" width="76" height="${Math.max(0, fillH - 20)}" rx="10" fill="${accent}"/>`);
  }

  function phone({ accent, ink }) {
    return wrap(`
      <rect x="128" y="66" width="144" height="268" rx="26" fill="#FFFDF7" stroke="${ink}" stroke-width="${SW}"/>
      <rect x="150" y="110" width="100" height="152" rx="10" fill="${accent}" opacity=".4"/>
      <rect x="184" y="84" width="32" height="8" rx="4" fill="${ink}"/>
      <circle cx="200" cy="300" r="13" fill="none" stroke="${ink}" stroke-width="7"/>`);
  }

  function moon({ accent, ink }) {
    return wrap(
      `<path d="M258 92 a106 106 0 1 0 0 216 a84 84 0 1 1 0 -216 z" fill="${accent}" stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"/>`
    );
  }

  function sun({ accent, ink }) {
    let rays = "";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      rays += line(
        `M${(200 + Math.cos(a) * 98).toFixed(0)} ${(200 + Math.sin(a) * 98).toFixed(0)} L${(200 + Math.cos(a) * 128).toFixed(0)} ${(200 + Math.sin(a) * 128).toFixed(0)}`,
        ink,
        8
      );
    }
    return wrap(`${rays}<circle cx="200" cy="200" r="70" fill="${accent}" stroke="${ink}" stroke-width="${SW}"/>`);
  }

  function clock({ accent, ink, hand = 0.3 }) {
    const a = -Math.PI / 2 + hand * Math.PI * 2;
    return wrap(`
      <circle cx="200" cy="200" r="112" fill="#FFFDF7" stroke="${ink}" stroke-width="${SW}"/>
      ${line(`M200 200 L200 126`, accent, 11)}
      ${line(`M200 200 L${(200 + Math.cos(a) * 76).toFixed(0)} ${(200 + Math.sin(a) * 76).toFixed(0)}`, ink, 11)}
      <circle cx="200" cy="200" r="9" fill="${ink}"/>`);
  }

  function coin({ accent, ink }) {
    return wrap(`
      <circle cx="200" cy="200" r="110" fill="${accent}" stroke="${ink}" stroke-width="${SW}"/>
      <circle cx="200" cy="200" r="84" fill="none" stroke="${ink}" stroke-width="6" opacity=".45"/>
      <text x="200" y="250" text-anchor="middle" font-family="Archivo Black, sans-serif" font-size="132" fill="${ink}">$</text>`);
  }

  function chart({ accent, ink }) {
    const bars = [72, 132, 104, 172];
    return wrap(
      bars
        .map(
          (h, i) =>
            `<rect x="${94 + i * 58}" y="${312 - h}" width="42" height="${h}" rx="8" fill="${i === 3 ? accent : "#FFFDF7"}" stroke="${ink}" stroke-width="${SW}"/>`
        )
        .join("") + line("M84 316 H330", ink, 8)
    );
  }

  function heart({ accent, ink }) {
    return wrap(
      `<path d="M200 322 C118 260 86 210 86 168 a60 60 0 0 1 114 -26 a60 60 0 0 1 114 26 c0 42 -32 92 -114 154 z" fill="${accent}" stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"/>`
    );
  }

  function bed({ accent, ink }) {
    return wrap(`
      <rect x="66" y="196" width="268" height="92" rx="16" fill="${accent}" stroke="${ink}" stroke-width="${SW}"/>
      <rect x="84" y="154" width="92" height="52" rx="18" fill="#FFFDF7" stroke="${ink}" stroke-width="${SW}"/>
      ${line(`M70 288 v44`, ink)}
      ${line(`M330 288 v44`, ink)}
      ${line(`M66 196 v-26`, ink)}`);
  }

  function coffee({ accent, ink }) {
    return wrap(`
      <path d="M136 188 h124 v82 a46 46 0 0 1 -46 46 h-32 a46 46 0 0 1 -46 -46 z" fill="#FFFDF7" stroke="${ink}" stroke-width="${SW}"/>
      <path d="M260 208 h20 a28 28 0 0 1 0 56 h-20" fill="none" stroke="${ink}" stroke-width="${SW}"/>
      <rect x="136" y="188" width="124" height="26" fill="${accent}" opacity=".65"/>
      ${line(`M176 158 q12 -20 0 -36`, ink, 7)}
      ${line(`M214 158 q12 -20 0 -36`, ink, 7)}`);
  }

  function cloud({ accent, ink }) {
    return wrap(
      `<path d="M118 282 a54 54 0 0 1 8 -106 a64 64 0 0 1 118 -16 a48 48 0 0 1 56 64 a46 46 0 0 1 -16 58 z" fill="${accent}" stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"/>`
    );
  }

  function key({ accent, ink }) {
    return wrap(`
      <circle cx="146" cy="168" r="56" fill="none" stroke="${ink}" stroke-width="${SW}"/>
      <circle cx="146" cy="168" r="20" fill="${accent}" stroke="${ink}" stroke-width="6"/>
      ${line(`M192 206 L302 316`, ink, 13)}
      ${line(`M268 282 L300 250`, ink, 13)}`);
  }

  function burst({ accent, ink }) {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      const r = i % 2 === 0 ? 132 : 74;
      pts.push(`${(200 + Math.cos(a) * r).toFixed(0)},${(200 + Math.sin(a) * r).toFixed(0)}`);
    }
    return wrap(`<polygon points="${pts.join(" ")}" fill="${accent}" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>`);
  }

  function leaf({ accent, ink }) {
    return wrap(`
      <path d="M296 92 q-96 8 -150 62 q-42 42 -24 104 q62 18 104 -24 q54 -54 70 -142z" fill="${accent}" stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M126 252 q86 -86 164 -150M168 216 l-6 -44M206 178 l-4 -44M242 142 l-2 -40" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>
      <path d="M120 300 q26 -18 48 -12" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`);
  }

  function umbrella({ accent, ink }) {
    return wrap(`
      <path d="M62 210 q138 -168 276 0 q-34 -20 -69 0 q-34 -20 -69 0 q-34 -20 -69 0 q-34 -20 -69 0z" fill="${accent}" stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M200 210 v104 q0 34 -30 34 q-23 0 -29 -22" fill="none" stroke="${ink}" stroke-width="${SW}" stroke-linecap="round"/>
      <path d="M200 78 v-16" fill="none" stroke="${ink}" stroke-width="${SW}" stroke-linecap="round"/>`);
  }

  function photo({ accent, ink }) {
    return wrap(`
      <rect x="106" y="74" width="188" height="252" rx="12" fill="#FFFDF7" stroke="${ink}" stroke-width="${SW}"/>
      <rect x="128" y="98" width="144" height="158" rx="6" fill="${accent}" opacity=".35" stroke="${ink}" stroke-width="6"/>
      <circle cx="200" cy="150" r="30" fill="#FFFDF7" stroke="${ink}" stroke-width="7"/>
      <path d="M152 234 q48 -54 96 0" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
      <path d="M188 292 q12 12 24 0" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`);
  }

  const PROPS = { battery, phone, moon, sun, clock, coin, chart, heart, bed, coffee, cloud, key, burst, photo, leaf, umbrella };

  window.DOODLES = {
    character,
    prop(name, o) {
      const fn = PROPS[name] || PROPS.burst;
      return fn(o);
    },
    has(name) {
      return Boolean(PROPS[name]);
    },
  };
})();
