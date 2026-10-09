// Sonneblom AI Works office v2: a compact modern office, every AI employee in its own personalised cubicle,
// ChiefBot in a glass corner office. Tap a bot to talk to it; it only shows Available / Busy.
import * as THREE from "three";
import { setup, W, D, H, TEX, mat, std, glow, rbox, cyl, chair, monitor, plant, labelTex } from "./scene.js?v=6";

const $ = (s) => document.querySelector(s);
const { renderer, scene, camera, composer } = setup($("#c"));
const LOW = matchMedia("(pointer: coarse)").matches;
const EYE = 1.62;
const player = { x: -0.6, z: 4.6, yaw: 0.25, pitch: -0.08 };
const solids = []; // [minX, minZ, maxX, maxZ]
const block = (x0, z0, x1, z1) => solids.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
const clickables = []; // meshes/groups with userData.act
const anim = [];

// ---------- light ----------
scene.add(new THREE.HemisphereLight("#f4f7ff", "#5a5f6b", 0.55));
const sun = new THREE.DirectionalLight("#fff3df", 2.4);
sun.position.set(3, 7, -12); sun.target.position.set(-1, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 9, bottom: -9, near: 1, far: 30 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
for (const [x, z] of [[-4, -2], [1.2, 1], [5.6, -4.2], [5.6, 3.6], [-4, 3.6]]) {
  const p = new THREE.PointLight("#fff1dc", 5, 9, 2); p.position.set(x, H - 0.25, z); scene.add(p);
}

// ---------- room shell ----------
const carpet = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: TEX.carpet(), roughness: 0.95 }));
carpet.rotation.x = -Math.PI / 2; carpet.receiveShadow = true; scene.add(carpet);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: TEX.ceiling(), roughness: 0.9 }));
ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);
for (let x = -6; x <= 6; x += 3) for (let z = -4.5; z <= 4.5; z += 3) {  // recessed LED panels (bloom picks them up)
  const l = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.55), glow("#fffaf0", 1.6)); l.rotation.x = Math.PI / 2; l.position.set(x, H - 0.005, z); scene.add(l);
}
const plaster = new THREE.MeshStandardMaterial({ map: TEX.plaster(), roughness: 0.92 });
const wall = (w, x, z, ry, m = plaster) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, H), m); p.position.set(x, H / 2, z); p.rotation.y = ry; p.receiveShadow = true; scene.add(p); return p; };
wall(D, -W, D / 2, Math.PI / 2);                                         // left (front half; back half is glass)
wall(D * 2, W, 0, -Math.PI / 2, std("#2f6f73", { roughness: 0.9 }));      // right accent wall (teal)
wall(W - 1.4, -(W + 1.4) / 2, D, Math.PI); wall(W, W / 2, D, Math.PI);       // front, door gap at x -1.4..0
{ const l = new THREE.Mesh(new THREE.PlaneGeometry(1.4, H - 2.4), plaster); l.position.set(-0.7, (H + 2.4) / 2, D); l.rotation.y = Math.PI; scene.add(l); }
// back wall = floor-to-ceiling windows with mullions and a city view
const sky = new THREE.Mesh(new THREE.PlaneGeometry(60, 24), new THREE.MeshBasicMaterial({ map: TEX.sky(0) })); sky.position.set(0, 1.6, -D - 14); scene.add(sky);
const glass = new THREE.MeshStandardMaterial({ color: "#e8f3ff", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false });
const win = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H - 0.5), glass); win.position.set(0, (H - 0.5) / 2 + 0.4, -D); scene.add(win);
const sky2 = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), new THREE.MeshBasicMaterial({ map: TEX.sky(1) })); sky2.position.set(-W - 14, 1.6, -4); sky2.rotation.y = Math.PI / 2; scene.add(sky2);
const win2 = new THREE.Mesh(new THREE.PlaneGeometry(D, H - 0.5), glass); win2.position.set(-W, (H - 0.5) / 2 + 0.4, -D / 2); win2.rotation.y = Math.PI / 2; scene.add(win2);
const frameM = std("#2a2d33", { metalness: 0.7, roughness: 0.35 });
rbox(scene, W * 2, 0.4, 0.18, frameM, 0, 0.2, -D, 0.02, false);
for (let x = -W; x <= W + 0.01; x += 2) rbox(scene, 0.07, H, 0.1, frameM, x, H / 2, -D, 0.01, false);
rbox(scene, 0.18, 0.4, D, frameM, -W, 0.2, -D / 2, 0.02, false);
for (let z = -D + 2; z <= 0.01; z += 2) rbox(scene, 0.1, H, 0.07, frameM, -W, H / 2, z, 0.01, false);
block(-W - 1, -D - 1, W + 1, -D + 0.12); block(-W - 1, -D - 1, -W + 0.12, D + 1); block(W - 0.12, -D - 1, W + 1, D + 1);
block(-W - 1, D - 0.12, -1.4, D + 1); block(0, D - 0.12, W + 1, D + 1);
// skirting
rbox(scene, 0.03, 0.1, D, std("#d8d4cc"), -W + 0.02, 0.05, D / 2, 0.005, false);

// ---------- brand wall (left) ----------
{
  const t = labelTex("SONNEBLOM AI WORKS", { w: 1024, h: 140, fg: "#ffd23f", font: "800 92px Inter, Segoe UI, sans-serif", glowC: "#ff9a1f" });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.63), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
  s.position.set(-W + 0.03, 2.45, 2.4); s.rotation.y = Math.PI / 2; scene.add(s);
}

