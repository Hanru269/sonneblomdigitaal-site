// Sonneblom AI Works: walkable retro 2000s startup office where the AI employees live.
import * as THREE from "three";

const $ = (s) => document.querySelector(s);
const canvas = $("#c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#7fd3ff");
scene.fog = new THREE.Fog("#7fd3ff", 40, 80);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);
const EYE = 1.65;
const player = { x: 0, z: 12, yaw: 0, pitch: -0.05 };

scene.add(new THREE.HemisphereLight("#fff6e0", "#5b3fa0", 1.25));
const sun = new THREE.DirectionalLight("#ffffff", 1.1);
sun.position.set(-10, 20, 8);
scene.add(sun);

// ---------- helpers ----------
const mats = {};
const mat = (c, o = {}) => (mats[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }));
const glow = (c) => mat(c, { emissive: c, emissiveIntensity: 0.9 });
const solids = []; // AABBs the player can't walk through: [minX, minZ, maxX, maxZ]
function box(w, h, d, m, x, y, z, solid = false, parent = scene) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === "string" ? mat(m) : m);
  b.position.set(x, y, z);
  parent.add(b);
  if (solid) solids.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  return b;
}
function cyl(rt, rb, h, m, x, y, z, seg = 20) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === "string" ? mat(m) : m);
  c.position.set(x, y, z);
  scene.add(c);
  return c;
}
function textTex(lines, { w = 512, h = 256, bg = "#16112e", fg = "#fff", font = "bold 44px Trebuchet MS", align = "center", glowC } = {}) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.font = font; g.textAlign = align; g.textBaseline = "middle";
  if (glowC) { g.shadowColor = glowC; g.shadowBlur = 24; }
  const L = [].concat(lines);
  L.forEach((t, i) => {
    const [txt, col] = Array.isArray(t) ? t : [t, fg];
    g.fillStyle = col;
    g.fillText(txt, align === "center" ? w / 2 : 24, h / 2 + (i - (L.length - 1) / 2) * (h / (L.length + 0.6)));
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function sign(tex, w, h, x, y, z, ry = 0, emissive = true) {
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(x, y, z); p.rotation.y = ry;
  scene.add(p);
  return p;
}

// ---------- the room ----------
const W = 20, D = 15, H = 5; // half width, half depth, height
{ // checkerboard retro floor
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#f4ecff" : "#ff5fc8"; g.fillRect(i * 32, j * 32, 32, 32); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 7.5); t.colorSpace = THREE.SRGBColorSpace;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }));
  f.rotation.x = -Math.PI / 2; scene.add(f);
}
box(W * 2, 0.2, D * 2, new THREE.MeshBasicMaterial({ color: "#f3ecff" }), 0, H, 0); // ceiling (unlit so it never goes dark)
for (let x = -15; x <= 15; x += 7.5) for (let z = -10; z <= 10; z += 6.5) box(3, 0.06, 1, glow("#fff7d6"), x, H - 0.12, z);
// walls: back yellow, right teal, front purple, left = windows
box(W * 2, H, 0.3, "#ffd23f", 0, H / 2, -D, true);
box(0.3, H, D * 2, "#28c8d8", W, H / 2, 0, true);
box(W * 2 - 6, H, 0.3, "#7b4dff", -3 - 0, H / 2, D, true); box(4, H, 0.3, "#7b4dff", W - 2, H / 2, D, true); // gap = front door at x 15..17
box(0.3, 1, D * 2, "#ff5fc8", -W, 0.5, 0, true); box(0.3, 0.6, D * 2, "#ff5fc8", -W, H - 0.3, 0);
for (let z = -12; z <= 12; z += 6) box(0.32, H, 0.4, "#ff5fc8", -W, H / 2, z);
{ // city view through the windows
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 256;
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#3fb6ff"); gr.addColorStop(1, "#bfefff");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 40; i++) {
    const w = 20 + Math.random() * 40, h = 60 + Math.random() * 160, x = i * 26;
    g.fillStyle = ["#5b5fd6", "#7c63e6", "#4c8bd6", "#8a5bd6"][i % 4]; g.fillRect(x, 256 - h, w, h);
    g.fillStyle = "#fff7a8"; for (let y = 256 - h + 8; y < 250; y += 14) for (let wx = x + 4; wx < x + w - 6; wx += 10) if (Math.random() > 0.45) g.fillRect(wx, y, 5, 7);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(D * 2, H - 1.6), new THREE.MeshBasicMaterial({ map: t }));
  p.position.set(-W - 0.4, 2.5, 0); p.rotation.y = Math.PI / 2; scene.add(p);
}
// neon sign + door sign
sign(textTex(["SONNEBLOM AI WORKS"], { w: 1024, h: 160, bg: null, fg: "#ff3fbf", font: "900 78px Trebuchet MS", glowC: "#ff3fbf" }), 12, 1.9, 0, 3.9, -D + 0.17);
sign(textTex([["est. 2026 · humans welcome", "#16112e"]], { w: 1024, h: 90, bg: null, font: "bold 52px Trebuchet MS" }), 7, 0.6, 0, 3.05, -D + 0.17);
sign(textTex([["EXIT", "#3dffa8"]], { w: 256, h: 96, glowC: "#3dffa8" }), 1.2, 0.45, 16, 3.3, D - 0.17, Math.PI);

// ---------- furniture kits ----------
function crt(x, y, z, ry, screenTex) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  box(0.7, 0.55, 0.6, "#efe6cf", 0, 0.28, 0, false, g);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.42), new THREE.MeshBasicMaterial({ map: screenTex }));
  s.position.set(0, 0.3, 0.305); g.add(s);
  return g;
}
function desk(x, z, ry, color) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  box(2.4, 0.08, 1.1, color, 0, 0.78, 0, false, g);
  for (const [dx, dz] of [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]]) box(0.08, 0.78, 0.08, "#2b2550", dx, 0.39, dz, false, g);
  const c = Math.cos(ry), s = Math.sin(ry);
  solids.push([x - 1.3 * Math.abs(c) - 0.6 * Math.abs(s), z - 0.6 * Math.abs(c) - 1.3 * Math.abs(s), x + 1.3 * Math.abs(c) + 0.6 * Math.abs(s), z + 0.6 * Math.abs(c) + 1.3 * Math.abs(s)]);
  return g;
}
function robot(color, name) {
  const g = new THREE.Group();
  const body = mat(color, { metalness: 0.3, roughness: 0.35 });
  box(0.7, 0.75, 0.5, body, 0, 0.95, 0, false, g);
  const head = new THREE.Group(); head.position.y = 1.62; g.add(head);
  box(0.62, 0.48, 0.5, body, 0, 0, 0, false, head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), new THREE.MeshBasicMaterial({ color: "#10102a" })); face.position.set(0, 0, 0.255); head.add(face);
  const eyeM = glow("#3dffa8");
  for (const ex of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), eyeM); e.position.set(ex, 0.03, 0.27); head.add(e); }
  const ant = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow("#ffd23f")); ant.position.y = 0.38; head.add(ant);
  box(0.02, 0.15, 0.02, "#ccc", 0, 0.29, 0, false, head);
  for (const ax of [-0.45, 0.45]) box(0.14, 0.55, 0.14, body, ax, 0.98, 0.05, false, g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.55, 16), mat("#2b2550")); base.position.y = 0.3; g.add(base);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshBasicMaterial({ map: textTex([name], { w: 256, h: 80, bg: "#ffd23f", fg: "#16112e", font: "900 46px Trebuchet MS" }) }));
  tag.position.set(0, 1.08, 0.26); g.add(tag);
  g.userData.head = head;
  scene.add(g);
  return g;
}

