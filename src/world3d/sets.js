import * as THREE from "three";

/* Sets are built from boxes. Fog and practical lights hide the seams. */

const M = (color, o = {}) =>
  new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.82, metalness: 0.04, ...o });

function box(parent, w, h, d, m, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.rotation) mesh.rotation.set(...opts.rotation);
  parent.add(mesh);
  return mesh;
}

function plane(parent, w, h, m, x, y, z, rot = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

function glow(color, intensity = 2.5) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.6,
  });
}

function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function makeRain(parent, count = 950, z0 = -11, dz = 15, x0 = -13, dx = 26) {
  const pos = new Float32Array(count * 6);
  const speed = new Float32Array(count);
  const len = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = x0 + seeded(i * 3.1) * dx;
    const y = seeded(i * 5.7) * 12;
    const z = z0 + seeded(i * 7.9) * dz;
    const l = 0.22 + seeded(i * 13.7) * 0.3;
    len[i] = l;
    pos[i * 6] = x;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x;
    pos[i * 6 + 4] = y - l;
    pos[i * 6 + 5] = z;
    speed[i] = 11 + seeded(i * 11.3) * 9;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xc6dcf2, transparent: true, opacity: 0.62, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  parent.add(lines);

  return {
    update(t, dt) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const d = speed[i] * dt;
        p[i * 6 + 1] -= d;
        p[i * 6 + 4] -= d;
        if (p[i * 6 + 4] < -0.2) {
          const y = 11.8 + seeded(i * 17.3 + Math.floor(t * 10)) * 0.6;
          p[i * 6 + 1] = y;
          p[i * 6 + 4] = y - len[i];
        }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

function cityBackdrop(parent, { z = -15, count = 6 } = {}) {
  const wallMat = M(0x171a24, { roughness: 0.95 });
  const winMat = glow(0x4d6ea8, 1.25);
  const winWarm = glow(0xd8a05a, 1.4);
  for (let i = 0; i < count; i++) {
    const h = 7 + seeded(i * 2.3) * 9;
    const w = 3.4 + seeded(i * 4.7) * 2.6;
    const x = -13 + i * 4.6;
    box(parent, w, h, 3, wallMat, x, h / 2, z, { cast: false });
    for (let r = 0; r < Math.floor(h / 2.6); r++) {
      for (let c = 0; c < 3; c++) {
        if (seeded(i * 31 + r * 7 + c) < 0.42) continue;
        plane(
          parent,
          0.5,
          0.62,
          seeded(i + r * 3 + c) > 0.7 ? winWarm : winMat,
          x - w / 2 + 0.8 + c * 1.05,
          1.7 + r * 2.5,
          z + 1.52
        );
      }
    }
  }
}

function busStop() {
  const group = new THREE.Group();
  const update = [];
  group.userData = { seat: 0.72 };

  // ground
  const asphalt = M(0x14161d, { roughness: 0.42, metalness: 0.34 });
  plane(group, 90, 90, asphalt, 0, -0.17, -10, [-Math.PI / 2, 0, 0]);
  const pavement = M(0x2b2c33, { roughness: 0.88 });
  box(group, 90, 0.32, 7.2, pavement, 0, -0.16, 0.4, { cast: false });

  // curb
  box(group, 90, 0.26, 0.3, M(0x3a3b44), 0, -0.1, -3.2, { cast: false });

  // road markings
  const paint = glow(0x9aa3a8, 0.35);
  for (let i = -8; i < 9; i++) box(group, 1.6, 0.02, 0.14, paint, i * 4.2, -0.15, -5.4, { cast: false });

  // shelter
  const steel = M(0x2a2e38, { roughness: 0.5, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fc4dd,
    transparent: true,
    opacity: 0.14,
    roughness: 0.1,
    metalness: 0.2,
  });
  for (const [x, z] of [[-1.75, -0.15], [1.75, -0.15], [-1.75, -1.15], [1.75, -1.15]]) {
    box(group, 0.1, 3.3, 0.1, steel, x, 1.65, z);
  }
  box(group, 3.85, 0.14, 1.6, steel, 0, 3.4, -0.65);
  plane(group, 3.5, 2.6, glass, 0, 1.55, -1.13);
  plane(group, 1.3, 2.6, glass, 1.76, 1.55, -0.65, [0, Math.PI / 2, 0]);
  plane(group, 1.3, 2.6, glass, -1.76, 1.55, -0.65, [0, -Math.PI / 2, 0]);

  // bench
  const wood = M(0x6b4a33, { roughness: 0.9 });
  box(group, 2.2, 0.14, 0.55, wood, 0, 0.5, -0.36);
  box(group, 2.2, 0.5, 0.1, wood, 0, 0.78, -0.58, { rotation: [-0.14, 0, 0] });
  for (const x of [-0.9, 0.9]) box(group, 0.1, 0.5, 0.4, steel, x, 0.25, -0.36);

  // stop sign
  box(group, 0.09, 3.8, 0.09, steel, 2.55, 1.9, -0.5);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x1d3f6e,
    emissive: new THREE.Color(0x2f6fd0),
    emissiveIntensity: 0.9,
    roughness: 0.6,
  });
  box(group, 0.72, 0.86, 0.06, signMat, 2.55, 3.7, -0.5, { cast: false });

  // street lamp with practical light
  const lampX = -3.7;
  const lampZ = -2.6;
  box(group, 0.12, 6.2, 0.12, steel, lampX, 3.1, lampZ);
  box(group, 1.1, 0.1, 0.12, steel, lampX + 0.5, 6.15, lampZ);
  box(group, 0.34, 0.14, 0.3, glow(0xffc98a, 3.2), lampX + 1.02, 6.05, lampZ, { cast: false });
  const lamp = new THREE.PointLight(0xffb070, 40, 28, 2);
  lamp.position.set(lampX + 1.02, 5.95, lampZ);
  group.add(lamp);

  // practical inside the shelter so faces are never a silhouette
  const shelterLight = new THREE.PointLight(0xffc48a, 9, 9, 2);
  shelterLight.position.set(0, 3.1, 0.4);
  group.add(shelterLight);

  // puddles
  const wet = M(0x0b0f16, { roughness: 0.08, metalness: 0.75 });
  for (const [x, z, w, d] of [[-2.2, -1.6, 2.6, 1.1], [2.4, -1.2, 1.8, 0.8], [0.4, -2.6, 2.2, 0.9]]) {
    plane(group, w, d, wet, x, -0.14, z, [-Math.PI / 2, 0, 0]);
  }

  cityBackdrop(group, { z: -26 });

  // ambient world motion
  const rain = makeRain(group, 900);
  update.push(rain.update);
  const flicker = { t: 0 };
  update.push((t, dt) => {
    flicker.t += dt;
    const f = 0.82 + 0.18 * Math.sin(t * 11.3) * Math.sin(t * 3.1);
    lamp.intensity = 30 + f * 6;
  });

  return {
    group,
    seat: 0.72,
    update(t, dt) {
      for (const fn of update) fn(t, dt);
    },
  };
}