// ---------- door (exit) ----------
{
  const g = new THREE.Group(); g.position.set(-0.7, 0, D); scene.add(g);
  rbox(g, 1.5, 2.3, 0.12, std("#1f2228", { metalness: 0.6, roughness: 0.3 }), 0, 1.15, 0.02, 0.02);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.05), glass); pane.position.set(0, 1.12, -0.05); pane.rotation.y = Math.PI; g.add(pane);
  rbox(g, 0.05, 0.6, 0.05, std("#c9ced6", { metalness: 1, roughness: 0.2 }), 0.5, 1.05, -0.1, 0.02);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.22), new THREE.MeshBasicMaterial({ map: labelTex("EXIT", { w: 256, h: 92, bg: "#0e7a3c", font: "800 64px Inter, sans-serif" }), toneMapped: false }));
  ex.position.set(0, 2.55, -0.08); ex.rotation.y = Math.PI; g.add(ex);
  g.userData.act = { label: "Exit to the City", fn: () => exitOffice() };
  clickables.push(g);
}

// ---------- the bots ----------
const BOTS = {
  chiefbot: { name: "ChiefBot", role: "Team lead · chief of staff", accent: "#f2b705", pitch: "I run the team. Every morning I read what the other four did and send you one short brief, and nothing leaves the building without your yes." },
  finbot: { name: "FinBot", role: "Finance", accent: "#16a6b6", pitch: "Send me bank statements, invoices and bills. I turn them into balanced, allocated spreadsheets, chase your debtors politely and keep you ahead of SARS." },
  peoplebot: { name: "PeopleBot", role: "HR, payroll, admin, reception", accent: "#3fbf7f", pitch: "Payroll, payslips, contracts, leave and the front desk. I know the labour laws and answer your customers in English or Afrikaans." },
  growthbot: { name: "GrowthBot", role: "Marketing + sales", accent: "#e8459a", pitch: "I plan your social media, write the posts, send quotes and follow them up, and check whether AI search tools recommend you." },
  opsbot: { name: "OpsBot", role: "Operations", accent: "#f07b1d", pitch: "Stock, suppliers, job schedules, certificates and paperwork. I spot problems before they cost you money." },
};
let STATUS = {};
fetch("status.json?" + Date.now()).then((r) => r.json()).then((s) => { STATUS = s.bots || {}; refreshStatus(); }).catch(() => {});

function faceTex() {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 160;
  const g = cv.getContext("2d");
  g.fillStyle = "#07121a"; g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#6ff7ff"; g.shadowColor = "#6ff7ff"; g.shadowBlur = 20;
  g.beginPath(); g.ellipse(84, 70, 20, 26, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(172, 70, 20, 26, 0, 0, 7); g.fill();
  g.lineWidth = 9; g.strokeStyle = "#6ff7ff"; g.lineCap = "round"; g.beginPath(); g.arc(128, 98, 30, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FACE = faceTex();

function makeBot(id, x, z) {
  const b = BOTS[id];
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const shell = std("#f4f5f7", { roughness: 0.28, metalness: 0.1 }), acc = std(b.accent, { roughness: 0.35, metalness: 0.2 }), dark = std("#2a2e35", { roughness: 0.5 });
  chair(g, 0, 0.12, 0, "#30343c");
  // sitting body: hips on the seat, thighs forward, shins down
  rbox(g, 0.36, 0.14, 0.4, dark, 0, 0.56, -0.05, 0.06);
  for (const s of [-0.1, 0.1]) { rbox(g, 0.13, 0.12, 0.42, shell, s, 0.58, -0.22, 0.05); rbox(g, 0.12, 0.45, 0.13, shell, s, 0.3, -0.4, 0.05); rbox(g, 0.14, 0.06, 0.2, dark, s, 0.04, -0.45, 0.03); }
  const torso = rbox(g, 0.44, 0.52, 0.3, shell, 0, 0.93, 0.02, 0.12);
  rbox(g, 0.3, 0.26, 0.04, acc, 0, 0.98, -0.13, 0.04);                 // chest plate in the bot's colour
  const head = new THREE.Group(); head.position.set(0, 1.42, 0); g.add(head);
  rbox(head, 0.44, 0.36, 0.36, shell, 0, 0, 0, 0.14);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshStandardMaterial({ map: FACE, emissiveMap: FACE, emissive: "#ffffff", emissiveIntensity: 1.4 }));
  face.position.set(0, 0, -0.182); face.rotation.y = Math.PI; head.add(face);
  for (const s of [-1, 1]) cyl(head, 0.07, 0.07, 0.05, acc, s * 0.235, 0, 0).rotation.z = Math.PI / 2;
  rbox(g, 0.1, 0.08, 0.1, dark, 0, 1.21, 0, 0.03);                      // neck
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group(); a.position.set(s * 0.28, 1.1, -0.02); g.add(a);
    rbox(a, 0.11, 0.11, 0.36, shell, 0, -0.12, -0.14, 0.05).rotation.x = 0.7;
    rbox(a, 0.1, 0.1, 0.3, acc, 0, -0.24, -0.4, 0.045);
    return a;
  });
  // signature accessory (matches the avatar)
  if (id === "finbot") { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 32, 1, false, Math.PI * 0.5, Math.PI), std("#2fbf71", { transparent: true, opacity: 0.75, roughness: 0.2 })); v.position.set(0, 0.17, -0.06); head.add(v); rbox(head, 0.46, 0.04, 0.38, std("#2fbf71"), 0, 0.17, 0, 0.02); }
  if (id === "peoplebot") { const hb = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 32, Math.PI), dark); hb.position.y = 0.02; head.add(hb); const mic = rbox(head, 0.02, 0.02, 0.16, dark, 0.2, -0.12, -0.12, 0.008); mic.rotation.y = 0.5; }
  if (id === "growthbot") { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), acc); cap.position.y = 0.14; head.add(cap); rbox(head, 0.26, 0.02, 0.2, acc, 0, 0.15, 0.24, 0.01); }
  if (id === "opsbot") { const hat = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std("#ffcc00", { roughness: 0.3 })); hat.position.y = 0.15; head.add(hat); cyl(head, 0.3, 0.3, 0.02, std("#ffcc00", { roughness: 0.3 }), 0, 0.15, 0, 32); rbox(g, 0.46, 0.3, 0.02, std("#d6ff3a", { roughness: 0.5 }), 0, 0.95, -0.165, 0.01); }
  if (id === "chiefbot") { rbox(g, 0.07, 0.28, 0.02, std("#1f3a8a"), 0, 0.94, -0.17, 0.01); rbox(g, 0.46, 0.53, 0.31, std("#1d2a4a", { roughness: 0.6 }), 0, 0.93, 0.025, 0.12).scale.set(1.02, 1, 0.96); }
  // status light floating above the head
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), glow("#35e07a", 3)); lamp.position.set(0, 1.78, 0); g.add(lamp);
  const pill = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex("Available", { w: 320, h: 96, bg: "#123d26ee", fg: "#7dffaf", font: "700 52px Inter, sans-serif" }), depthTest: true }));
  pill.scale.set(0.44, 0.13, 1); pill.position.set(0, 1.95, 0); g.add(pill);
  g.userData = { act: { label: `Talk to ${b.name}`, fn: () => openBot(id) }, id, head, arms, lamp, pill, busy: false };
  clickables.push(g);
  bots[id] = g;
  return g;
}
const bots = {};
function refreshStatus() {
  for (const [id, g] of Object.entries(bots)) {
    const busy = STATUS[id] === "busy";
    g.userData.busy = busy;
    g.userData.lamp.material = glow(busy ? "#ff4d4d" : "#35e07a", 3);
    g.userData.pill.material.map = labelTex(busy ? "Busy" : "Available", { w: 320, h: 96, bg: busy ? "#4a1414ee" : "#123d26ee", fg: busy ? "#ff9b9b" : "#7dffaf", font: "700 52px Inter, sans-serif" });
    g.userData.pill.material.needsUpdate = true;
  }
}