// ---------- zone: the AI employees (back of the room) ----------
const screenSheet = textTex(["FinBot.xlsx", ["✓ BALANCED", "#3dffa8"], "70 lines · 39 auto"], { w: 256, h: 192, bg: "#0b3d2a", fg: "#b9ffd9", font: "bold 26px Courier New" });
const screenSoon = textTex(["COMING", "SOON"], { w: 256, h: 192, bg: "#2a1450", fg: "#ff9fe9", font: "bold 40px Courier New" });
const pods = [
  { id: "finbot", x: -9, z: -9, color: "#28e0ff", name: "FINBOT", live: true },
  { id: "social", x: 0, z: -9, color: "#ff3fbf", name: "SOCIALBOT", live: false },
  { id: "pa", x: 9, z: -9, color: "#ffd23f", name: "PA-BOT", live: false },
];
const bots = {};
for (const p of pods) {
  desk(p.x, p.z, 0, p.live ? "#ff8a1f" : "#a58cff");
  crt(p.x - 0.5, 0.82, p.z - 0.15, 0, p.live ? screenSheet : screenSoon);
  box(0.5, 0.05, 0.18, "#efe6cf", p.x - 0.5, 0.84, p.z + 0.3);
  const r = robot(p.color, p.name);
  r.position.set(p.x + 0.2, 0, p.z - 1.0);
  if (!p.live) r.traverse((o) => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; } });
  bots[p.id] = r;
  solids.push([p.x - 0.3, p.z - 1.4, p.x + 0.7, p.z - 0.6]);
  sign(textTex([p.live ? "🟢 AT WORK" : "🛠️ IN TRAINING"], { w: 256, h: 64, bg: p.live ? "#16112e" : "#3a2a6e", fg: p.live ? "#3dffa8" : "#ffd23f", font: "bold 30px Trebuchet MS" }), 1.4, 0.35, p.x, 2.2, p.z - 0.6);
  // pod rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), mat(p.live ? "#3dffa8" : "#d9ccff")); rug.rotation.x = -Math.PI / 2; rug.position.set(p.x, 0.01, p.z + 0.4); scene.add(rug);
}
// whiteboard with today's numbers
sign(textTex([["TODAY ON THE FLOOR", "#16112e"], ["FinBot: 70 lines, 0 errors", "#e0249b"], ["SocialBot: training", "#7b4dff"], ["PA-Bot: training", "#7b4dff"]], { w: 768, h: 384, bg: "#ffffff", font: "bold 40px Comic Sans MS" }), 4.4, 2.2, 14.5, 2.4, -D + 0.18);
box(4.6, 2.4, 0.06, "#c0c0d0", 14.5, 2.4, -D + 0.14);