function bedroom() {
  const group = new THREE.Group();
  const updates = [];

  const floorMat = M(0x3a2a20, { roughness: 0.85 });
  plane(group, 18, 18, floorMat, 0, 0, 0, [-Math.PI / 2, 0, 0]);
  const wallMat = M(0x2a2430, { roughness: 0.95 });
  box(group, 12, 3.6, 0.2, wallMat, 0, 1.8, -5, { cast: false });
  box(group, 0.2, 3.6, 10, wallMat, -6, 1.8, 0, { cast: false });
  box(group, 0.2, 3.6, 10, wallMat, 6, 1.8, 0, { cast: false });

  // bed
  const sheet = M(0x4a4f66, { roughness: 0.95 });
  const frame = M(0x2b2018, { roughness: 0.9 });
  box(group, 3, 0.4, 4.4, frame, 2.6, 0.28, -2.6);
  box(group, 2.9, 0.46, 4.2, sheet, 2.6, 0.7, -2.6);
  box(group, 2.9, 0.16, 1.2, M(0xd9d3c4, { roughness: 0.95 }), 2.6, 0.98, -4.1);
  box(group, 3, 1.3, 0.24, frame, 2.6, 0.9, -4.8);

  // window + city
  box(group, 0.16, 2.6, 3.2, frame, -5.88, 2.1, -1.6, { cast: false });
  const nightGlow = new THREE.MeshStandardMaterial({
    color: 0x141c33,
    emissive: new THREE.Color(0x2d4a86),
    emissiveIntensity: 0.9,
    roughness: 0.4,
  });
  plane(group, 3.0, 2.4, nightGlow, -5.78, 2.1, -1.6, [0, Math.PI / 2, 0]);
  for (let i = 0; i < 14; i++) {
    plane(
      group,
      0.12,
      0.16,
      glow(seeded(i) > 0.6 ? 0xffc070 : 0x87b6ff, 1.6),
      -5.74,
      1.3 + seeded(i * 3.3) * 1.6,
      -2.8 + seeded(i * 7.1) * 2.4,
      [0, Math.PI / 2, 0]
    );
  }

  // desk + lamp
  box(group, 2.2, 0.12, 0.9, frame, -3.6, 0.78, -3.9);
  for (const x of [-4.5, -2.7]) box(group, 0.1, 0.78, 0.8, frame, x, 0.39, -3.9);
  box(group, 0.5, 0.06, 0.2, M(0x22242c), -3.4, 0.87, -3.9);
  box(group, 0.16, 0.5, 0.16, M(0x22242c), -3.4, 1.15, -3.9);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.42, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xe8b06a,
      emissive: new THREE.Color(0xffa858),
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
      roughness: 0.8,
    })
  );
  lampShade.position.set(-3.4, 1.5, -3.9);
  group.add(lampShade);
  const lamp = new THREE.PointLight(0xffa858, 11, 14, 2);
  lamp.position.set(-3.4, 1.35, -3.6);
  group.add(lamp);

  // wardrobe
  box(group, 1.8, 2.4, 0.7, M(0x241c18), 4.7, 1.2, -4.5);
  box(group, 0.06, 2.2, 0.02, M(0x1a1410), 4.7, 1.2, -4.14, { cast: false });

  // rug
  plane(group, 3.2, 2.4, M(0x5c2f34, { roughness: 1 }), 0.2, 0.012, -1.4, [-Math.PI / 2, 0, 0]);

  // door on the back wall, with the hallway light left on under it
  box(group, 1.16, 2.36, 0.1, M(0x17121a, { roughness: 0.9 }), -2.0, 1.18, -4.88, { cast: false });
  box(group, 0.1, 0.1, 0.14, M(0x3a3038), -2.44, 1.1, -4.8, { cast: false });
  const strip = glow(0xffb264, 2.6);
  box(group, 1.02, 0.05, 0.08, strip, -2.0, 0.03, -4.78, { cast: false });
  const hall = new THREE.PointLight(0xffa860, 11, 9, 2);
  hall.position.set(-2.0, 0.35, -4.1);
  group.add(hall);
  updates.push((t) => {
    hall.intensity = 11 + Math.sin(t * 0.9) * 0.6;
  });

  return {
    group,
    seat: 0.95,
    update(t, dt) {
      for (const fn of updates) fn(t, dt);
    },
  };
}

function diner() {
  const group = new THREE.Group();
  const updates = [];

  // — floor: checkerboard lino, the cheapest way to say "this is a diner" —
  const tileA = M(0xc6bba3, { roughness: 0.72 });
  const tileB = M(0x6d2c2f, { roughness: 0.72 });
  for (let x = -6; x <= 6; x++) {
    for (let z = -4; z <= 5; z++) {
      plane(group, 1.0, 1.0, (x + z) % 2 ? tileA : tileB, x, 0.001, z, [-Math.PI / 2, 0, 0]);
    }
  }

  const wall = M(0x2a2b31, { roughness: 0.94 });
  const wallDark = M(0x232429, { roughness: 0.94 });
  const trim = M(0x1a1b20, { roughness: 0.6, metalness: 0.3 });
  const cream = M(0xcfc6b0, { roughness: 0.8 });

  // — back wall: solid, because that is where the counter and the pass live —
  box(group, 14, 3.8, 0.2, wallDark, 0, 1.9, -4.5, { cast: false });
  box(group, 14, 0.16, 12, M(0x1b1c22), 0, 3.8, 0, { cast: false });

  // — the window is the wall the camera looks into: rain, neon, a parked car —
  const winA = -4.2, winB = 1.6;
  box(group, 0.2, 0.95, 12, wall, -7, 0.475, 0, { cast: false });
  box(group, 0.2, 0.6, 12, wall, -7, 3.5, 0, { cast: false });
  box(group, 0.2, 3.8, 7.3, wall, -7, 1.9, -5.65, { cast: false });
  box(group, 0.2, 3.8, 4.9, wall, -7, 1.9, 4.05, { cast: false });
  box(group, 0.2, 3.8, 12, wallDark, 7, 1.9, 0, { cast: false });

  const glass = new THREE.MeshStandardMaterial({
    color: 0x9cc4e0, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.4,
  });
  plane(group, winB - winA, 2.25, glass, -6.88, 2.1, (winA + winB) / 2, [0, Math.PI / 2, 0]);
  for (const z of [winA, winB]) box(group, 0.16, 2.4, 0.12, trim, -6.84, 2.1, z);
  box(group, 0.16, 2.25, 0.09, trim, -6.82, 2.1, (winA + winB) / 2);   // one centre mullion only: anything else lands in the lens
  box(group, 0.18, 0.09, winB - winA, trim, -6.83, 2.62, (winA + winB) / 2);
  box(group, 0.18, 0.1, winB - winA + 0.2, trim, -6.84, 3.26, (winA + winB) / 2);
  box(group, 0.3, 0.12, winB - winA + 0.4, M(0x32333a), -6.8, 0.93, (winA + winB) / 2); // sill

  // outside: wet lot, two signs nobody turned off, a car there all night
  const lot = M(0x0b0e14, { roughness: 0.12, metalness: 0.75 });
  plane(group, 16, 22, lot, -15, -0.02, -1, [-Math.PI / 2, 0, 0]);
  const neonRed = new THREE.MeshStandardMaterial({
    color: 0xff3355, emissive: new THREE.Color(0xff2a4a), emissiveIntensity: 3.4, roughness: 0.5,
  });
  box(group, 0.1, 0.14, 2.4, neonRed, -8.6, 2.9, 0.4, { cast: false });
  box(group, 0.1, 1.2, 0.14, neonRed, -8.6, 2.35, -0.7, { cast: false });
  box(group, 0.1, 0.06, 1.4, glow(0x7ce8ff, 1.1), -9.6, 4.4, 1.6, { cast: false });
  const neon = new THREE.PointLight(0xff4060, 34, 16, 2);
  neon.position.set(-8.1, 2.7, 0.2);
  group.add(neon);
  const neonCyan = new THREE.PointLight(0x54d8ff, 18, 13, 2);
  neonCyan.position.set(-8.3, 3.2, 1.9);
  group.add(neonCyan);
  updates.push((t) => {
    neon.intensity = 30 + Math.sin(t * 9.1) * Math.sin(t * 2.3) * 5 + (seeded(Math.floor(t * 6)) > 0.93 ? -14 : 0);
  });
  box(group, 1.9, 0.9, 4.2, M(0x1a2430, { roughness: 0.35, metalness: 0.5 }), -9.4, 0.55, -3.4);
  box(group, 1.7, 0.7, 2.2, M(0x141c26, { roughness: 0.25, metalness: 0.5 }), -9.4, 1.35, -3.4);
  cityBackdrop(group, { z: -20, count: 7 });

  // — the counter along the back wall: where the light and the noise come from —
  box(group, 9.5, 1.0, 0.9, M(0x33262a), -0.6, 0.5, -3.7);
  box(group, 9.7, 0.1, 1.05, M(0xcbc4b2, { roughness: 0.3, metalness: 0.3 }), -0.6, 1.03, -3.7);
  for (const x of [-4.4, -3.1, -1.8, -0.5, 0.8, 2.1]) {
    const stool = new THREE.Group();
    stool.position.set(x, 0, -2.95);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.62, 10), trim);
    stem.position.y = 0.31;
    stool.add(stem);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 14), M(0x7d2c33, { roughness: 0.9 }));
    seat.position.y = 0.66;
    stool.add(seat);
    group.add(stool);
  }
  // pass to the kitchen: a warm rectangle with a cook somewhere behind it
  box(group, 1.5, 0.9, 0.1, glow(0xd8873c, 0.5), 0.4, 1.72, -4.36, { cast: false });
  for (const x of [-0.1, 0.4, 0.9]) box(group, 0.06, 0.95, 0.14, M(0x1c1d22), x, 1.7, -4.32, { cast: false });
  box(group, 1.7, 0.1, 0.2, M(0x2b2c32), 0.4, 2.25, -4.32, { cast: false });
  const kitchen = new THREE.PointLight(0xffab5e, 12, 9, 2);
  kitchen.position.set(0.4, 1.7, -4.0);
  group.add(kitchen);
  // back bar: bottles that catch the practicals
  box(group, 9.5, 0.1, 0.4, M(0x241c20), -0.6, 2.0, -4.25);
  for (let i = 0; i < 16; i++) {
    const h = 0.2 + seeded(i * 3.7) * 0.18;
    box(group, 0.09, h, 0.09, glow(seeded(i * 5.1) > 0.5 ? 0x7fae6a : 0xd8a05a, 0.5), -4.9 + i * 0.58, 2.05 + h / 2, -4.25, { cast: false });
  }
  // pie case, lit, with nothing in it
  box(group, 1.0, 0.12, 0.7, M(0x2a2b31), 2.7, 1.12, -3.7);
  const caseGlass = new THREE.MeshStandardMaterial({ color: 0xcfe0ea, transparent: true, opacity: 0.16, roughness: 0.08 });
  box(group, 0.96, 0.5, 0.66, caseGlass, 2.7, 1.45, -3.7, { cast: false });

  // — booth: two benches and a table. The whole scene happens in 2 m² —
  const benchSeat = M(0x7d2c33, { roughness: 0.9 });
  const benchBase = M(0x2e2024, { roughness: 0.9 });
  for (const z of [-1.85, 0.85]) {
    box(group, 1.9, 0.12, 0.62, benchSeat, 0, 0.44, z);
    box(group, 1.9, 0.42, 0.5, benchBase, 0, 0.21, z);
    box(group, 1.9, 0.72, 0.14, benchSeat, 0, 0.8, z + (z < 0 ? -0.32 : 0.32), { rotation: [-0.08, 0, 0] });
  }
  const tableTop = M(0xd7cdb6, { roughness: 0.42, metalness: 0.08 });
  box(group, 1.4, 0.08, 1.0, tableTop, 0, 0.75, -0.5);
  box(group, 1.46, 0.06, 1.06, M(0x8d939c, { roughness: 0.25, metalness: 0.85 }), 0, 0.71, -0.5);
  box(group, 0.13, 0.7, 0.13, trim, 0, 0.35, -0.5);

  // — the untouched cup and the napkin. Both are props in the plot. —
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.35 });
  const coffee = new THREE.MeshStandardMaterial({
    color: 0x2a1608, roughness: 0.14, metalness: 0.25, emissive: new THREE.Color(0x1a0d04), emissiveIntensity: 0.5,
  });
  const cup = new THREE.Group();
  cup.position.set(0.38, 0.79, -0.6);
  cup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.16, 14), cupMat));
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.066, 14), coffee);
  liquid.rotation.x = -Math.PI / 2;
  liquid.position.y = 0.072;
  cup.add(liquid);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 12), cupMat);
  handle.position.set(0.085, 0, 0);
  handle.rotation.y = Math.PI / 2;
  cup.add(handle);
  group.add(cup);
  const napkin = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), M(0xf2efe6, { roughness: 1 }));
  napkin.rotation.x = -Math.PI / 2;
  napkin.rotation.z = 0.3;
  napkin.position.set(-0.34, 0.795, -0.42);
  group.add(napkin);

  // — the door she leaves by, and a jukebox nobody plays —
  box(group, 0.1, 2.4, 1.2, M(0x14151a), 6.92, 1.2, -1.5, { cast: false });
  const doorGlass = new THREE.MeshStandardMaterial({
    color: 0x2a3a52, emissive: new THREE.Color(0x4d6f96), emissiveIntensity: 1.1, roughness: 0.3,
  });
  plane(group, 1.0, 1.2, doorGlass, 6.86, 1.7, -1.5, [0, -Math.PI / 2, 0]);
  const doorGlow = new THREE.PointLight(0x9ec4ff, 8, 8, 2);
  doorGlow.position.set(6.3, 1.6, -1.5);
  group.add(doorGlow);

  const juke = new THREE.Group();
  juke.position.set(4.35, 0, -4.05);
  juke.rotation.y = 0.25;
  box(juke, 1.0, 1.9, 0.5, M(0x2a1c22), 0, 0.95, 0);
  const jukeGlow = new THREE.MeshStandardMaterial({
    color: 0xffb060, emissive: new THREE.Color(0xff9a3c), emissiveIntensity: 2.0, roughness: 0.5,
  });
  box(juke, 0.8, 0.5, 0.06, jukeGlow, 0, 1.45, 0.27, { cast: false });
  box(juke, 0.8, 0.12, 0.06, glow(0x62e0ff, 2.2), 0, 0.75, 0.27, { cast: false });
  const jukeLight = new THREE.PointLight(0xff9a3c, 9, 6, 2);
  jukeLight.position.set(0, 1.4, 0.5);
  juke.add(jukeLight);
  group.add(juke);
  updates.push((t) => {
    jukeGlow.emissiveIntensity = 1.6 + Math.sin(t * 3.1) * 0.35;
  });

  // — practicals over the booths, and a fan, because a still room is a photo —
  for (const x of [-1.7, 2.3]) {
    box(group, 0.03, 0.65, 0.03, trim, x, 3.47, 2.4, { cast: false });
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.28, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2b2c33, emissive: new THREE.Color(0xffb066), emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.7 })
    );
    shade.position.set(x, 3.14, 2.4);
    group.add(shade);
    const bulb = new THREE.PointLight(0xffbe80, 15, 9, 2);
    bulb.position.set(x, 3.0, 2.4);
    group.add(bulb);
  }
  const fan = new THREE.Group();
  fan.position.set(-2.6, 3.5, 1.4);
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group();
    arm.rotation.y = (k * Math.PI) / 2;
    box(arm, 1.4, 0.04, 0.2, M(0x20242c), 0.7, 0, 0, { cast: false });
    fan.add(arm);
  }
  group.add(fan);
  updates.push((t) => (fan.rotation.y = t * 0.9));

  // — rain outside the glass, and the sound of it lives in the audio layer —
  const rain = makeRain(group, 800, -6.0, 8.0, -13, 5.2);
  updates.push(rain.update);

  return {
    group,
    seat: 0.5,
    update(t, dt) {
      for (const fn of updates) fn(t, dt);
    },
  };
}