// ---------- cubicle row (4 cubicles side by side along the window wall, owner 2026-10-09) ----------
const CW = 2.5; // cubicle width (x); depth 2.4 m from the window
const ROW = { x0: -7.4, z0: -D + 0.12, z1: -D + 2.52 };
const ROWX = [0, 1, 2, 3, 4].map((i) => ROW.x0 + i * CW);
const PH = 1.35; // partition height
const rail = std("#b9bec6", { metalness: 0.9, roughness: 0.25 });
const frosted = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, transparent: true, opacity: 0.5, depthWrite: false });
function partition(x0, z0, x1, z1, fabricHex) {
  const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ry = Math.atan2(z1 - z0, x1 - x0);
  const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = -ry; scene.add(g);
  const fab = mat("fab" + fabricHex, () => new THREE.MeshStandardMaterial({ map: TEX.fabric(fabricHex), roughness: 1 }));
  rbox(g, len, PH - 0.3, 0.06, fab, 0, (PH - 0.3) / 2 + 0.04, 0, 0.02);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.025), frosted); fr.position.y = PH - 0.15 + 0.04; g.add(fr);
  rbox(g, len + 0.02, 0.03, 0.08, rail, 0, PH + 0.05, 0, 0.012);
  rbox(g, len, 0.04, 0.07, rail, 0, 0.02, 0, 0.01);
  block(x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05);
  return g;
}
const FAB = { finbot: "#3d6f8a", peoplebot: "#4f7f62", growthbot: "#8a4f75", opsbot: "#8a6a3d" };
// side walls between cubicles (no back wall: the window is the back), short front walls with a 1.1 m opening
for (const x of ROWX) partition(x, ROW.z0, x, ROW.z1, "#5b6270");
for (let i = 0; i < 4; i++) { const a = ROWX[i], b = ROWX[i + 1]; partition(a, ROW.z1, a + 0.7, ROW.z1, "#5b6270"); partition(b - 0.7, ROW.z1, b, ROW.z1, "#5b6270"); }