// ---------- zone: arcade (right wall) ----------
function arcade(x, z, color, title) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; scene.add(g);
  box(1, 1.9, 0.9, color, 0, 0.95, 0, false, g);
  box(1, 0.25, 0.5, "#16112e", 0, 1.05, 0.55, false, g);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.6), new THREE.MeshBasicMaterial({ map: textTex([title, ["INSERT COIN", "#ffd23f"]], { w: 256, h: 200, bg: "#000", fg: "#3dffa8", font: "bold 28px Courier New" }) }));
  sc.position.set(0, 1.5, 0.46); sc.rotation.x = -0.15; g.add(sc);
  const mq = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.25), new THREE.MeshBasicMaterial({ map: textTex([title], { w: 256, h: 64, bg: "#ffd23f", fg: "#16112e", font: "900 34px Trebuchet MS" }) }));
  mq.position.set(0, 2.02, 0.46); g.add(mq);
  for (const [bx, c] of [[-0.25, "#ff3fbf"], [0, "#28e0ff"], [0.25, "#3dffa8"]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), glow(c)); b.position.set(bx, 1.2, 0.72); g.add(b); }
  solids.push([x - 0.5, z - 0.55, x + 0.5, z + 0.55]);
}
arcade(19.2, 2, "#7b4dff", "SNAKE");
arcade(19.2, 4, "#ff3fbf", "PONG");
arcade(19.2, 6, "#28e0ff", "SNAKE II");
sign(textTex([["ARCADE", "#ffd23f"]], { w: 512, h: 128, bg: null, font: "900 96px Trebuchet MS", glowC: "#ffd23f" }), 3.5, 0.9, W - 0.18, 3.6, 4, -Math.PI / 2);