/* Coin laundry, 3 a.m. Three walls only: the fourth is where the camera lives. */
function laundromat() {
  const group = new THREE.Group();
  const updates = [];

  // — floor: grey quarry tile, waxed, with a wet patch nobody mopped —
  const tileA = M(0x3a3d44, { roughness: 0.35, metalness: 0.15 });
  const tileB = M(0x34373e, { roughness: 0.35, metalness: 0.15 });
  for (let x = -5; x <= 5; x++) {
    for (let z = -3; z <= 6; z++) {
      plane(group, 0.98, 0.98, (x + z) % 2 ? tileA : tileB, x, 0.001, z, [-Math.PI / 2, 0, 0]);
    }
  }
  plane(group, 1.6, 2.2, M(0x4a4f58, { roughness: 0.08, metalness: 0.6 }), 0.4, 0.004, 1.5, [-Math.PI / 2, 0, 0]);

  const tileWall = M(0x6f7783, { roughness: 0.45 });
  const tileWall2 = M(0x666e79, { roughness: 0.45 });
  const trim = M(0x22252b, { roughness: 0.5, metalness: 0.4 });

  // — walls: tiled, grimy at the bottom, three of them —
  box(group, 10, 3.0, 0.2, M(0x2c3037), 0, 1.5, -3.0, { cast: false });
  for (let x = -4.5; x <= 4.5; x += 0.5) {
    for (let y = 0.15; y < 2.6; y += 0.3) {
      plane(group, 0.46, 0.26, (Math.round(x * 2) + Math.round(y * 10)) % 2 ? tileWall : tileWall2, x, y, -2.88);
    }
  }
  box(group, 0.2, 3.0, 9, M(0x2c3037), -5, 1.5, 1.5, { cast: false });
  box(group, 0.2, 3.0, 9, M(0x2c3037), 5, 1.5, 1.5, { cast: false });
  box(group, 10, 0.14, 9, M(0x1e2126), 0, 3.0, 1.5, { cast: false });
  // skirting + a door on the right wall she leaves by
  box(group, 10, 0.18, 0.1, trim, 0, 0.09, -2.86, { cast: false });
  box(group, 0.12, 2.2, 1.1, M(0x1a1d22), 4.9, 1.1, 2.6, { cast: false });
  const doorGlass = new THREE.MeshStandardMaterial({
    color: 0x243244, emissive: new THREE.Color(0x4d6f96), emissiveIntensity: 0.9, roughness: 0.35,
  });
  plane(group, 0.9, 1.0, doorGlass, 4.84, 1.5, 2.6, [0, -Math.PI / 2, 0]);
  const doorGlow = new THREE.PointLight(0x9ec4ff, 9, 7, 2);
  doorGlow.position.set(4.3, 1.5, 2.6);
  group.add(doorGlow);
  // exit sign over it
  box(group, 0.06, 0.16, 0.5, glow(0x2fbf6a, 1.6), 4.86, 2.5, 2.6, { cast: false });

  // — window on the left wall: frost, a streetlamp, nobody out there —
  const glass = new THREE.MeshStandardMaterial({
    color: 0xbcd4e8, transparent: true, opacity: 0.14, roughness: 0.5, metalness: 0.2,
  });
  plane(group, 2.6, 1.5, glass, -4.88, 1.75, 0.2, [0, Math.PI / 2, 0]);
  box(group, 0.1, 1.7, 0.1, trim, -4.86, 1.75, -1.1);
  box(group, 0.1, 1.7, 0.1, trim, -4.86, 1.75, 1.5);
  box(group, 1.0, 1.2, 0.1, M(0x0e1116), -5.6, 1.6, 0.2, { cast: false });   // the dark street beyond
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffd9a0, emissive: new THREE.Color(0xffca7a), emissiveIntensity: 2.6, roughness: 0.6,
  });
  box(group, 0.18, 0.1, 0.18, lamp, -5.4, 2.9, 0.2, { cast: false });
  const lampLight = new THREE.PointLight(0xffc078, 20, 9, 2);
  lampLight.position.set(-4.6, 2.4, 0.2);
  group.add(lampLight);
  updates.push((t) => {
    lampLight.intensity = 18 + Math.sin(t * 3.3) * 1.5;
  });

  // — the machines: a row of boxes with a lit porthole each. All the light in the room. —
  const steel = M(0x9aa2ac, { roughness: 0.32, metalness: 0.7 });
  const body = M(0xcfd4da, { roughness: 0.4, metalness: 0.25 });
  const drums = [];
  for (let i = 0; i < 6; i++) {
    const x = -3.5 + i * 1.4;
    const m = new THREE.Group();
    m.position.set(x, 0, -2.35);
    box(m, 1.34, 1.3, 0.85, body, 0, 0.85, 0);
    box(m, 1.34, 0.18, 0.85, steel, 0, 0.18, 0);
    box(m, 1.05, 0.3, 0.06, trim, 0, 1.42, 0.41);                     // control strip
    box(m, 0.16, 0.1, 0.03, glow(0x53d0ff, 1.2), 0.3, 1.45, 0.45, { cast: false });
    // porthole
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 22), steel);
    ring.position.set(0, 0.84, 0.44);
    m.add(ring);
    const drum = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 22),
      new THREE.MeshStandardMaterial({
        color: 0x1a1f26, emissive: new THREE.Color(0x39627f), emissiveIntensity: 0.85, roughness: 0.4,
      })
    );
    drum.position.set(0, 0.84, 0.43);
    m.add(drum);
    // clothes tumbling behind the glass
    const load = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      box(load, 0.12, 0.1, 0.04, M(k % 2 ? 0x8c94a4 : 0x5d6878), 0.06 * (k - 1.5), 0.05 * (k % 2), 0, { cast: false });
    }
    load.position.set(0, 0.84, 0.41);
    load.visible = i % 2 === 0;
    m.add(load);
    drums.push({ load, spin: 0.9 + seeded(i * 4.3) * 1.4 });
    group.add(m);
  }
  updates.push((t) => {
    for (const d of drums) d.load.rotation.z = t * d.spin;
  });
  const machineGlow = new THREE.PointLight(0x77b6d8, 14, 8, 2);
  machineGlow.position.set(0, 1.1, -1.5);
  group.add(machineGlow);

  // — above the machines: powder, a shelf, and a price list nobody reads —
  box(group, 9.4, 0.06, 0.34, steel, 0, 2.06, -2.62);
  for (let i = 0; i < 9; i++) {
    if (seeded(i * 7.7) < 0.28) continue;
    box(group, 0.24, 0.32, 0.16, M(0xd9dfe6, { roughness: 0.7 }), -4.0 + i * 0.85, 2.25, -2.62, { cast: false });
  }
  box(group, 1.5, 0.7, 0.06, M(0x1f2329), 3.2, 2.4, -2.86, { cast: false });

  // — folding table: the whole scene happens on it —
  const tableTop = M(0xd8d2c0, { roughness: 0.35, metalness: 0.1 });
  box(group, 0.9, 0.06, 1.7, tableTop, 0, 0.92, 0.5);
  box(group, 0.06, 0.9, 1.6, steel, -0.4, 0.46, 0.5);
  box(group, 0.06, 0.9, 1.6, steel, 0.4, 0.46, 0.5);

  // — chairs, a mop bucket, one sock that has been here longer than anyone —
  for (const x of [-1.5, 1.5]) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, 1.75);
    box(chair, 0.5, 0.06, 0.5, M(0xb85c2a, { roughness: 0.6 }), 0, 0.44, 0);
    box(chair, 0.5, 0.5, 0.06, M(0xb85c2a, { roughness: 0.6 }), 0, 0.68, 0.22, { rotation: [-0.12, 0, 0] });
    for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
      box(chair, 0.05, 0.44, 0.05, trim, dx, 0.22, dz);
    }
    chair.rotation.y = x < 0 ? 0.4 : -0.4;
    group.add(chair);
  }
  box(group, 0.4, 0.34, 0.4, M(0xc8b31e, { roughness: 0.6 }), 2.9, 0.17, 1.0);
  box(group, 0.42, 0.05, 0.42, M(0x2b2f36), 2.9, 0.36, 1.0, { cast: false });
  const sock = box(group, 0.2, 0.03, 0.09, M(0xe4e0d6, { roughness: 1 }), -2.2, 0.02, 1.3, { cast: false });
  sock.rotation.y = 0.7;

  // — vending machine for soap: the only thing in the room that is happy —
  const vend = new THREE.Group();
  vend.position.set(-4.45, 0, 2.3);
  vend.rotation.y = Math.PI / 2;
  box(vend, 1.0, 1.9, 0.5, M(0x2a2f38), 0, 0.95, 0);
  box(vend, 0.8, 1.0, 0.06, glow(0x8fd7ff, 0.9), 0, 1.35, 0.26, { cast: false });
  for (let i = 0; i < 6; i++) {
    box(vend, 0.12, 0.16, 0.02, M(0xe0e6ee), -0.3 + (i % 3) * 0.3, 1.55 - Math.floor(i / 3) * 0.24, 0.3, { cast: false });
  }
  const vendLight = new THREE.PointLight(0x8fd7ff, 7, 6, 2);
  vendLight.position.set(0.4, 1.4, 0.3);
  vend.add(vendLight);
  group.add(vend);

  // — fluorescents: one steady, one that has been dying since last winter —
  for (const [x, z] of [[-2.2, 0.4], [2.4, 0.4]]) {
    box(group, 1.5, 0.06, 0.14, glow(0xdcecf8, 1.6), x, 2.94, z, { cast: false });
    box(group, 1.7, 0.1, 0.24, trim, x, 3.0, z, { cast: false });
    const tube = new THREE.PointLight(0xd6e8f8, 13, 8, 2);
    tube.position.set(x, 2.8, z);
    group.add(tube);
    if (x > 0) {
      updates.push((t) => {
        // 90 Hz-ish flutter that stutters out for a beat every few seconds
        const out = seeded(Math.floor(t * 9)) > 0.9;
        tube.intensity = out ? 3 : 12 + Math.sin(t * 47) * 1.5;
        tube.visible = !out || seeded(Math.floor(t * 9) + 2) > 0.4;
      });
    }
  }

  return {
    group,
    seat: 0.5,
    update(t, dt) {
      for (const fn of updates) fn(t, dt);
    },
  };
}