function deskAndProps(id, cx, cz, side, open) {
  // desk against the outer side wall; the bot sits facing that wall, side-on to the opening
  const dx = cx + side * 0.92, wood = mat("wood", () => new THREE.MeshStandardMaterial({ map: TEX.wood(), roughness: 0.45 }));
  const top = rbox(scene, 0.72, 0.04, 2.0, wood, dx, 0.74, cz, 0.012);
  const leg = std("#2b2e34", { metalness: 0.6, roughness: 0.35 });
  for (const s of [-0.9, 0.9]) rbox(scene, 0.6, 0.72, 0.04, leg, dx, 0.36, cz + s, 0.01);
  rbox(scene, 0.04, 0.44, 1.6, leg, dx + side * 0.32, 0.5, cz, 0.01); // modesty panel
  block(dx - 0.38, cz - 1.02, dx + 0.38, cz + 1.02);
  const ry = side > 0 ? -Math.PI / 2 : Math.PI / 2; // monitors face the bot
  monitor(scene, dx + side * 0.12, 0.76, cz - 0.33, ry, "#cfe8ff");
  monitor(scene, dx + side * 0.12, 0.76, cz + 0.33, ry, "#d8f5e6");
  rbox(scene, 0.16, 0.02, 0.45, std("#e6e8eb", { roughness: 0.4 }), dx - side * 0.12, 0.77, cz, 0.008);  // keyboard
  const mug = cyl(scene, 0.04, 0.035, 0.1, std(BOTS[id].accent, { roughness: 0.3 }), dx - side * 0.16, 0.81, cz + 0.62);
  // name plate on the front stub + framed avatar on the side wall
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.11), new THREE.MeshBasicMaterial({ map: labelTex(BOTS[id].name, { w: 384, h: 96, bg: "#16181d", fg: "#ffffff", font: "700 54px Inter, sans-serif" }) }));
  plate.position.set(cx - side * 0.85, 1.15, cz + open * 1.245); if (open < 0) plate.rotation.y = Math.PI; scene.add(plate);
  new THREE.TextureLoader().load(`avatars/${id}.jpg`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    const f = new THREE.Group(); f.position.set(cx + side * 1.255, 1.08, cz - 0.85); f.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(f);
    rbox(f, 0.36, 0.36, 0.02, std("#1d1f24"), 0, 0, 0, 0.006);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.31), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); p.position.z = 0.012; f.add(p);
  });
  // personal touches
  if (id === "finbot") {
    rbox(scene, 0.22, 0.03, 0.28, std("#2d3138"), dx - side * 0.05, 0.775, cz + 0.85, 0.01);                // calculator
    for (let i = 0; i < 4; i++) rbox(scene, 0.3, 0.012, 0.22, std("#fbfbf8"), dx + side * 0.05, 0.77 + i * 0.012, cz - 0.82, 0.002); // paper stack
    for (let i = 0; i < 3; i++) rbox(scene, 0.06, 0.3, 0.24, std(["#1f6f8b", "#e2b13c", "#3a3f47"][i]), dx + side * 0.25, 0.92, cz + 0.45 + i * 0.07, 0.01); // binders
  } else if (id === "peoplebot") {
    plant(scene, dx + side * 0.15, cz - 0.85, 0.55); plant(scene, cx - side * 0.9, cz - open * 0.9, 1.05); block(cx - side * 0.9 - 0.22, cz - open * 0.9 - 0.22, cx - side * 0.9 + 0.22, cz - open * 0.9 + 0.22);
    for (let i = 0; i < 2; i++) { const f = rbox(scene, 0.14, 0.18, 0.02, std("#d9c7a8"), dx + side * 0.2, 0.86, cz + 0.6 + i * 0.18, 0.005); f.rotation.y = side * 0.4; }
  } else if (id === "growthbot") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 12, 48), glow("#fff2fb", 2.4)); ring.position.set(dx + side * 0.1, 1.25, cz + 0.85); ring.rotation.y = Math.PI / 2; scene.add(ring);
    cyl(scene, 0.01, 0.01, 0.48, std("#222"), dx + side * 0.1, 1.0, cz + 0.85);
    const neon = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 40, Math.PI * 1.6), glow("#ff3fbf", 3)); neon.position.set(cx + side * 1.255, 1.1, cz + 0.45); neon.rotation.y = Math.PI / 2; scene.add(neon);
  } else if (id === "opsbot") {
    const box = std("#b88a57", { roughness: 0.9 });
    rbox(scene, 0.5, 0.36, 0.4, box, cx - side * 0.75, 0.18, cz - open * 0.75, 0.01); rbox(scene, 0.4, 0.28, 0.34, box, cx - side * 0.75, 0.5, cz - open * 0.75, 0.01);
    block(cx - side * 0.75 - 0.27, cz - open * 0.75 - 0.22, cx - side * 0.75 + 0.27, cz - open * 0.75 + 0.22);
    rbox(scene, 0.22, 0.02, 0.3, std("#8b5a2b"), dx - side * 0.04, 0.77, cz + 0.8, 0.005);   // clipboard
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std("#ffcc00", { roughness: 0.35 })); hat.position.set(dx + side * 0.2, 0.76, cz - 0.82); scene.add(hat);
  }
  return { dx };
}

const CUBES = ["finbot", "peoplebot", "growthbot", "opsbot"].map((id, i) => ( // side = desk wall (-1 west / +1 east), open = +1 (front aisle)
  { id, cx: ROWX[i] + CW / 2, cz: (ROW.z0 + ROW.z1) / 2, side: i % 2 ? 1 : -1, open: 1 }));
for (const c of CUBES) {
  const { dx } = deskAndProps(c.id, c.cx, c.cz, c.side, c.open);
  const bx = dx - c.side * 0.72;
  makeBot(c.id, bx, c.cz).rotation.y = c.side > 0 ? -Math.PI / 2 : Math.PI / 2;
  block(bx - 0.3, c.cz - 0.32, bx + 0.3, c.cz + 0.32);
}