// ---------- zone: lounge (left, by the windows) ----------
box(1.1, 0.45, 4, "#ff8a1f", -18.6, 0.23, 4, true); box(0.35, 1, 4, "#ff8a1f", -19.3, 0.6, 4);
for (const [bx, bz, c] of [[-15.5, 2, "#3dffa8"], [-15, 5.5, "#28e0ff"], [-16.2, 7.5, "#ffd23f"]]) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), mat(c)); b.scale.y = 0.6; b.position.set(bx, 0.35, bz); scene.add(b);
  solids.push([bx - 0.5, bz - 0.5, bx + 0.5, bz + 0.5]);
}
box(1.4, 0.4, 1, "#16112e", -16.8, 0.2, 4, true);
const lava = [];
for (const [lx, c] of [[-17.2, "#ff3fbf"], [-16.4, "#ffd23f"]]) {
  cyl(0.08, 0.13, 0.12, "#c0c0d0", lx, 0.46, 4);
  const l = cyl(0.1, 0.08, 0.45, mat(c, { emissive: c, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 }), lx, 0.75, 4);
  lava.push(l);
}
{ // big plant
  cyl(0.35, 0.28, 0.6, "#ff5fc8", -18.8, 0.3, 11);
  for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4, 6), mat("#2ec27e")); l.position.set(-18.8 + Math.sin(i) * 0.2, 1.2, 11 + Math.cos(i) * 0.2); l.rotation.z = Math.sin(i * 2) * 0.5; scene.add(l); }
  solids.push([-19.2, 10.6, -18.4, 11.4]);
}

// ---------- zone: ping pong (centre) ----------
box(2.8, 0.08, 1.5, "#1f8f5a", 0, 0.76, 3.5); box(2.8, 0.02, 0.02, "#fff", 0, 0.81, 3.5);
box(0.02, 0.16, 1.5, "#ddd", 0, 0.86, 3.5);
for (const [dx, dz] of [[-1.3, -0.65], [1.3, -0.65], [-1.3, 0.65], [1.3, 0.65]]) box(0.08, 0.76, 0.08, "#2b2550", dx, 0.38, 3.5 + dz);
solids.push([-1.5, 2.65, 1.5, 4.35]);
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), glow("#ff8a1f")); ball.position.set(0, 0.86, 3.5); scene.add(ball);
let pingT = 0;

// ---------- zone: kitchen corner (front left) ----------
const vend = box(1.3, 2.2, 0.9, "#e0249b", -13, 1.1, 13.9, true);
sign(textTex([["FIZZ-O-MATIC", "#ffd23f"], ["🥤🍒🍋🫐", "#fff"]], { w: 256, h: 256, bg: "#16112e", font: "bold 34px Trebuchet MS" }), 1, 1.3, -13, 1.35, 13.44, Math.PI);
box(0.5, 1.2, 0.5, "#28e0ff", -10.8, 0.6, 14.3, true); cyl(0.2, 0.2, 0.5, mat("#bff3ff", { transparent: true, opacity: 0.7 }), -10.8, 1.45, 14.3);
// welcome mat at the door
const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshBasicMaterial({ map: textTex([["WELCOME", "#16112e"]], { w: 512, h: 256, bg: "#ffd23f", font: "900 90px Trebuchet MS" }) }));
rug.rotation.x = -Math.PI / 2; rug.position.set(16, 0.012, 13.6); scene.add(rug);

// ---------- interactions ----------
const spots = [
  { x: -9, z: -7.6, r: 2.4, label: "Talk to FinBot", fn: () => openFinbot() },
  { x: 0, z: -7.6, r: 2.4, label: "Meet SocialBot", fn: () => openSoon("social") },
  { x: 9, z: -7.6, r: 2.4, label: "Meet PA-Bot", fn: () => openSoon("pa") },
  { x: 18, z: 2, r: 1.5, label: "Play SNAKE", fn: () => openSnake("SNAKE") },
  { x: 18, z: 4, r: 1.5, label: "Play PONG", fn: () => openPong() },
  { x: 18, z: 6, r: 1.5, label: "Play SNAKE II", fn: () => openSnake("SNAKE II", true) },
  { x: -13, z: 12.6, r: 1.8, label: "Buy a fizz", fn: () => fizz() },
  { x: 0, z: 2, r: 2.2, label: "Serve!", fn: () => { pingT = 4; toast("🏓 Rally on!"); } },
  { x: 0, z: 5, r: 2.2, label: "Serve!", fn: () => { pingT = 4; toast("🏓 Rally on!"); } },
  { x: -16.6, z: 4, r: 2.2, label: "Chill on the beanbag", fn: () => toast("😎 Lava lamps on max. 10/10 vibes.") },
  { x: 14.5, z: -13, r: 2.4, label: "Read the whiteboard", fn: () => openBoard() },
];