/* Branch library, 8:56 p.m. Three walls only: the fourth is where the camera lives.
   Warm inside, blue outside — the whole grade hangs on that contrast. */
function library(opts = {}, t0 = 0) {
  const group = new THREE.Group();
  const updates = [];
  const morning = !!opts.morning;
  const [ch, cm] = opts.clock || [8, 56];
  let deskLevel = 1;

  // — carpet, worn through in a path between the desk and the shelves —
  const carpet = M(0x3d2429, { roughness: 0.96 });
  const carpet2 = M(0x382125, { roughness: 0.96 });
  for (let x = -5; x <= 5; x++) {
    for (let z = -3; z <= 6; z++) {
      plane(group, 0.99, 0.99, (x + z) % 2 ? carpet : carpet2, x, 0.001, z, [-Math.PI / 2, 0, 0]);
    }
  }

  // — walls: deep green painted board with a wood rail, three sides. The back
  //   wall is split around the door, so the street can be seen through it —
  const wall = M(0x2a3833, { roughness: 0.85 });
  const rail = M(0x4a3527, { roughness: 0.8 });
  box(group, 4.84, 3.2, 0.2, wall, -3.08, 1.6, -3.0, { cast: false });
  box(group, 4.84, 3.2, 0.2, wall, 3.08, 1.6, -3.0, { cast: false });
  box(group, 1.32, 0.84, 0.2, wall, 0, 2.78, -3.0, { cast: false });
  box(group, 0.2, 3.2, 9, wall, -5.5, 1.6, 1.5, { cast: false });
  box(group, 0.2, 3.2, 9, wall, 5.5, 1.6, 1.5, { cast: false });
  box(group, 11, 0.16, 9, M(0x241f1b), 0, 3.12, 1.5, { cast: false });
  box(group, 11, 0.12, 0.12, rail, 0, 1.05, -2.9, { cast: false });
  box(group, 0.12, 0.12, 9, rail, -5.4, 1.05, 1.5, { cast: false });
  box(group, 0.12, 0.12, 9, rail, 5.4, 1.05, 1.5, { cast: false });

  // — the door: glazed above, panelled below, hinged on the left —
  const doorWood = M(0x3a2a20, { roughness: 0.72 });
  const brass = M(0x9c7a3e, { roughness: 0.4, metalness: 0.7 });
  box(group, 0.16, 2.44, 0.32, doorWood, -0.68, 1.22, -2.9, { cast: false });
  box(group, 0.16, 2.44, 0.32, doorWood, 0.68, 1.22, -2.9, { cast: false });
  box(group, 1.52, 0.18, 0.32, doorWood, 0, 2.4, -2.9, { cast: false });

  const doorHinge = new THREE.Group();
  doorHinge.position.set(-0.6, 0, -2.9);
  group.add(doorHinge);
  box(doorHinge, 1.2, 1.04, 0.06, doorWood, 0.6, 0.52, 0);
  box(doorHinge, 0.09, 2.3, 0.09, doorWood, 0.045, 1.15, 0);
  box(doorHinge, 0.09, 2.3, 0.09, doorWood, 1.155, 1.15, 0);
  box(doorHinge, 1.2, 0.07, 0.09, doorWood, 0.6, 1.07, 0);
  // the pane runs to the head of the door: the whole point of the shot is her
  // face through it, and a rail across her forehead would waste the frame
  plane(doorHinge, 1.06, 1.19, new THREE.MeshStandardMaterial({
    color: 0x9fc0dd, transparent: true, opacity: 0.1, roughness: 0.35, metalness: 0.2,
  }), 0.6, 1.7, 0.01);
  box(doorHinge, 0.12, 0.04, 0.1, brass, 1.02, 1.02, 0.1);

  // the sign on the glass: the whole reel hangs on which side is facing out
  const signPlate = (text, lit) => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 160;
    const x = c.getContext("2d");
    x.fillStyle = lit ? "#16241c" : "#221a15";
    x.fillRect(0, 0, 256, 160);
    x.strokeStyle = "rgba(255,255,255,0.22)";
    x.lineWidth = 6;
    x.strokeRect(7, 7, 242, 146);
    x.fillStyle = lit ? "#8fe0ac" : "#cbb894";
    x.font = "700 56px sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, 128, 84);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      map: tex, emissive: new THREE.Color(0xffffff), emissiveMap: tex,
      emissiveIntensity: lit ? 0.55 : 0.22, roughness: 0.85,
    });
  };
  const signClosed = signPlate("CLOSED", false);
  const signOpen = signPlate("OPEN", true);
  const sign = plane(doorHinge, 0.3, 0.19, signClosed, 0.6, 1.62, 0.055);
  box(doorHinge, 0.34, 0.02, 0.02, brass, 0.6, 1.75, 0.05, { cast: false });

  // — outside: a wet pavement, one lamp, and a street nobody is on. At dawn the
  //   street is already lighter than the room, so the open door reads as a hole
  //   cut in the dark —
  const ext = (dark, dawn, o) => M(morning ? dawn : dark, o);
  plane(group, 16, 9, ext(0x24262c, 0x40464f, { roughness: 0.46, metalness: 0.3 }), 0, -0.02, -7.4, [-Math.PI / 2, 0, 0]);
  box(group, 16, 0.28, 0.28, ext(0x3c3e46, 0x5a606b), 0, -0.12, -3.9, { cast: false });
  plane(group, 16, 34, ext(0x0f1218, 0x252c37, { roughness: 0.18, metalness: 0.6 }), 0, -0.16, -13, [-Math.PI / 2, 0, 0]);
  // the wall across the street is what the glass shows, so at dawn it holds a
  // little of the sky itself rather than sitting there as a black rectangle
  box(group, 18, 7, 0.4, morning ? glow(0x51688a, 0.5) : M(0x1b2029, { roughness: 0.9 }), 0, 3.5, -14, { cast: false });
  // the lamp stands off to the left, out of the line of the camera that shoots
  // the open door from the street
  box(group, 0.11, 3.5, 0.11, M(0x22252a, { roughness: 0.6 }), -2.0, 1.75, -4.6);
  box(group, 0.4, 0.12, 0.24, glow(0xffc98a, 2.8), -1.79, 3.46, -4.6, { cast: false });
  const streetLight = new THREE.PointLight(0xffb877, morning ? 20 : 13, 13, 2);
  streetLight.position.set(-2.0, 3.35, -4.6);
  group.add(streetLight);

  // — the switch by the door, three rockers, the first thing she touches —
  box(group, 0.17, 0.26, 0.05, M(0xe8e2d2, { roughness: 0.65 }), 0.89, 1.32, -2.87, { cast: false });
  for (const dy of [-0.07, 0, 0.07]) {
    box(group, 0.055, 0.03, 0.02, M(0xd4cdbb), 0.89, 1.32 + dy, -2.84, { cast: false });
  }

  // — the shelves: five rows of books, spines doing the talking —
  const spineCols = [0x6b2f2a, 0x2f4358, 0x4a5a34, 0x6a5330, 0x3a2f45, 0x7a3f22, 0x2d4f4a, 0x55504a];
  const shelfWood = M(0x453025, { roughness: 0.82 });
  const bookMat = {};
  const bookAt = (parent, px, py, pz, w, h, k) => {
    const key = k % spineCols.length;
    bookMat[key] = bookMat[key] || M(spineCols[key], { roughness: 0.88 });
    box(parent, w, h, 0.2, bookMat[key], px, py, pz, { cast: false, receive: false });
  };
  const bay = (bx, bz, rotY, bays, rows, perRow) => {
    const g = new THREE.Group();
    g.position.set(bx, 0, bz);
    g.rotation.y = rotY;
    for (const y of [0.9, 1.42, 1.94, 2.46]) box(g, bays * 1.15, 0.06, 0.42, shelfWood, 0, y - 0.06, 0);
    for (const sx of [-0.5, 0.5]) box(g, 0.08, 2.5, 0.44, shelfWood, sx * bays * 1.15, 1.25, 0);
    for (let b = 0; b < bays; b++) {
      for (let r = 0; r < rows; r++) {
        let x = -0.5 * bays * 1.15 + b * 1.15 + 0.08;
        for (let i = 0; i < perRow; i++) {
          const w = 0.06 + seeded(b * 31 + r * 7 + i * 3.3) * 0.05;
          const h = 0.24 + seeded(b * 17 + r * 5 + i * 1.7) * 0.1;
          if (seeded(b * 11 + r * 13 + i * 19) < 0.08) { x += w + 0.02; continue; }
          bookAt(g, x + w / 2, 0.9 + r * 0.52 + h / 2, 0.02, w, h, b * 5 + r * 3 + i);
          x += w + 0.012;
        }
      }
    }
    group.add(g);
  };
  bay(-2.75, -2.72, 0, 3, 4, 9);
  bay(2.75, -2.72, 0, 3, 4, 9);
  bay(-5.22, -0.4, Math.PI / 2, 2, 4, 8);
  bay(-5.22, 2.6, Math.PI / 2, 2, 4, 8);

  // — reading table with an open book and a mug nobody has finished —
  const top = M(0x6b4a30, { roughness: 0.5, metalness: 0.08 });
  box(group, 1.5, 0.07, 0.86, top, 0.85, 0.78, 1.15);
  for (const [dx, dz] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]]) {
    box(group, 0.07, 0.76, 0.07, M(0x3a2b1f), 0.85 + dx, 0.38, 1.15 + dz);
  }
  const openBook = new THREE.Group();
  openBook.position.set(0.85, 0.83, 1.12);
  openBook.rotation.y = -0.18;
  const paper = M(0xe6dcc8, { roughness: 0.95 });
  for (const s of [-1, 1]) {
    const pg = box(openBook, 0.22, 0.02, 0.3, paper, s * 0.11, 0, 0, { cast: false });
    pg.rotation.z = s * -0.06;
  }
  box(openBook, 0.03, 0.03, 0.3, M(0x6b3a2c), 0, -0.015, 0, { cast: false });
  group.add(openBook);
  box(group, 0.13, 0.16, 0.13, M(0xd9d2c0, { roughness: 0.6 }), 1.35, 0.89, 1.32);
  box(group, 0.05, 0.03, 0.05, M(0xd9d2c0, { roughness: 0.6 }), 1.42, 0.9, 1.32);

  // — chairs: one pulled out, one where the reader sits —
  for (const [cx, cz, rot] of [[0.85, 0.42, Math.PI], [-0.55, 0.2, Math.PI]]) {
    const chair = new THREE.Group();
    chair.position.set(cx, 0, cz);
    chair.rotation.y = rot;
    box(chair, 0.58, 0.07, 0.56, M(0x5a3b28, { roughness: 0.7 }), 0, 0.5, 0);
    box(chair, 0.58, 0.56, 0.07, M(0x5a3b28, { roughness: 0.7 }), 0, 0.78, 0.25, { rotation: [-0.1, 0, 0] });
    for (const [dx, dz] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) {
      box(chair, 0.06, 0.5, 0.06, M(0x33251b), dx, 0.25, dz);
    }
    group.add(chair);
  }

  // — her desk: brass lamp, date stamp, a drawer of cards that never gets used —
  const deskTop = M(0x54392a, { roughness: 0.55 });
  box(group, 1.7, 0.08, 0.9, deskTop, -3.4, 0.92, 1.0);
  box(group, 0.08, 0.9, 0.86, M(0x3d2a1f), -4.2, 0.45, 1.0);
  box(group, 0.08, 0.9, 0.86, M(0x3d2a1f), -2.6, 0.45, 1.0);
  box(group, 0.5, 0.26, 0.4, M(0x2b2622, { roughness: 0.5, metalness: 0.3 }), -2.95, 1.09, 0.95);
  box(group, 0.16, 0.1, 0.16, M(0x8a3f2e, { roughness: 0.7 }), -3.7, 1.0, 0.9);   // stamp
  box(group, 0.34, 0.12, 0.22, M(0x7a6a4a, { roughness: 0.85 }), -3.15, 1.02, 1.02); // card drawer
  // the lamp: the only reason her face is lit
  const shade = box(group, 0.42, 0.16, 0.3, M(0x1f2a26, { roughness: 0.5 }), -3.9, 1.42, 1.02);
  shade.rotation.z = 0.16;
  const bulb = box(group, 0.3, 0.03, 0.2, glow(0xffcf8e, 2.4), -3.9, 1.34, 1.02, { cast: false });
  bulb.rotation.z = 0.16;
  box(group, 0.05, 0.5, 0.05, M(0x2a2a26), -4.05, 1.2, 1.02);
  const lampLight = new THREE.PointLight(0xffc98a, 14, 9, 2);
  lampLight.position.set(-3.75, 1.3, 1.05);
  group.add(lampLight);
  updates.push((t) => {
    lampLight.intensity = (14 + Math.sin(t * 1.7) * 0.5) * deskLevel;
  });

  // — returns trolley, half full, wheels nobody has oiled —
  const steel = M(0x8d949c, { roughness: 0.4, metalness: 0.6 });
  const troll = new THREE.Group();
  troll.position.set(-1.15, 0, -0.15);
  troll.rotation.y = 0.35;
  for (const y of [0.16, 0.72, 0.82]) box(troll, 0.82, 0.05, 0.52, steel, 0, y, 0);
  for (const [dx, dz] of [[-0.38, -0.22], [0.38, -0.22], [-0.38, 0.22], [0.38, 0.22]]) {
    box(troll, 0.04, 0.86, 0.04, steel, dx, 0.45, dz);
  }
  for (let i = 0; i < 9; i++) {
    box(troll, 0.5, 0.07, 0.34, M(0xc9bda4, { roughness: 0.9 }), 0.02, 0.2 + i * 0.075, 0, { cast: false });
  }
  group.add(troll);

  // — the clock: the prop of the reel, hands and all. It sits on the panel
  //   above the door, the one stretch of back wall no shelving covers —
  const clock = new THREE.Group();
  clock.position.set(0, 2.8, -2.87);
  box(clock, 0.62, 0.62, 0.06, M(0x2a2119, { roughness: 0.6 }), 0, 0, 0);
  plane(clock, 0.5, 0.5, M(0xe4dcc8, { roughness: 0.9 }), 0, 0, 0.035);
  const handMat = M(0x1b1712, { roughness: 0.5 });
  // each hand hangs from a pivot at the dial centre: rotating the mesh itself
  // spins it about its own middle and floats it off the centre
  const hand = (len, w, mat, z) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, z);
    clock.add(pivot);
    box(pivot, w, len, 0.012, mat, 0, len / 2, 0);
    return pivot;
  };
  const minuteHand = hand(0.19, 0.025, handMat, 0.05);
  const hourHand = hand(0.12, 0.03, handMat, 0.052);
  const secHand = hand(0.21, 0.012, M(0x8a3f2e), 0.054);
  // parked at the time the storyboard says, second hand ticking once a second
  // so it reads as alive
  const hourDeg = ((ch % 12) + cm / 60) * 30;
  const minDeg = cm * 6;
  updates.push((t) => {
    const deg = (d) => (-d * Math.PI) / 180;
    hourHand.rotation.z = deg(hourDeg);
    minuteHand.rotation.z = deg(minDeg);
    secHand.rotation.z = deg(Math.floor(t % 60) * 6);
  });
  group.add(clock);

  // — tall windows: night, a streetlamp, nobody out there —
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fc0dd, transparent: true, opacity: 0.13, roughness: 0.4, metalness: 0.2,
  });
  for (const z of [0.2, 3.0]) {
    plane(group, 2.2, 1.9, glass, 5.38, 1.85, z, [0, -Math.PI / 2, 0]);
    plane(group, 2.4, 2.1, M(morning ? 0x33465e : 0x0d1420), 5.6, 1.85, z, [0, -Math.PI / 2, 0]);
    const frame = M(0x241d18);
    box(group, 0.08, 2.2, 0.1, frame, 5.36, 1.85, z - 1.15);
    box(group, 0.08, 2.2, 0.1, frame, 5.36, 1.85, z + 1.15);
    box(group, 0.08, 0.1, 2.4, frame, 5.36, 1.85, z);
    const moon = new THREE.PointLight(morning ? 0xa9c8ea : 0x8fb4e8, morning ? 17 : 12, 11, 2);
    moon.position.set(4.6, 2.1, z);
    group.add(moon);
  }

  // — pendants: two warm pools over the table and one over her shoulder,
  //   and the one over her desk, which nobody needs. `lights` decides whether
  //   they are already on, come on one at a time, or stay off —
  //   "night" is the room as built: two lit, the desk pendant dead.
  const lightMode = opts.lights || "night";
  const stagger = opts.stagger || [0.8, 1.7, 2.6];
  const plan = { night: [-1, -1, 1e9], on: [-1, -1, -1], off: [1e9, 1e9, 1e9] }[lightMode] || stagger;
  if (lightMode !== "night") deskLevel = 0;
  const pendants = [];
  [[0.85, 1.15], [-1.85, 0.55], [-3.4, 1.0]].forEach(([x, z], i) => {
    box(group, 0.02, 0.34, 0.02, M(0x1f1b17), x, 3.0, z, { cast: false });
    const shade2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.13, 0.2, 14), M(0x2f3a33, { roughness: 0.6 }));
    shade2.position.set(x, 2.78, z);
    group.add(shade2);
    const bulb2 = box(group, 0.18, 0.04, 0.18, glow(0xffd7a0, 0), x, 2.71, z, { cast: false });
    bulb2.rotation.y = 0.4;
    const pl = new THREE.PointLight(0xffc98a, 0, 8, 2);
    pl.position.set(x, 2.62, z);
    group.add(pl);
    pendants.push({ bulb2, pl, x, at: plan[i], level: 0 });
  });
  updates.push((t, dt) => {
    for (const p of pendants) {
      const want = t - t0 >= p.at ? 1 : 0;
      p.level += (want - p.level) * Math.min(1, dt * 16);
      p.pl.intensity = (9 + Math.sin(t * 2.1 + p.x) * 0.4) * p.level;
      p.bulb2.material.emissiveIntensity = 2.0 * p.level;
    }
    if (lightMode !== "night") deskLevel = pendants[2].level;
  });

  // — the door and the sign: one object says whether the day has started —
  //   it swings outward (positive y), so an open door clears the lens instead
  //   of filling it
  const doorAt = opts.door === "open" ? -1e9 : opts.door === "swing" ? 0.3 : 1e9;
  const signAt = opts.sign === "open" ? -1e9 : opts.sign === "flip" ? 1.3 : 1e9;
  if (opts.door === "open") doorHinge.rotation.y = 1.15;
  if (opts.sign === "open") sign.material = signOpen;
  updates.push((t, dt) => {
    const rel = t - t0;
    if (rel >= doorAt) doorHinge.rotation.y += (1.15 - doorHinge.rotation.y) * Math.min(1, dt * 3.4);
    if (rel >= signAt && sign.material !== signOpen) {
      sign.material = signOpen;
      sign.rotation.y = 0.5;
    }
    if (sign.rotation.y > 0) sign.rotation.y = Math.max(0, sign.rotation.y - dt * 2.6);
  });

  return {
    group,
    seat: 0.5,
    update(t, dt) {
      for (const fn of updates) fn(t, dt);
    },
  };
}