// ---------- ChiefBot's glass office (back right) ----------
const OFF = { x0: 3.0, z1: -2.2 };
{
  const glassWall = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const p = new THREE.Mesh(new THREE.BoxGeometry(len, H - 0.02, 0.02), glass);
    p.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2); p.rotation.y = -Math.atan2(z1 - z0, x1 - x0); scene.add(p);
    rbox(scene, x0 === x1 ? 0.05 : len, 0.05, x0 === x1 ? len : 0.05, frameM, (x0 + x1) / 2, 0.025, (z0 + z1) / 2, 0.01);
    block(x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05);
  };
  glassWall(OFF.x0, -D, OFF.x0, OFF.z1);
  glassWall(OFF.x0, OFF.z1, 4.0, OFF.z1); glassWall(5.1, OFF.z1, W, OFF.z1); // door gap 4.0..5.1
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.16), new THREE.MeshBasicMaterial({ map: labelTex("CHIEF'S OFFICE", { w: 512, h: 76, fg: "#2a2d33", font: "700 46px Inter, sans-serif" }), transparent: true }));
  logo.position.set(6.4, 2.1, OFF.z1 + 0.02); scene.add(logo);
  const walnut = mat("walnut", () => { const t = TEX.wood(); return new THREE.MeshStandardMaterial({ map: t, color: "#7a5236", roughness: 0.38 }); });
  rbox(scene, 2.1, 0.06, 0.95, walnut, 6.0, 0.75, -4.2, 0.02);
  rbox(scene, 2.0, 0.7, 0.06, walnut, 6.0, 0.37, -3.78, 0.01);
  block(4.95, -4.7, 7.05, -3.7);
  monitor(scene, 6.3, 0.78, -4.4, Math.PI, "#e6f0ff"); monitor(scene, 5.65, 0.78, -4.4, Math.PI - 0.25, "#fff4dc");
  cyl(scene, 0.045, 0.04, 0.11, std("#f2b705"), 6.85, 0.83, -4.05);
  makeBot("chiefbot", 6.0, -4.95).rotation.y = Math.PI;
  block(5.7, -5.3, 6.3, -4.7);
  chair(scene, 5.6, -3.2, Math.PI * 0.95, "#5a4632"); chair(scene, 6.5, -3.2, Math.PI * 1.05, "#5a4632");
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), std("#c9b79c", { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(6.0, 0.004, -4.0); rug.receiveShadow = true; scene.add(rug);
  plant(scene, 7.5, -5.5, 1.2); block(7.2, -5.8, 7.8, -5.2);
  rbox(scene, 0.04, 1.1, 1.8, std("#fbfbfb", { roughness: 0.2 }), W - 0.05, 1.55, -4.0, 0.01, false); // whiteboard (clean)
}

// ---------- lounge + coffee bar (front right) ----------
{
  const sofa = std("#3d4d6a", { roughness: 0.95 });
  rbox(scene, 0.9, 0.45, 2.6, sofa, W - 0.6, 0.23, 3.2, 0.12); rbox(scene, 0.25, 0.85, 2.6, sofa, W - 0.18, 0.43, 3.2, 0.1);
  for (const z of [1.95, 4.45]) rbox(scene, 0.9, 0.62, 0.22, sofa, W - 0.6, 0.31, z, 0.1);
  block(W - 1.1, 1.8, W, 4.6);
  for (const z of [2.6, 3.8]) rbox(scene, 0.5, 0.14, 0.5, std("#f2efe9", { roughness: 0.9 }), W - 0.62, 0.53, z, 0.07);
  const table = mat("oak", () => new THREE.MeshStandardMaterial({ map: TEX.wood(), roughness: 0.35 }));
  rbox(scene, 0.75, 0.04, 1.3, table, 6.2, 0.42, 3.2, 0.03); cyl(scene, 0.04, 0.04, 0.4, frameM, 6.2, 0.2, 3.2); block(5.8, 2.5, 6.6, 3.9);
  cyl(scene, 0.12, 0.1, 0.08, std("#e9e4dc"), 6.2, 0.48, 2.9);
  // coffee bar along the front wall
  const counter = std("#f3f1ec", { roughness: 0.25 });
  rbox(scene, 2.6, 0.9, 0.6, std("#2e3238", { roughness: 0.5 }), 4.6, 0.45, D - 0.32, 0.02); rbox(scene, 2.7, 0.05, 0.66, counter, 4.6, 0.92, D - 0.32, 0.015);
  block(3.25, D - 0.65, 5.95, D);
  const cm = new THREE.Group(); cm.position.set(4.2, 0.95, D - 0.36); scene.add(cm);
  rbox(cm, 0.34, 0.42, 0.34, std("#1c1d20", { metalness: 0.7, roughness: 0.3 }), 0, 0.21, 0, 0.04);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), glow("#7dd3fc", 2)); led.position.set(0, 0.34, -0.172); led.rotation.y = Math.PI; cm.add(led);
  cm.userData.act = { label: "Make a coffee", fn: () => toast("☕ Flat white, coming up.") }; clickables.push(cm);
  rbox(scene, 0.7, 1.9, 0.65, std("#d9dde2", { metalness: 0.6, roughness: 0.25 }), 6.4, 0.95, D - 0.36, 0.03); block(6.0, D - 0.7, 6.8, D);  // fridge
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), glow("#ffd9a0", 1.6)); s.position.set(3.9 + i * 0.7, 2.2, D - 0.6); scene.add(s); cyl(scene, 0.004, 0.004, 0.8, frameM, 3.9 + i * 0.7, 2.7, D - 0.6, 6); }
  // one arcade cabinet in the corner
  const ac = new THREE.Group(); ac.position.set(2.2, 0, D - 0.5); ac.rotation.y = Math.PI; scene.add(ac);
  rbox(ac, 0.72, 1.75, 0.7, std("#1b1430", { roughness: 0.4 }), 0, 0.88, 0, 0.03);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42), glow("#5b3cff", 1.2)); scr.position.set(0, 1.32, 0.36); scr.rotation.x = -0.2; ac.add(scr);
  const mq = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.16), new THREE.MeshBasicMaterial({ map: labelTex("ARCADE", { w: 384, h: 92, bg: "#ff3fbf", font: "800 60px Inter, sans-serif" }), toneMapped: false })); mq.position.set(0, 1.68, 0.36); ac.add(mq);
  rbox(ac, 0.66, 0.08, 0.3, std("#2a2140"), 0, 0.98, 0.42, 0.02);
  ac.userData.act = { label: "Play arcade", fn: () => openArcade() }; clickables.push(ac);
  block(1.8, D - 0.9, 2.6, D);
  plant(scene, 1.0, D - 0.45, 1.3); block(0.75, D - 0.7, 1.25, D);
}
// greenery + reception touch near the door
plant(scene, -2.0, D - 0.45, 1.35); block(-2.25, D - 0.7, -1.75, D);
plant(scene, -7.5, 5.4, 1.4); block(-7.8, 5.1, -7.2, 5.7);
plant(scene, 2.6, -1.9, 1.2); block(2.35, -2.15, 2.85, -1.65);
{ // a long standing table in the open area
  const t = rbox(scene, 2.2, 0.05, 0.7, std("#f3f1ec", { roughness: 0.3 }), -4.2, 1.02, 3.6, 0.02);
  for (const x of [-5.1, -3.3]) rbox(scene, 0.06, 1.0, 0.5, frameM, x, 0.5, 3.6, 0.01);
  block(-5.35, 3.2, -3.05, 4.0);
  for (const x of [-5.0, -4.2, -3.4]) { cyl(scene, 0.17, 0.17, 0.05, std("#e8459a"), x, 0.78, 4.2); cyl(scene, 0.02, 0.02, 0.76, frameM, x, 0.39, 4.2, 8); }
}

