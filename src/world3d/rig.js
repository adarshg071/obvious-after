import * as THREE from "three";

/* Blocky characters: rounded head, box torso, hinged limbs.
   Faces +Z at rotation.y = 0. Proportions in metres, total height ~2.55. */

const DARK = 0x0f0d12;

const HEAD_Y = 2.2;
const HEAD_R = 0.34;

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.78,
    metalness: 0.04,
    ...o,
  });
}

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function hairFor(style, hairMat) {
  const g = new THREE.Group();
  if (style === "bob") {
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.352, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.37), hairMat));
    cap.position.y = 0.02;
    cap.scale.set(1.02, 1.0, 1.04);
    g.add(cap);
    for (const s of [-1, 1]) {
      const side = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.3), hairMat));
      side.position.set(s * 0.265, -0.08, -0.03);
      g.add(side);
    }
    const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.14), hairMat));
    back.position.set(0, -0.04, -0.26);
    g.add(back);
  } else if (style === "beanie") {
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), hairMat));
    cap.position.y = 0.06;
    g.add(cap);
    const brim = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.355, 0.08, 18), hairMat));
    brim.position.y = 0.2;
    g.add(brim);
  } else {
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.345, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), hairMat));
    cap.position.y = 0.03;
    g.add(cap);
  }
  return g;
}

export function makeCharacter(spec) {
  const B = spec.body;
  const group = new THREE.Group();

  const skin = mat(B.skin, { roughness: 0.82 });
  const shirt = mat(B.shirt);
  const pants = mat(B.pants);
  const shoe = mat(B.shoe, { roughness: 0.6 });
  const hairMat = mat(B.hair, { roughness: 0.9 });

  /* A named outfit from the character's own file. It changes the coat, the
     scarf and the gloves — never the face, the hair, the height or the build. */
  const wd = spec.wardrobe ? (spec.wardrobes || {})[spec.wardrobe] || null : null;
  const torsoMat = wd?.coat ? mat(wd.coat) : shirt;
  const limbMat = wd?.coat ? mat(wd.coat) : shirt;
  const handMat = wd?.gloves ? mat(wd.gloves, { roughness: 0.75 }) : skin;

  // torso 0.90 → 1.82
  const torso = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.92, 0.46), torsoMat));
  torso.position.y = 1.36;
  group.add(torso);
  if (wd?.coat) {
    // the coat hangs a little wider and lower than the shirt it covers
    const hem = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.5), torsoMat));
    hem.position.y = 0.95;
    group.add(hem);
  }

  const hips = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.3, 0.44), pants));
  hips.position.y = 0.86;
  group.add(hips);

  // head
  const headG = new THREE.Group();
  headG.position.y = HEAD_Y;
  group.add(headG);

  const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.16, 12), skin));
  neck.position.y = 1.86;
  group.add(neck);

  const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 20, 14), skin));
  head.scale.set(1.0, 0.96, 0.94);
  headG.add(head);
  headG.add(hairFor(B.hairStyle, hairMat));

  // eyes sit just proud of the head surface
  const eyeMat = new THREE.MeshBasicMaterial({ color: DARK });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), eyeMat);
    e.position.set(s * 0.095, 0.055, 0.298);
    e.scale.y = spec.face.eyes === "tired" ? 0.7 : 1;
    headG.add(e);
    eyes.push(e);
  }

  // mouths
  const mouthG = new THREE.Group();
  mouthG.position.set(0, -0.055, 0.331);
  headG.add(mouthG);
  const mouthMat = new THREE.MeshBasicMaterial({ color: DARK });

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 14, Math.PI), mouthMat);
  smile.rotation.z = Math.PI;
  const flat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.024, 0.02), mouthMat);
  const open = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), mouthMat);
  open.scale.y = 0.85;
  const shock = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), mouthMat);
  const mouths = { smile, flat, open, shock };
  for (const m of Object.values(mouths)) {
    m.visible = false;
    mouthG.add(m);
  }
  mouths[spec.face.default] ? (mouths[spec.face.default].visible = true) : (mouths.smile.visible = true);

  // arms (pivot at shoulder 1.76)
  const armL = new THREE.Group();
  armL.position.set(-0.5, 1.76, 0);
  const armR = new THREE.Group();
  armR.position.set(0.5, 1.76, 0);
  for (const [g, s] of [[armL, -1], [armR, 1]]) {
    const limb = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.78, 0.23), limbMat));
    limb.position.y = -0.39;
    g.add(limb);
    const hand = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), handMat));
    hand.position.y = -0.8;
    g.add(hand);
    g.rotation.z = s * 0.03;
    group.add(g);
  }

  // a scarf at the neck: the one thing that says it is cold out
  if (wd?.scarf) {
    const scarfMat = mat(wd.scarf, { roughness: 0.92 });
    const wrap = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.42), scarfMat));
    wrap.position.y = 1.84;
    group.add(wrap);
    const tail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.1), scarfMat));
    tail.position.set(0.16, 1.62, 0.24);
    tail.rotation.z = 0.1;
    group.add(tail);
  }

  // phone prop, held face-up in the right hand (on speaker)
  if ((spec.props || []).includes("phone")) {
    const phone = new THREE.Group();
    phone.position.set(0, -0.86, 0.1);
    phone.rotation.x = 0.95;
    armR.add(phone);
    phone.add(shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.022), mat(0x0c0c10, { roughness: 0.35 }))));
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.092, 0.176),
      new THREE.MeshStandardMaterial({ color: 0x1a2a3a, emissive: new THREE.Color(0x3d7fae), emissiveIntensity: 2.2 })
    );
    screen.position.z = 0.012;
    phone.add(screen);
  }

  // open book, held in the near hand: two pages and a spine, nothing more
  let book = null;
  if ((spec.props || []).includes("book")) {
    book = new THREE.Group();
    book.position.set(0, -0.78, 0.24);
    book.rotation.set(1.25, 0.1, 0);
    armL.add(book);
    const paper = mat(0xe8e0cf, { roughness: 0.95 });
    for (const s of [-1, 1]) {
      const pg = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.3), paper));
      pg.position.x = s * 0.104;
      pg.rotation.z = s * -0.1;
      book.add(pg);
    }
    const spine = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.3), mat(0x6b3a2c, { roughness: 0.8 })));
    spine.position.y = -0.014;
    book.add(spine);
  }

  // a cheap notebook, held close enough to read the page
  let notebook = null;
  if ((spec.props || []).includes("notebook")) {
    notebook = new THREE.Group();
    notebook.position.set(0, -0.84, 0.18);
    notebook.rotation.set(1.12, 0.08, 0);
    armR.add(notebook);
    notebook.add(shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.034, 0.36), mat(0x242a34, { roughness: 0.85 }))));
    const leaf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.022, 0.34), mat(0xe4ddcd, { roughness: 0.95 })));
    leaf.position.y = 0.024;
    notebook.add(leaf);
  }

  // legs: hip pivot, then a knee, so sitting at a table is a bend and not a slab
  const legL = new THREE.Group();
  legL.position.set(-0.22, 0.88, 0);
  const legR = new THREE.Group();
  legR.position.set(0.22, 0.88, 0);
  const knees = [];
  for (const g of [legL, legR]) {
    const thigh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.46, 0.28), pants));
    thigh.position.y = -0.23;
    g.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    const shin = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 0.28), pants));
    shin.position.y = -0.22;
    knee.add(shin);
    const foot = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.4), shoe));
    foot.position.set(0, -0.44, 0.06);
    knee.add(foot);
    g.add(knee);
    knees.push(knee);
    group.add(g);
  }

  return {
    id: spec.id,
    group,
    head: headG,
    headBaseY: HEAD_Y,
    armL,
    armR,
    legL,
    legR,
    kneeL: knees[0],
    kneeR: knees[1],
    torso,
    mouths,
    eyes,
    book,
    notebook,
    face: spec.face,
    height: 2.55,
  };
}