/* A wet street walked along +x, camera down the pavement looking back at the
   pair. The frame is portrait, so only a corridor fits: the wall on their right
   and the kerb on their left both converge into the vanishing point, and the
   road shows as a wedge with a receding row of sodium lamps over it. They walk
   on the spot; everything with a shape — wall, windows, lamps, markings, the
   smear under each lamp — sits in one group that flows backwards and wraps on a
   9 m period. The pavement is unpatterned on purpose: a paving joint would be
   the one thing in frame that gives the treadmill away. */
function street() {
  const group = new THREE.Group();
  const updates = [];

  // — ground: pavement, kerb, wet asphalt —
  plane(group, 140, 3.6, M(0x2e2f38, { roughness: 0.93 }), -20, 0, 0.8, [-Math.PI / 2, 0, 0]);
  box(group, 140, 0.3, 0.3, M(0x484951), -20, -0.13, -1.0, { cast: false });
  plane(group, 140, 44, M(0x14171f, { roughness: 0.16, metalness: 0.6 }), -20, -0.14, -23, [-Math.PI / 2, 0, 0]);

  const scroll = new THREE.Group();
  group.add(scroll);

  const brick = M(0x5c4136, { roughness: 0.95 });
  const dark = M(0x22262e, { roughness: 0.9 });
  const steel = M(0x2f343f, { roughness: 0.5, metalness: 0.6 });
  const shopWarm = glow(0xd8a05a, 2.4);
  const shopCold = glow(0x7c9ecb, 1.6);
  const wet = M(0x0b0f16, { roughness: 0.06, metalness: 0.8 });

  // one 9 m stretch, repeated; `lit` hangs a practical on the lamp
  const block = (bx, lit) => {
    const a = new THREE.Group();
    a.position.x = bx;
    scroll.add(a);

    // the wall they walk beside: brick above, a shopfront at eye level
    box(a, 9, 7.4, 0.4, brick, 4.5, 3.7, 2.6, { cast: false });
    box(a, 2.6, 1.9, 0.14, shopWarm, 1.9, 1.9, 2.36, { cast: false });
    box(a, 1.7, 1.9, 0.14, shopCold, 6.4, 1.9, 2.36, { cast: false });
    box(a, 9, 0.9, 0.16, dark, 4.5, 0.45, 2.34, { cast: false });
    box(a, 9, 0.22, 0.6, M(0x1a1c22), 4.5, 4.9, 2.4, { cast: false });
    box(a, 1.0, 2.3, 0.22, M(0x11131a), 4.3, 1.15, 2.46, { cast: false });

    // a bin nobody empties, and the markings the walk runs past
    box(a, 0.5, 1.0, 0.5, M(0x223026), 7.9, 0.5, 2.1);
    box(a, 2.6, 0.02, 0.16, glow(0x9aa3a8, 0.32), 2.0, -0.13, -3.6, { cast: false });
    box(a, 2.6, 0.02, 0.16, glow(0x9aa3a8, 0.32), 6.6, -0.13, -3.6, { cast: false });

    // sodium lamp on the kerb, arm over the road, and the smear it leaves
    box(a, 0.12, 4.0, 0.12, steel, 4.4, 2.0, -0.95);
    box(a, 0.12, 0.12, 1.6, steel, 4.4, 3.9, -1.75);
    box(a, 0.32, 0.12, 0.28, glow(0xffc98a, 3.2), 4.4, 3.82, -2.5, { cast: false });
    plane(a, 0.7, 3.0, wet, 4.4, -0.125, -2.6, [-Math.PI / 2, 0, 0]);
    if (lit) {
      const lamp = new THREE.PointLight(0xffb070, 30, 16, 2);
      lamp.position.set(4.4, 3.7, -2.4);
      a.add(lamp);
    }
  };

  // six copies run from just behind the camera into the fog; two are lit, so the
  // sodium pass lands on their faces twice a reel and never strobes
  for (let i = 0; i < 6; i++) block(8 - i * 9, i === 1 || i === 2);

  const SPEED = 1.15;
  updates.push((t) => {
    scroll.position.x = -((t * SPEED) % 9);
  });

  const rain = makeRain(group, 800, -12, 16, -42, 52);
  updates.push(rain.update);

  return {
    group,
    seat: 0.5,
    update(t, dt) {
      for (const fn of updates) fn(t, dt);
    },
  };
}