// ---------- input ----------
const keys = {};
addEventListener("keydown", (e) => { const k = e.key.toLowerCase(); keys[k] = true; if (k === "e" && near && $("#panel").hidden) near.fn(); if (e.key === "Escape") closePanel(); });
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
const touch = matchMedia("(pointer: coarse)").matches;
if (touch) document.body.classList.add("touch");
let joy = { id: null, x: 0, y: 0 }, look = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0 };
const canvas = $("#c");
canvas.addEventListener("pointerdown", (e) => {
  if (!$("#panel").hidden) return;
  if (touch && e.clientX < innerWidth * 0.4 && e.clientY > innerHeight * 0.55 && joy.id === null) {
    const r = $("#joy").getBoundingClientRect(); joy = { id: e.pointerId, x: 0, y: 0, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  } else if (look.id === null) look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const m = Math.hypot(dx, dy), max = 45;
    if (m > max) { dx *= max / m; dy *= max / m; }
    joy.x = dx / max; joy.y = dy / max; $("#knob").style.transform = `translate(${dx}px,${dy}px)`;
  } else if (e.pointerId === look.id) {
    player.yaw -= (e.clientX - look.x) * 0.005;
    player.pitch = Math.max(-1.1, Math.min(1.0, player.pitch - (e.clientY - look.y) * 0.004));
    look.x = e.clientX; look.y = e.clientY;
  } else if (!touch) hover(e);
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(clickables, true)[0];
  if (!hit || hit.distance > 9) return null;
  let o = hit.object; while (o && !o.userData.act) o = o.parent;
  return o ? o.userData.act : null;
}
function hover(e) { canvas.style.cursor = pick(e.clientX, e.clientY) ? "pointer" : "grab"; }
const up = (e) => {
  if (e.pointerId === joy.id) { joy = { id: null, x: 0, y: 0 }; $("#knob").style.transform = ""; }
  if (e.pointerId === look.id) {
    const tap = Math.hypot(e.clientX - look.sx, e.clientY - look.sy) < 8 && performance.now() - look.t < 450;
    look.id = null;
    if (tap) { const a = pick(e.clientX, e.clientY); if (a) a.fn(); }
  }
};
canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
$("#joy").addEventListener("pointerdown", (e) => {
  const r = $("#joy").getBoundingClientRect(); joy = { id: e.pointerId, x: 0, y: 0, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  canvas.setPointerCapture(e.pointerId);
});
function blocked(x, z) { const R = 0.28; return solids.some(([a, b, c, d]) => x > a - R && x < c + R && z > b - R && z < d + R); }
function move(dt) {
  let f = 0, s = 0;
  if (keys.w || keys.arrowup) f += 1; if (keys.s || keys.arrowdown) f -= 1;
  if (keys.a) s -= 1; if (keys.d) s += 1;
  if (keys.arrowleft) player.yaw += dt * 2; if (keys.arrowright) player.yaw -= dt * 2;
  f -= joy.y; s += joy.x;
  const sp = 2.4 * dt, sn = Math.sin(player.yaw), cs = Math.cos(player.yaw);
  const dx = (-sn * f + cs * s) * sp, dz = (-cs * f - sn * s) * sp;
  if (!blocked(player.x + dx, player.z)) player.x += dx;
  if (!blocked(player.x, player.z + dz)) player.z += dz;
  if (player.z > D - 0.35 && player.x > -1.4 && player.x < 0) exitOffice(); // walked out the door
}

// ---------- UI ----------
let near = null;
$("#act").onclick = () => near && near.fn();
$("#close").onclick = closePanel;
$("#exitBtn").onclick = () => exitOffice();
function openPanel(html) { $("#pbody").innerHTML = html; $("#panel").hidden = false; stopGames(); }
function closePanel() { $("#panel").hidden = true; stopGames(); }
let toastT;
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2400); }
let leaving = false;
function exitOffice() {
  if (leaving) return; leaving = true;
  document.body.classList.add("leaving");
  const ref = document.referrer && new URL(document.referrer).origin === location.origin ? document.referrer : "";
  setTimeout(() => { if (ref && history.length > 1) history.back(); else location.href = "/hq/city/"; }, 350);
}
$("#enter").onclick = () => { $("#intro").remove(); toast(touch ? "Tap a bot to talk to it" : "Click a bot to talk to it · WASD to walk"); };