// ---------- input: walk + look ----------
const keys = {};
addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === "e" && near && $("#panel").hidden) near.fn(); if (e.key === "Escape") closePanel(); });
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
const touch = matchMedia("(pointer: coarse)").matches;
if (touch) document.body.classList.add("touch");
let joy = { id: null, x: 0, y: 0, cx: 0, cy: 0 }, look = { id: null, x: 0, y: 0 };
canvas.addEventListener("pointerdown", (e) => {
  if (!$("#panel").hidden) return;
  if (touch && e.clientX < innerWidth * 0.45 && joy.id === null) {
    const r = $("#joy").getBoundingClientRect();
    joy = { id: e.pointerId, x: 0, y: 0, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  } else if (look.id === null) look = { id: e.pointerId, x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
    const m = Math.hypot(dx, dy), max = 45;
    if (m > max) { dx *= max / m; dy *= max / m; }
    joy.x = dx / max; joy.y = dy / max;
    $("#knob").style.transform = `translate(${dx}px,${dy}px)`;
  } else if (e.pointerId === look.id) {
    player.yaw -= (e.clientX - look.x) * 0.005;
    player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch - (e.clientY - look.y) * 0.004));
    look.x = e.clientX; look.y = e.clientY;
  }
});
const up = (e) => {
  if (e.pointerId === joy.id) { joy = { id: null, x: 0, y: 0 }; $("#knob").style.transform = ""; }
  if (e.pointerId === look.id) look.id = null;
};
canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
// joystick also works when the thumb lands on the pad itself
$("#joy").addEventListener("pointerdown", (e) => {
  const r = $("#joy").getBoundingClientRect();
  joy = { id: e.pointerId, x: 0, y: 0, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  canvas.setPointerCapture(e.pointerId);
});

function blocked(x, z) {
  const R = 0.35;
  if (x < -W + 0.5 || x > W - 0.5 || z < -D + 0.5 || z > D - 0.5) return true;
  return solids.some(([a, b, c, d]) => x > a - R && x < c + R && z > b - R && z < d + R);
}
function move(dt) {
  let f = 0, s = 0;
  if (keys.w || keys.arrowup) f += 1;
  if (keys.s || keys.arrowdown) f -= 1;
  if (keys.a) s -= 1;
  if (keys.d) s += 1;
  if (keys.arrowleft) player.yaw += dt * 2;
  if (keys.arrowright) player.yaw -= dt * 2;
  f -= joy.y; s += joy.x;
  const sp = 3.6 * dt, sn = Math.sin(player.yaw), cs = Math.cos(player.yaw);
  const dx = (-sn * f + cs * s) * sp, dz = (-cs * f - sn * s) * sp;
  if (!blocked(player.x + dx, player.z)) player.x += dx;
  if (!blocked(player.x, player.z + dz)) player.z += dz;
}

// ---------- UI ----------
let near = null;
$("#act").onclick = () => near && near.fn();
$("#close").onclick = closePanel;
function openPanel(html) { $("#pbody").innerHTML = html; $("#panel").hidden = false; stopGames(); }
function closePanel() { $("#panel").hidden = true; stopGames(); }
let toastT;
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2600); }
$("#enter").onclick = () => { $("#intro").remove(); toast(touch ? "👈 Walk with your left thumb" : "WASD to walk · drag to look"); };
$("#mapBtn").onclick = () => openPanel(`<div class="kick">Floor plan</div><h2>Where is everyone?</h2>
  <ul class="sk"><li>🤖 <b>Back wall:</b> the AI employees. FinBot is at work; SocialBot and PA-Bot are in training.</li>
  <li>🕹️ <b>Right wall:</b> the arcade (Snake, Pong, Snake II).</li><li>🛋️ <b>By the windows:</b> lounge, beanbags, lava lamps.</li>
  <li>🏓 <b>Middle:</b> ping pong.</li><li>🥤 <b>Front left:</b> the Fizz-O-Matic and water cooler.</li></ul>`);