/* A balcony four floors up, looking across the society courtyard at the other
   blocks. The pair lean back on the parapet with their backs to all of it, so
   the windows are the backdrop and the faces get the one warm lamp over the
   door. Every window is either lit or dark, and the pattern never repeats:
   that grid is the whole point of the place. */
function balcony() {
  const group = new THREE.Group();

  const concrete = M(0x74716b, { roughness: 0.95 });
  const wall = M(0x5d5a55, { roughness: 0.95 });
  const coping = M(0x8d8a84, { roughness: 0.9 });

  // — the balcony: floor, parapet, side walls, slab above —
  plane(group, 5.4, 4.6, concrete, 0, 0, 0.4, [-Math.PI / 2, 0, 0]);
  box(group, 5.4, 1.06, 0.22, wall, 0, 0.53, -1.75, { cast: false });
  box(group, 5.52, 0.09, 0.34, coping, 0, 1.1, -1.75, { cast: false });
  box(group, 0.22, 2.6, 2.8, wall, -2.62, 1.3, -0.5, { cast: false });
  box(group, 0.22, 2.6, 2.8, wall, 2.62, 1.3, -0.5, { cast: false });

  // — the things a balcony accumulates —
  box(group, 0.52, 0.9, 0.52, M(0x3d4a3b), -1.42, 0.45, -1.25);
  box(group, 0.46, 0.07, 0.46, M(0x5a4432), -1.42, 0.93, -1.25);
  box(group, 0.2, 0.5, 0.2, M(0x2f3a2e), -1.42, 1.2, -1.25, { cast: false });
  box(group, 0.54, 0.62, 0.54, M(0x76868e), 1.5, 0.31, -1.15, { cast: false });
  box(group, 0.48, 0.06, 0.5, M(0x99a5ac), 1.5, 0.65, -1.15, { cast: false });
  box(group, 0.48, 0.07, 0.48, M(0x6b5a48), -0.95, 0.47, 1.0);
  for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]])
    box(group, 0.05, 0.47, 0.05, M(0x4a3f34), -0.95 + dx, 0.23, 1.0 + dz, { cast: false });

  // — light: one warm lamp on the side wall, the city's cold coming back over
  //   the parapet, and a low fill so the parapet itself is not a black band —
  box(group, 0.16, 0.2, 0.26, glow(0xffc98a, 2.8), -2.45, 2.25, -0.5, { cast: false });
  const warm = new THREE.PointLight(0xffbc84, 10, 8, 2);
  warm.position.set(-1.9, 2.1, -0.4);
  group.add(warm);
  const rim = new THREE.PointLight(0x93b8e8, 14, 12, 2);
  rim.position.set(0.3, 2.4, -2.9);
  group.add(rim);
  const fill = new THREE.PointLight(0x7f9ec6, 5, 8, 2);
  fill.position.set(1.3, 1.4, 1.2);
  group.add(fill);

  // — the society: blocks across the courtyard, a floor line per storey and a
  //   window in every flat that has someone in it —
  const litWarm = glow(0xffcf94, 1.7);
  const litCold = glow(0xa6c6ea, 1.4);
  const facadeA = M(0x5c626e, { roughness: 0.95 });
  const facadeB = M(0x68605a, { roughness: 0.95 });
  const slabM = M(0x767b85, { roughness: 0.9 });

  plane(group, 160, 160, M(0x1a1e24, { roughness: 0.95 }), 0, -9.4, -40, [-Math.PI / 2, 0, 0]);
  plane(group, 2.6, 80, glow(0x6a6250, 0.3), -1, -9.36, -26, [-Math.PI / 2, 0, 0]);

  const block = (bx, bz, w, h, facade, seed) => {
    const b = new THREE.Group();
    b.position.set(bx, -9.4, bz);
    group.add(b);
    box(b, w, h, 6, facade, 0, h / 2, 0, { cast: false });

    const cols = Math.max(3, Math.round(w / 3.2));
    const rows = Math.max(4, Math.round(h / 3.4));
    const fh = h / rows;
    for (let r = 1; r < rows; r++) {
      // the slab line between storeys is what makes it read as a building
      box(b, w + 0.3, 0.16, 6.3, slabM, 0, r * fh, 0.1, { cast: false });
      for (let c = 0; c < cols; c++) {
        const s = seeded(seed + r * 13.7 + c * 5.1);
        if (s < 0.34) continue; // a flat with nobody in it
        const x = -w / 2 + (c + 0.5) * (w / cols);
        box(b, 1.3, fh * 0.52, 0.14, s > 0.88 ? litCold : litWarm, x, (r - 0.45) * fh, 3.05, { cast: false });
      }
    }
    // balcony slabs on the near face, and the tank on the roof
    for (let r = 1; r < rows; r += 2)
      box(b, w * 0.9, 0.14, 1.3, slabM, 0, r * fh - 0.1, 3.5, { cast: false });
    box(b, w + 0.4, 0.4, 6.4, M(0x2e3036), 0, h, 0, { cast: false });
    box(b, 1.8, 1.7, 1.8, M(0x3a3d44), -w * 0.24, h + 1.0, 0, { cast: false });
  };

  block(-15, -26, 17, 17, facadeA, 1.3);
  block(5, -30, 19, 21, facadeB, 7.9);
  block(25, -25, 14, 15, facadeA, 3.1);
  block(-34, -33, 18, 23, facadeB, 11.4);
  block(-5, -43, 22, 26, facadeA, 5.6);

  return {
    group,
    seat: 0.5,
    update() {},
  };
}