function openBot(id) {
  const b = BOTS[id], busy = STATUS[id] === "busy";
  openPanel(`<div class="who"><img src="avatars/${id}.jpg" alt=""><div><div class="kick">${b.role}</div><h2>${b.name}</h2>
    <span class="st ${busy ? "busy" : "free"}">${busy ? "● Busy" : "● Available"}</span></div></div>
    <p>${b.pitch}</p>
    <div class="btns"><a class="big" href="mailto:hello@eaafix.com?subject=${b.name}%20for%20my%20business">Hire ${b.name}</a>
    ${id === "finbot" ? `<button class="big ghost" id="demoBtn">▶ See a demo</button>` : ""}</div><div id="res"></div>`);
  if (id === "finbot") $("#demoBtn").onclick = runDemo;
}
let demo = null;
fetch("demo.json?v=1").then((r) => r.json()).then((d) => (demo = d)).catch(() => {});
const R = (n) => "R" + Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function runDemo() {
  const el = $("#res");
  if (!demo) { el.innerHTML = "<p>Demo didn't load. Try again.</p>"; return; }
  el.innerHTML = `<p class="dim">A real run on a test FNB statement (fictional company).</p>
    <div class="stats"><div><b>${demo.lines}</b>lines read</div><div><b>R0.00</b>difference</div><div><b>${demo.auto}</b>allocated</div><div><b>${demo.queries}</b>client questions</div></div>
    <table><tr><th>Date</th><th>Description</th><th class="n">Amount</th><th>Account</th></tr>
    ${demo.rows.slice(0, 6).map((r) => `<tr><td>${r.d}</td><td>${r.desc}</td><td class="n">${r.amt < 0 ? "-" : ""}${R(r.amt)}</td><td>${r.acc.startsWith("9999") ? "❓ ask client" : r.acc.replace(/^\d+ /, "")}</td></tr>`).join("")}</table>`;
}