let demo = null;
fetch("demo.json?v=1").then((r) => r.json()).then((d) => (demo = d)).catch(() => {});
const R = (n) => "R" + Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function openFinbot(tab = "hi") {
  const t = (id, l) => `<button data-t="${id}" class="${tab === id ? "on" : ""}">${l}</button>`;
  let body = "";
  if (tab === "hi") body = `<p>Hi! I'm <b>FinBot</b>, your bookkeeping employee. Send me a bank statement (any SA bank, even a scanned PDF) and I'll hand back a finished Excel file.</p>
    <p>I check every line against the bank's running balance, so the totals tie to the cent before you see them. Anything I'm unsure about goes on a short question list for your client, never into the wrong account.</p>
    <button class="big" data-t="demo">▶ Watch me work</button>`;
  if (tab === "skills") body = `<ul class="sk"><li>📄 Bank statement PDF → Excel (FNB, ABSA, Standard Bank, Nedbank, Capitec, scans too)</li>
    <li>✅ Line-by-line balance check + full reconciliation sheet</li><li>🗂️ Allocates to your chart of accounts (Sage/Pastel-style codes)</li>
    <li>🧾 Splits out VAT for VAT-registered clients</li><li>❓ Builds the client query list for unclear items</li>
    <li>🧠 Learns each client's rules: correct me once, I remember</li><li>📤 Import file for Sage, Xero or QuickBooks</li></ul>`;
  if (tab === "hire") body = `<p><b>Two ways to work with FinBot:</b></p><ul class="sk">
    <li>🏠 <b>Rent:</b> monthly subscription. FinBot lives here in our office; you send statements, it sends back the files.</li>
    <li>🔑 <b>Own:</b> buy FinBot outright with its own office hub, plus a monthly maintenance plan or a fee per call-out.</li></ul>
    <p class="dim">Pricing is being finalised. Ask us for early access.</p>
    <a class="big" style="display:inline-block;text-decoration:none" href="mailto:hello@eaafix.com?subject=FinBot%20early%20access">Ask for early access</a>`;
  if (tab === "demo") body = `<div class="pipe" id="pipe"><div>📄 Reading the statement…</div><div>🔢 Checking every running balance…</div><div>🗂️ Allocating to accounts…</div><div>📊 Building the Excel file…</div></div><div id="res"></div>`;
  openPanel(`<div class="kick">AI employee · Finance</div><h2>FinBot 🤖</h2><div class="tabs">${t("hi", "Hello")}${t("skills", "Skills")}${t("demo", "Demo")}${t("hire", "Hire")}</div>${body}`);
  $("#pbody").querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => openFinbot(b.dataset.t)));
  if (tab === "demo") runDemo();
}
function runDemo() {
  const steps = [...document.querySelectorAll("#pipe div")];
  steps.forEach((s, i) => setTimeout(() => s.classList.add("on"), 500 + i * 800));
  setTimeout(() => {
    const el = $("#res");
    if (!el) return;
    if (!demo) { el.innerHTML = "<p>Demo data didn't load. Try again.</p>"; return; }
    el.innerHTML = `<p class="dim">Real FinBot run on a ${demo.bank}.</p>
      <div class="stats"><div><b>${demo.lines}</b>lines read</div><div><b>${demo.balanced ? "✓ R0.00" : "check"}</b>difference</div>
      <div><b>${demo.auto}</b>allocated automatically</div><div><b>${demo.queries}</b>questions for the client</div></div>
      <table><tr><th>Date</th><th>Description</th><th class="n">Amount</th><th>Account</th></tr>
      ${demo.rows.map((r) => `<tr><td>${r.d}</td><td>${r.desc}</td><td class="n">${r.amt < 0 ? "-" : ""}${R(r.amt)}</td><td>${r.acc.startsWith("9999") ? '<span class="q">❓ ask client</span>' : r.acc}</td></tr>`).join("")}</table>
      <p><b>Questions FinBot asks the client:</b></p><ul class="sk">${demo.questions.map((q) => `<li class="q">${q}</li>`).join("")}</ul>`;
  }, 500 + steps.length * 800);
}
const SOON = {
  social: ["SocialBot", "AI employee · Social media", "Deep social media know-how: hooks, posting times, captions, hashtags and SEO for every platform. It plans your month, writes the posts and tells you what's working.", ["📅 Content calendar for the month", "✍️ Captions, hooks and hashtags in your voice", "🔎 SEO and Google Business posts", "📈 Weekly 'what worked' report"]],
  pa: ["PA-Bot", "AI employee · Personal assistant", "A personal assistant that can run your computer for you: email, calendar, forms, files and the boring admin.", ["📥 Sorts and drafts replies to email", "📆 Books and moves meetings", "🧾 Fills in forms and portals", "🗂️ Files documents where they belong"]],
};
function openSoon(id) {
  const [n, k, d, sk] = SOON[id];
  openPanel(`<div class="kick">${k}</div><h2>${n} 🛠️</h2><p>${d}</p><ul class="sk">${sk.map((s) => `<li>${s}</li>`).join("")}</ul><p class="dim">In training. Want to be first in line? <a href="mailto:hello@eaafix.com?subject=${n}%20early%20access" style="color:#28e0ff">Ask for early access</a>.</p>`);
}
function openBoard() {
  openPanel(`<div class="kick">Whiteboard</div><h2>Today on the floor</h2><ul class="sk"><li>🤖 FinBot: test statement, 70 lines, balanced to the cent.</li><li>🛠️ SocialBot: studying platform playbooks.</li><li>🛠️ PA-Bot: learning to drive a computer.</li><li>🍕 Friday: pizza for humans.</li></ul>`);
}
const DRINKS = ["🍒 Cherry Fizz", "🍋 Lemon Zap", "🫐 Blueberry Blast", "🥭 Mango Mayhem", "☕ Iced Rooibos"];
function fizz() { toast(`Clunk! You got a ${DRINKS[Math.floor(Math.random() * DRINKS.length)]} (+5 energy)`); }