/* A clearing in the jungle at night. They sit on a fallen trunk with a bonfire
   at their feet, trees closing in behind, and a gap in the canopy that the moon
   and the stars get through. The fire is the only warm thing for miles: it is
   the key light on their faces, and it never holds still. */
function jungle() {
  const group = new THREE.Group();
  const updates = [];
  const sway = [];

  const soil = M(0x2b2419, { roughness: 0.98 });
  const bark = M(0x2b2219, { roughness: 0.95 });
  const barkDark = M(0x322619, { roughness: 0.96 });
  const leaf = M(0x23342a, { roughness: 0.95 });
  const leafDark = M(0x182620, { roughness: 0.95 });
  const stone = M(0x4b4b47, { roughness: 0.95 });

  // — ground: bare soil in the clearing, leaf litter further out —
  plane(group, 100, 100, soil, 0, 0, -18, [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 80; i++) {
    const a = seeded(i * 2.7) * Math.PI * 2;
    const r = 1.9 + seeded(i * 5.3) * 15;
    box(
      group,
      0.26 + seeded(i * 7.1) * 0.4,
      0.04,
      0.18 + seeded(i * 3.3) * 0.34,
      leafDark,
      Math.sin(a) * r,
      0.02,
      -2 + Math.cos(a) * r,
      { cast: false, rotation: [0, seeded(i * 9.7) * 3, 0] }
    );
  }

  // — the fallen trunk they sit on, flat on top, bark gone where twelve years
  //   of sitting have worn it pale —
  box(group, 5.0, 0.54, 0.74, bark, 0, 0.27, -1.15);
  box(group, 5.02, 0.05, 0.62, M(0x5c4c38, { roughness: 0.92 }), 0, 0.545, -1.15, { cast: false });
  box(group, 0.92, 0.02, 0.46, M(0x7d6850, { roughness: 0.86 }), -0.78, 0.565, -1.15, { cast: false });
  // bark still clinging to the front face, so it reads as a log and not a wall
  for (let i = 0; i < 9; i++)
    box(group, 0.34, 0.1, 0.05, M(0x1f1a13, { roughness: 0.96 }), -2.2 + i * 0.55, 0.12 + seeded(i * 5.7) * 0.3, -0.76, { cast: false });
  for (const ex of [-1, 1]) {
    box(group, 0.5, 0.34, 0.5, barkDark, ex * 2.7, 0.17, -1.15, { cast: false });
    box(group, 0.16, 0.16, 0.42, barkDark, ex * 2.4, 0.5, -0.95, { cast: false });
  }

  // — the fire: a ring of stones, three crossed logs, and flames that never
  //   settle —
  const fx = 0;
  const fz = 0.55;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    box(group, 0.22, 0.15, 0.18, stone, fx + Math.cos(a) * 0.58, 0.06, fz + Math.sin(a) * 0.58, {
      cast: false,
      rotation: [0, a, 0],
    });
  }
  const logMat = M(0x2b1f15, { roughness: 0.95 });
  for (const [rot, dx, dz, rz] of [[0.5, 0, 0, 0.1], [-0.6, 0.06, 0.04, -0.12], [0.15, -0.05, 0.05, 0.06]])
    box(group, 0.92, 0.12, 0.12, logMat, fx + dx, 0.13, fz + dz, { rotation: [0, rot, rz] });

  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.82, fog: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.9, fog: false });
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const h = 0.36 + i * 0.09;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.2 - i * 0.02, h, 6), i < 2 ? coreMat : flameMat);
    f.position.set(
      fx + (seeded(i * 3.7) - 0.5) * 0.34,
      0.18 + h / 2,
      fz + (seeded(i * 8.1) - 0.5) * 0.26
    );
    group.add(f);
    flames.push(f);
  }

  // the only warm light in the shot
  const fire = new THREE.PointLight(0xff8a3c, 9.5, 11, 2);
  fire.position.set(fx, 0.8, fz);
  group.add(fire);
  // and a low bounce so the near ground is not a black band under them
  const bounce = new THREE.PointLight(0xff7a34, 2.2, 5.5, 2);
  bounce.position.set(fx, 0.25, fz + 0.6);
  group.add(bounce);

  // — the jungle: trunks close enough to matter, canopy above them —
  const tree = (x, z, h, r, tilt) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.rotation.z = tilt;
    group.add(t);
    box(t, r, h, r, barkDark, 0, h / 2, 0, { cast: false });
    const crown = new THREE.Group();
    crown.position.y = h;
    crown.userData.z0 = tilt;
    crown.userData.ph = seeded(x * 3.1 + z) * 6.3;
    t.add(crown);
    sway.push(crown);
    for (let i = 0; i < 3; i++) {
      const s = 1.5 + seeded(i * 7.3 + x) * 1.5;
      box(crown, s, s * 0.62, s, i % 2 ? leaf : leafDark, (seeded(i * 2.9 + z) - 0.5) * 2.2, i * 0.75, (seeded(i * 4.1 + x) - 0.5) * 1.8, {
        cast: false,
        rotation: [0, seeded(i * 6.7 + x) * 3, 0],
      });
    }
  };

  // near trunks frame the pair; the far ones make the wall the firelight stops at
  tree(-2.9, -3.2, 9.2, 0.62, 0.02);
  tree(3.1, -3.6, 10.4, 0.7, -0.03);
  tree(-4.6, -6.4, 11.5, 0.8, 0.05);
  tree(5.2, -7.2, 12.0, 0.85, -0.04);
  for (let i = 0; i < 16; i++) {
    const x = (seeded(i * 4.3) - 0.5) * 34;
    const z = -9 - seeded(i * 9.1) * 22;
    if (Math.abs(x) < 2.2 && z > -14) continue; // keep the sightline to the sky
    if (z < -12 && Math.abs(x - 0.13 * z) < 4) continue; // and the gap the moon sits in
    tree(x, z, 8 + seeded(i * 6.1) * 7, 0.5 + seeded(i * 2.3) * 0.6, (seeded(i * 8.7) - 0.5) * 0.08);
  }


  // — sky: stars the fog cannot reach, and the moon over the gap —
  const N = 850;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = -1.0 + seeded(i * 1.7) * 2.0;
    const el = 0.04 + seeded(i * 3.9) * 1.15;
    const R = 74;
    pos[i * 3] = Math.sin(a) * Math.cos(el) * R;
    pos[i * 3 + 1] = Math.sin(el) * R;
    pos[i * 3 + 2] = -Math.cos(a) * Math.cos(el) * R;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  group.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xdfe9ff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.92, fog: false, depthWrite: false })
    )
  );

  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ color: 0xf3f2e2, fog: false }));
  moon.position.set(-6.5, 16.5, -50);
  group.add(moon);

  updates.push((t) => {
    fire.intensity = 9.5 + Math.sin(t * 7.1) * 1.4 + Math.sin(t * 12.7 + 1.4) * 0.9;
    bounce.intensity = 2.2 + Math.sin(t * 9.3 + 0.6) * 0.5;
    flames.forEach((f, i) => {
      const k = 0.86 + 0.17 * Math.sin(t * (5.2 + i * 1.3) + i * 2.1);
      f.scale.set(0.9 + 0.13 * Math.sin(t * (3.7 + i) + i), k, 0.9 + 0.1 * Math.cos(t * (4.1 + i)));
      f.rotation.y = t * (0.5 + i * 0.22);
    });
    for (const c of sway) c.rotation.z = c.userData.z0 + Math.sin(t * 0.5 + c.userData.ph) * 0.014;
  });

  return {
    group,
    seat: 0.56,
    update(t, dt) {
      for (const fn of updates) fn(t, dt);
    },
  };
}

const SETS = { balcony, bus_stop: busStop, bedroom, diner, jungle, laundromat, library, street };


export function buildSet(name, opts = {}, t0 = 0) {
  const fn = SETS[name];
  if (!fn) throw new Error(`unknown set: ${name}`);
  return fn(opts, t0);
}