// ---------- arcade ----------
function openArcade() {
  openPanel(`<div class="kick">Arcade</div><h2>Pick a game</h2><div class="btns"><button class="big" id="gSnake">🐍 Snake</button><button class="big" id="gPong">🏓 Pong vs FinBot</button></div>`);
  $("#gSnake").onclick = () => openSnake("SNAKE"); $("#gPong").onclick = () => openPong();
}
let gameLoop = null, gameKeys = null;
function stopGames() { clearInterval(gameLoop); gameLoop = null; if (gameKeys) removeEventListener("keydown", gameKeys); gameKeys = null; }
const best = (k) => +(localStorage.getItem("office-" + k) || 0);
function openSnake(title) {
  openPanel(`<div class="kick">Arcade</div><h2>${title}</h2><p class="dim">Best: <b id="best">${best(title)}</b> · Score: <b id="sc">0</b></p>
    <canvas class="game" id="g" width="300" height="300"></canvas>
    <div class="pad"><span></span><button data-d="0,-1">▲</button><span></span><button data-d="-1,0">◀</button><button data-d="0,1">▼</button><button data-d="1,0">▶</button></div>`);
  const g = $("#g").getContext("2d"), N = 15, S = 20;
  let sn = [[7, 7]], dir = [1, 0], next = [1, 0], food = [3, 3], score = 0;
  const setDir = (d) => { if (d[0] !== -dir[0] || d[1] !== -dir[1]) next = d; };
  document.querySelectorAll(".pad [data-d]").forEach((b) => (b.onpointerdown = () => setDir(b.dataset.d.split(",").map(Number))));
  gameKeys = (e) => { const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[e.key.toLowerCase()]; if (m) { setDir(m); e.preventDefault(); } };
  addEventListener("keydown", gameKeys);
  gameLoop = setInterval(() => {
    dir = next;
    const h = [(sn[0][0] + dir[0] + N) % N, (sn[0][1] + dir[1] + N) % N];
    if (sn.some((p) => p[0] === h[0] && p[1] === h[1])) {
      if (score > best(title)) localStorage.setItem("office-" + title, score);
      toast(`Game over: ${score}`); sn = [[7, 7]]; dir = next = [1, 0]; score = 0; $("#best").textContent = best(title);
    } else { sn.unshift(h); if (h[0] === food[0] && h[1] === food[1]) { score++; food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } else sn.pop(); }
    $("#sc").textContent = score;
    g.fillStyle = "#0b0b12"; g.fillRect(0, 0, 300, 300);
    g.fillStyle = "#ff3fbf"; g.fillRect(food[0] * S + 3, food[1] * S + 3, S - 6, S - 6);
    sn.forEach((p, i) => { g.fillStyle = i ? "#3dffa8" : "#ffd23f"; g.fillRect(p[0] * S + 1, p[1] * S + 1, S - 2, S - 2); });
  }, 120);
}
function openPong() {
  openPanel(`<div class="kick">Arcade</div><h2>Pong vs FinBot</h2><p class="dim">You <b id="ps">0</b> : <b id="cs">0</b> FinBot · drag or use ◀ ▶</p>
    <canvas class="game" id="g" width="300" height="360"></canvas><div class="pad"><button data-m="-1">◀</button><span></span><button data-m="1">▶</button></div>`);
  const cv = $("#g"), g = cv.getContext("2d");
  let px = 150, cx = 150, b = { x: 150, y: 180, vx: 2.4, vy: 3 }, ps = 0, cs = 0, hold = 0;
  document.querySelectorAll(".pad [data-m]").forEach((x) => { x.onpointerdown = () => (hold = +x.dataset.m); x.onpointerup = x.onpointerleave = () => (hold = 0); });
  cv.onpointermove = (e) => { const r = cv.getBoundingClientRect(); px = (e.clientX - r.left) * (300 / r.width); };
  gameKeys = (e) => { if (e.key === "ArrowLeft" || e.key === "a") px -= 20; if (e.key === "ArrowRight" || e.key === "d") px += 20; };
  addEventListener("keydown", gameKeys);
  gameLoop = setInterval(() => {
    px = Math.max(30, Math.min(270, px + hold * 6)); cx += Math.max(-2.6, Math.min(2.6, b.x - cx));
    b.x += b.vx; b.y += b.vy;
    if (b.x < 6 || b.x > 294) b.vx *= -1;
    if (b.y > 336 && Math.abs(b.x - px) < 34 && b.vy > 0) { b.vy = -Math.abs(b.vy) * 1.04; b.vx += (b.x - px) / 12; }
    if (b.y < 24 && Math.abs(b.x - cx) < 34 && b.vy < 0) b.vy = Math.abs(b.vy) * 1.02;
    if (b.y > 370) { cs++; b = { x: 150, y: 180, vx: 2.4, vy: -3 }; }
    if (b.y < -10) { ps++; b = { x: 150, y: 180, vx: -2.4, vy: 3 }; toast("Point to you!"); }
    $("#ps").textContent = ps; $("#cs").textContent = cs;
    g.fillStyle = "#0b0b12"; g.fillRect(0, 0, 300, 360);
    g.fillStyle = "#28e0ff"; g.fillRect(cx - 30, 12, 60, 8); g.fillStyle = "#ffd23f"; g.fillRect(px - 30, 340, 60, 8);
    g.fillStyle = "#ff3fbf"; g.beginPath(); g.arc(b.x, b.y, 6, 0, 7); g.fill();
  }, 16);
}

// ---------- loop ----------
window.officePlayer = player; // test hook
const clock = new THREE.Clock();
const camPos = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if ($("#panel").hidden && !leaving) move(dt);
  const walking = Math.min(1, Math.abs(joy.y) + Math.abs(joy.x) + (keys.w || keys.s || keys.a || keys.d || keys.arrowup || keys.arrowdown ? 1 : 0));
  camera.position.set(player.x, EYE + Math.sin(t * 7) * 0.012 * walking, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
  for (const g of Object.values(bots)) {
    const u = g.userData, sp = u.busy ? 16 : 5;
    u.desk ??= g.rotation.y;
    const dist = Math.hypot(player.x - g.position.x, player.z - g.position.z);
    const want = dist < 2.8 ? Math.atan2(-(player.x - g.position.x), -(player.z - g.position.z)) : u.desk; // swivel to greet you
    let d = want - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 4);
    u.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * sp + i * 1.7) * (u.busy ? 0.08 : 0.025)));
    u.head.rotation.y = Math.sin(t * 0.6 + g.position.x) * (u.busy ? 0.05 : 0.25);
    u.head.position.y = 1.42 + Math.sin(t * 1.6 + g.position.z) * 0.01;
    u.pill.position.y = 1.95 + Math.sin(t * 2 + g.position.x) * 0.015;
  }
  camPos.set(player.x, 0, player.z);
  near = null;
  for (const o of clickables) { const p = o.getWorldPosition(new THREE.Vector3()); if (Math.hypot(p.x - player.x, p.z - player.z) < 1.7) { near = o.userData.act; break; } }
  const pr = $("#prompt");
  pr.style.display = near && $("#panel").hidden ? "block" : "none";
  if (near) pr.querySelector("span").textContent = near.label + (touch ? "" : " (E)");
  composer.render();
});