/* pose: idle | sit | talk | react
   Rebuilt every frame, so poses never accumulate drift.
   `phase` desyncs breathing and blinking so two characters never tick together.
   `business` is what a silent character is doing with their hands. */
export function poseCharacter(c, pose, t, { talking = false, sit = false, seat = 0.52, call = false, phase = 0, walk = false, business = null } = {}) {
  const breathe = Math.sin(t * 1.45 + phase) * 0.05;

  c.armL.rotation.set(-0.05 + breathe, 0, -0.03);
  c.armR.rotation.set(0.05 - breathe, 0, 0.03);
  c.legL.rotation.set(0, 0, 0);
  c.legR.rotation.set(0, 0, 0);
  c.kneeL.rotation.set(0, 0, 0);
  c.kneeR.rotation.set(0, 0, 0);
  c.head.rotation.set(0, 0, Math.sin(t * 0.7 + phase) * 0.02);
  c.torso.rotation.set(0, 0, 0);
  c.group.position.y = 0;

  if (sit) {
    // knees bent back down: on a chair the shins go to the floor, on the floor they stay out front
    const bend = seat > 0.4 ? 1.5 : 0.15;
    c.legL.rotation.x = seat > 0.4 ? -1.55 : -1.32;
    c.legR.rotation.x = seat > 0.4 ? -1.48 : -1.26;
    c.kneeL.rotation.x = bend;
    c.kneeR.rotation.x = bend;
    // hands rest forward, on the knees
    c.armL.rotation.set(-0.62, 0, -0.14);
    c.armR.rotation.set(-0.58, 0, 0.14);
    c.group.position.y = seat - 0.88;
  }

  // walking on the spot: hips swing out of phase, the knee follows a beat late,
  // the arms counter, and the body rises twice a cycle. The street slides
  // backwards under them, so the feet never have to travel.
  if (walk) {
    const w = t * 6.0 + phase;
    const step = Math.sin(w);
    c.legL.rotation.x = step * 0.6;
    c.legR.rotation.x = -step * 0.6;
    c.kneeL.rotation.x = Math.max(0, Math.sin(w - 0.6)) * 0.8;
    c.kneeR.rotation.x = Math.max(0, -Math.sin(w - 0.6)) * 0.8;
    c.armL.rotation.x = -step * 0.42;
    c.armR.rotation.x = step * 0.42;
    c.group.position.y = Math.abs(Math.cos(w)) * 0.05;
    c.torso.rotation.x = 0.04;
  }

  const blink = (t + phase) % 4.3 < 0.11;
  c.eyes.forEach((e) => (e.scale.y = blink ? 0.12 : 1));

  const show = (name) => {
    for (const [k, m] of Object.entries(c.mouths)) m.visible = k === name;
  };

  if (talking) {
    show((t * 8.4) % 1 > 0.42 ? "open" : "flat");
    c.head.rotation.x = Math.sin(t * 3.2) * 0.045;
    c.head.rotation.z = Math.sin(t * 1.9) * 0.025;
    if (!call) {
      c.armR.rotation.set(-0.28 + Math.sin(t * 2.3) * 0.2, 0, 0.06);
      c.armL.rotation.set(-0.1 + Math.sin(t * 1.7) * 0.1, 0, -0.05);
    }
    c.torso.rotation.x = Math.sin(t * 2.6) * 0.02;
  } else if (pose === "react") {
    show("shock");
    c.head.rotation.x = -0.12;
    c.armL.rotation.z = -0.2;
    c.armR.rotation.z = 0.2;
  } else {
    show(c.face?.default || (sit ? "flat" : "smile"));
  }

  // on a call: phone on speaker in the near hand, held where the light lands
  if (call) {
    c.armR.rotation.set(-0.95, 0, 0.1);
    c.armR.rotation.z += Math.sin(t * 1.1) * 0.015;
    c.armL.rotation.set(-0.62, 0, -0.05);
    show(talking ? ((t * 8.4) % 1 > 0.42 ? "open" : "flat") : "flat");
  }

  // a book is held up far enough to read, not left hanging at the thigh
  if (c.book && !call) {
    c.armL.rotation.x = -1.02;
    c.armL.rotation.z = -0.16;
  }

  // the notebook is held the same way in the near hand, and it wins over the
  // talking gesture: he is counting, not explaining
  if (c.notebook) {
    c.armR.rotation.x = -0.95;
    c.armR.rotation.z = 0.18;
  }

  // what a silent character is doing: never fully still, never fidgeting
  if (!talking && !call && business) {
    if (business === "tap") {
      // two finger-taps on the page, then three seconds of nothing
      const p = (t % 3.6) / 3.6;
      const pulse =
        Math.exp(-Math.pow((p - 0.05) / 0.03, 2)) + 0.7 * Math.exp(-Math.pow((p - 0.15) / 0.03, 2));
      c.armL.rotation.x -= 0.3 * pulse;
      c.head.rotation.x += 0.06 * pulse;
    } else if (business === "shelve") {
      // one slow reach to the shelf and back, about every four seconds
      const s = 0.5 - 0.5 * Math.cos((t % 4.2) * 1.5);
      c.armL.rotation.x = -0.3 - 0.75 * s;
      c.armL.rotation.z = -0.12 - 0.1 * s;
      c.head.rotation.x = 0.05 + 0.09 * s;
    } else if (business === "key") {
      // the near hand on the lock at hip height: one turn, then still
      const turn = Math.exp(-Math.pow(((t % 5.5) - 0.4) / 0.18, 2));
      c.armR.rotation.x = -0.32;
      c.armR.rotation.z = 0.05 + 0.14 * turn;
    } else if (business === "push") {
      // both hands on the trolley handle, swaying as it rolls
      const s = Math.sin(t * 0.8 + phase);
      c.armL.rotation.x = -0.85 + s * 0.04;
      c.armR.rotation.x = -0.85 - s * 0.04;
      c.armL.rotation.z = -0.06;
      c.armR.rotation.z = 0.06;
    } else if (business === "read") {
      c.head.rotation.x = 0.16 + Math.sin(t * 0.9 + phase) * 0.02;
      c.armL.rotation.x = sit ? -1.05 : -0.95;
    }
  }
}