// ---------- arcade games ----------
let gameLoop = null, gameKeys = null;
function stopGames() { clearInterval(gameLoop); gameLoop = null; if (gameKeys) removeEventListener("keydown", gameKeys); gameKeys = null; }
const best = (k) => +(localStorage.getItem("office-" + k) || 0);
function openSnake(title, fast = false) {
  openPanel(`<div class="kick">Arcade</div><h2>${title}</h2><p class="dim">Best: <b id="best">${best(title)}</b> · Score: <b id="sc">0</b></p>
    <canvas class="game" id="g" width="300" height="300"></canvas>
    <div class="pad"><span></span><button data-d="0,-1">▲</button><span></span><button data-d="-1,0">◀</button><button data-d="0,1">▼</button><button data-d="1,0">▶</button></div>`);
  const g = $("#g").getContext("2d"), N = 15, S = 20;
  let sn = [[7, 7]], dir = [1, 0], next = [1, 0], food = [3, 3], score = 0;
  const setDir = (d) => { if (d[0] !== -dir[0] || d[1] !== -dir[1]) next = d; };
  document.querySelectorAll(".pad [data-d]").forEach((b) => (b.onpointerdown = () => setDir(b.dataset.d.split(",").map(Number))));
  gameKeys = (e) => { const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[e.key.toLowerCase()]; if (m) { setDir(m); e.preventDefault(); } };
  addEventListener("keydown", gameKeys);
  let sx = 0, sy = 0;
  $("#g").ontouchstart = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
  $("#g").ontouchend = (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) setDir(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); };
  gameLoop = setInterval(() => {
    dir = next;
    const h = [(sn[0][0] + dir[0] + N) % N, (sn[0][1] + dir[1] + N) % N];
    if (sn.some((p) => p[0] === h[0] && p[1] === h[1])) {
      if (score > best(title)) localStorage.setItem("office-" + title, score);
      toast(`💥 Game over: ${score}`); sn = [[7, 7]]; dir = next = [1, 0]; score = 0; $("#best").textContent = best(title);
    } else {
      sn.unshift(h);
      if (h[0] === food[0] && h[1] === food[1]) { score++; food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } else sn.pop();
    }
    $("#sc").textContent = score;
    g.fillStyle = "#000"; g.fillRect(0, 0, 300, 300);
    g.fillStyle = "#ff3fbf"; g.fillRect(food[0] * S + 3, food[1] * S + 3, S - 6, S - 6);
    sn.forEach((p, i) => { g.fillStyle = i ? "#3dffa8" : "#ffd23f"; g.fillRect(p[0] * S + 1, p[1] * S + 1, S - 2, S - 2); });
  }, fast ? 85 : 130);
}
function openPong() {
  openPanel(`<div class="kick">Arcade</div><h2>PONG vs FinBot</h2><p class="dim">You <b id="ps">0</b> : <b id="cs">0</b> FinBot · drag or use ◀ ▶</p>
    <canvas class="game" id="g" width="300" height="360"></canvas><div class="pad"><button data-m="-1">◀</button><span></span><button data-m="1">▶</button></div>`);
  const cv = $("#g"), g = cv.getContext("2d");
  let px = 150, cx = 150, b = { x: 150, y: 180, vx: 2.4, vy: 3 }, ps = 0, cs = 0, hold = 0;
  document.querySelectorAll(".pad [data-m]").forEach((x) => { x.onpointerdown = () => (hold = +x.dataset.m); x.onpointerup = x.onpointerleave = () => (hold = 0); });
  cv.onpointermove = (e) => { const r = cv.getBoundingClientRect(); px = (e.clientX - r.left) * (300 / r.width); };
  gameKeys = (e) => { if (e.key === "ArrowLeft" || e.key === "a") px -= 20; if (e.key === "ArrowRight" || e.key === "d") px += 20; };
  addEventListener("keydown", gameKeys);
  gameLoop = setInterval(() => {
    px = Math.max(30, Math.min(270, px + hold * 6));
    cx += Math.max(-2.6, Math.min(2.6, b.x - cx));
    b.x += b.vx; b.y += b.vy;
    if (b.x < 6 || b.x > 294) b.vx *= -1;
    if (b.y > 336 && Math.abs(b.x - px) < 34 && b.vy > 0) { b.vy = -Math.abs(b.vy) * 1.04; b.vx += (b.x - px) / 12; }
    if (b.y < 24 && Math.abs(b.x - cx) < 34 && b.vy < 0) b.vy = Math.abs(b.vy) * 1.02;
    if (b.y > 370) { cs++; b = { x: 150, y: 180, vx: 2.4, vy: -3 }; }
    if (b.y < -10) { ps++; b = { x: 150, y: 180, vx: -2.4, vy: 3 }; toast("🎉 Point to you!"); }
    $("#ps").textContent = ps; $("#cs").textContent = cs;
    g.fillStyle = "#000"; g.fillRect(0, 0, 300, 360);
    g.fillStyle = "#28e0ff"; g.fillRect(cx - 30, 12, 60, 8);
    g.fillStyle = "#ffd23f"; g.fillRect(px - 30, 340, 60, 8);
    g.fillStyle = "#ff3fbf"; g.beginPath(); g.arc(b.x, b.y, 6, 0, 7); g.fill();
  }, 16);
}

// ---------- loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 80 : 70; camera.updateProjectionMatrix(); }
window.officePlayer = player; // handy for testing and future "teleport to desk" links
addEventListener("resize", resize); resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if ($("#panel").hidden) move(dt);
  camera.position.set(player.x, EYE + Math.sin(t * 8) * 0.01 * Math.min(1, Math.abs(joy.y) + Math.abs(joy.x)), player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
  for (const [id, r] of Object.entries(bots)) {
    r.userData.head.rotation.y = Math.sin(t * (id === "finbot" ? 1.3 : 0.6)) * 0.35;
    r.position.y = Math.sin(t * 2 + r.position.x) * 0.03;
    if (id === "finbot") { const d = Math.hypot(player.x - r.position.x, player.z - r.position.z); if (d < 5) r.userData.head.rotation.y = Math.atan2(player.x - r.position.x, player.z - r.position.z); }
  }
  lava.forEach((l, i) => (l.material.emissiveIntensity = 0.5 + Math.sin(t * 1.5 + i) * 0.3));
  if (pingT > 0) { pingT -= dt; ball.position.set(Math.sin(t * 5) * 1.2, 0.86 + Math.abs(Math.sin(t * 10)) * 0.35, 3.5 + Math.sin(t * 3) * 0.4); }
  near = spots.find((s) => Math.hypot(player.x - s.x, player.z - s.z) < s.r) || null;
  const pr = $("#prompt");
  pr.style.display = near && $("#panel").hidden ? "block" : "none";
  if (near) pr.querySelector("span").textContent = near.label + (touch ? "" : " (E)");
  renderer.render(scene, camera);
});
