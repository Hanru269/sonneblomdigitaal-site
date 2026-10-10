// Sonneblom AI Works office v4 (owner 2026-10-10): a tight, realistic 9 x 7 m office. Four AI employees at a 2x2 desk pod,
// ChiefBot in a glass corner office, kitchenette, meeting table and a sofa nook. Tap a bot to talk to it (Available / Busy only).
import * as THREE from "three";
import { setup, W, D, H, LOW, TEX, mat, std, glow, metal, black, oak, white, rbox, cyl, plane, labelTex, chair, monitor, laptop,
  keyboardMouse, deskLamp, mug, papers, notebook, plant, bookshelf, framedArt, rnd } from "./scene.js?v=7";

const $ = (s) => document.querySelector(s);
const { renderer, scene, camera, composer } = setup($("#c"));
const EYE = 1.6;
const player = { x: 0.1, z: 2.75, yaw: 0.32, pitch: -0.12 };
const solids = [];
const block = (x0, z0, x1, z1) => solids.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
const clickables = [];

// ---------- light ----------
scene.add(new THREE.HemisphereLight("#f3f6fb", "#6b625a", 0.6));
const sun = new THREE.DirectionalLight("#fff1dc", 2.0);
sun.position.set(2.5, 6, -9); sun.target.position.set(-0.5, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: 1, far: 20 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
for (const [x, z, k] of [[-1.5, -1.3, 3.2], [3.1, -2.2, 2.4], [-3.2, 2.3, 2.2], [2.8, 2.4, 2.2], [0.2, 0.8, 2.4]]) {
  const p = new THREE.PointLight("#fff4e6", k, 7, 2); p.position.set(x, H - 0.3, z); scene.add(p);
}

// ---------- shell ----------
const floor = plane(scene, W * 2, D * 2, new THREE.MeshStandardMaterial({ map: TEX.oak(), roughness: 0.48 }), 0, 0, 0, 0, -Math.PI / 2);
const ceilT = TEX.ceiling();  // lit by the room bounce: a little self-light keeps it white, not grey
const ceiling = plane(scene, W * 2, D * 2, new THREE.MeshStandardMaterial({ map: ceilT, emissiveMap: ceilT, emissive: "#ffffff", emissiveIntensity: 0.55, roughness: 0.95 }), 0, H, 0, 0, Math.PI / 2);
const plaster = new THREE.MeshStandardMaterial({ map: TEX.plaster(), roughness: 0.92 });
const wall = (w, x, z, ry, m = plaster, h = H, y = H / 2) => plane(scene, w, h, m, x, y, z, ry);
wall(D * 2, -W, 0, Math.PI / 2);                      // left
wall(D * 2, W, 0, -Math.PI / 2);                      // right
wall(W - 0.4, -(W + 0.4) / 2, D, Math.PI);            // front, door gap x -0.4..0.6
wall(W - 0.6, (W + 0.6) / 2, D, Math.PI);
wall(1.0, 0.1, D, Math.PI, plaster, H - 2.15, (H + 2.15) / 2);
block(-W - 1, -D - 1, W + 1, -D + 0.1); block(-W - 1, -D - 1, -W + 0.1, D + 1); block(W - 0.1, -D - 1, W + 1, D + 1);
block(-W - 1, D - 0.1, -0.4, D + 1); block(0.6, D - 0.1, W + 1, D + 1);
const skirt = std("#e6e3dc", { roughness: 0.6 });
rbox(scene, 0.015, 0.08, D * 2, skirt, -W + 0.008, 0.04, 0, 0, false); rbox(scene, 0.015, 0.08, D * 2, skirt, W - 0.008, 0.04, 0, 0, false);
rbox(scene, W - 0.4, 0.08, 0.015, skirt, -(W + 0.4) / 2, 0.04, D - 0.008, 0, false); rbox(scene, W - 0.6, 0.08, 0.015, skirt, (W + 0.6) / 2, 0.04, D - 0.008, 0, false);

// ceiling: recessed LED panels, AC cassette, sprinklers, smoke detector
for (const [x, z] of [[-2.7, -2.1], [-0.3, -2.1], [-2.7, 0.3], [-0.3, 0.3], [-3.3, 2.4], [2.9, -2.1], [2.7, 2.4], [0.9, 1.6]]) {
  rbox(scene, 0.62, 0.02, 0.62, std("#e9e9e6"), x, H - 0.01, z, 0, false);
  plane(scene, 0.58, 0.58, glow("#fff8ee", 0.85), x, H - 0.022, z, 0, Math.PI / 2);
}
{ const ac = new THREE.Group(); ac.position.set(1.2, H - 0.04, -0.4); scene.add(ac);
  rbox(ac, 0.84, 0.05, 0.84, white(), 0, 0, 0, 0.01, false);
  for (let i = 0; i < 4; i++) { const v = rbox(ac, 0.6, 0.006, 0.05, std("#d4d6d8"), 0, -0.027, 0, 0, false); v.rotation.y = (i * Math.PI) / 2; v.position.set(Math.sin(i * Math.PI / 2) * 0.33, -0.027, Math.cos(i * Math.PI / 2) * 0.33); }
  plane(ac, 0.36, 0.36, std("#c9cbce", { roughness: 0.8 }), 0, -0.028, 0, 0, Math.PI / 2); }
for (const [x, z] of [[-1.5, -2.6], [-1.5, 0.9], [2.6, 1.2], [3.6, -1.6], [-3.6, 1.5]]) cyl(scene, 0.02, 0.012, 0.03, metal(), x, H - 0.015, z, 10);
cyl(scene, 0.06, 0.06, 0.03, white(), 0.4, H - 0.015, 2.6, 20);

// ---------- back wall: floor-to-ceiling glazing with mullions + roller blinds ----------
const sky = plane(scene, 34, 15, new THREE.MeshBasicMaterial({ map: TEX.sky(0) }), 0, 1.4, -D - 9); sky.receiveShadow = false;
const glass = new THREE.MeshStandardMaterial({ color: "#eaf4ff", roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false });
plane(scene, W * 2, H - 0.12, glass, 0, (H - 0.12) / 2 + 0.06, -D);
const frameM = std("#2b2d31", { metalness: 0.6, roughness: 0.35 });
rbox(scene, W * 2, 0.06, 0.14, frameM, 0, 0.03, -D, 0, false); rbox(scene, W * 2, 0.08, 0.14, frameM, 0, H - 0.04, -D, 0, false);
for (let x = -W; x <= W + 0.01; x += 1.5) rbox(scene, 0.06, H, 0.12, frameM, x, H / 2, -D, 0, false);
const blindM = mat("blind", () => new THREE.MeshStandardMaterial({ color: "#e8e3d8", roughness: 0.95, transparent: true, opacity: 0.93, side: THREE.DoubleSide }));
for (const [i, drop] of [[0, 0.75], [1, 0.42], [3, 0.6], [4, 0.33]]) {
  const x = -W + 0.75 + i * 1.5, len = (H - 0.15) * drop;
  plane(scene, 1.42, len, blindM, x, H - 0.1 - len / 2, -D + 0.07);
  rbox(scene, 1.44, 0.06, 0.06, std("#d9d4c9"), x, H - 0.08, -D + 0.07, 0.01, false);
  rbox(scene, 1.42, 0.02, 0.02, std("#9c968b"), x, H - 0.1 - len, -D + 0.07, 0, false);
}
rbox(scene, W * 2 - 0.1, 0.03, 0.22, white(), 0, 0.42, -D + 0.12, 0.004, false); // window sill / heating cover
rbox(scene, W * 2 - 0.1, 0.38, 0.04, std("#f0efeb"), 0, 0.21, -D + 0.22, 0.004, false);

// ---------- left wall: brand feature + credenza + bookshelf + art ----------
{
  const sl = mat("slats", () => new THREE.MeshStandardMaterial({ map: TEX.slats(), roughness: 0.6 }));
  plane(scene, 3.0, H - 0.02, sl, -W + 0.012, H / 2, 1.0, Math.PI / 2);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.22), new THREE.MeshStandardMaterial({ map: labelTex("SONNEBLOM AI WORKS", { w: 1024, h: 120, fg: "#efe6d2", font: "600 74px Inter, Segoe UI, sans-serif" }), transparent: true, roughness: 0.3, metalness: 0.6 }));
  logo.position.set(-W + 0.03, 1.85, 1.0); logo.rotation.y = Math.PI / 2; scene.add(logo);
  const cr = new THREE.Group(); cr.position.set(-W + 0.25, 0, 1.0); scene.add(cr);
  rbox(cr, 0.45, 0.62, 1.9, oak(), 0, 0.37, 0, 0.01);
  for (const z of [-0.47, 0.47]) rbox(cr, 0.01, 0.5, 0.9, std("#cfa77a", { roughness: 0.5 }), 0.225, 0.37, z, 0, false);
  for (const z of [-0.8, 0.8]) cyl(cr, 0.012, 0.012, 0.06, black(), 0.15, 0.03, z, 8);
  rbox(cr, 0.42, 0.24, 0.46, std("#ecedef", { roughness: 0.4 }), 0, 0.8, -0.55, 0.02);      // printer
  rbox(cr, 0.3, 0.02, 0.2, std("#3a3c40"), 0.05, 0.93, -0.55, 0.005);
  papers(cr, 0.02, 0.69, 0.25, 0, 4);
  plant(cr, 0, 0.6, 0.55, "snake"); cr.children.at(-1).position.y = 0.68;
  block(-W, 0.0, -W + 0.5, 2.0);
}
bookshelf(scene, -W + 0.17, -2.4, Math.PI / 2, 1.3, 2.0, 5); block(-W, -3.1, -W + 0.36, -1.7);
framedArt(scene, -W + 0.03, 1.6, -0.9, Math.PI / 2, 21);

// ---------- 2x2 desk pod: FinBot, PeopleBot (back row), GrowthBot, OpsBot (front row) ----------
const BOTS = {
  chiefbot: { name: "ChiefBot", role: "Team lead · chief of staff", accent: "#c9a14a", screen: "chief", pitch: "I run the team. Every morning I read what the other four did and send you one short brief, and nothing leaves the building without your yes." },
  finbot: { name: "FinBot", role: "Finance", accent: "#1f8a70", screen: "fin", pitch: "Send me bank statements, invoices and bills. I turn them into balanced, allocated spreadsheets, chase your debtors politely and keep you ahead of SARS." },
  peoplebot: { name: "PeopleBot", role: "HR, payroll, admin, reception", accent: "#2c5aa0", screen: "people", pitch: "Payroll, payslips, contracts, leave and the front desk. I know the labour laws and answer your customers in English or Afrikaans." },
  growthbot: { name: "GrowthBot", role: "Marketing + sales", accent: "#b03a7a", screen: "growth", pitch: "I plan your social media, write the posts, send quotes and follow them up, and check whether AI search tools recommend you." },
  opsbot: { name: "OpsBot", role: "Operations", accent: "#c46a1a", screen: "ops", pitch: "Stock, suppliers, job schedules, certificates and paperwork. I spot problems before they cost you money." },
};
const POD = { x: -1.5, z: -1.3 };
plane(scene, 3.6, 3.0, new THREE.MeshStandardMaterial({ map: TEX.rug(), roughness: 1 }), POD.x, 0.004, POD.z, 0, -Math.PI / 2);
{ // divider screen down the middle of the pod + cable spine
  const fab = mat("podfab", () => new THREE.MeshStandardMaterial({ map: TEX.fabric("#5f6670"), roughness: 1 }));
  rbox(scene, 2.84, 0.42, 0.04, fab, POD.x, 0.74 + 0.23, POD.z, 0.01);
  rbox(scene, 2.86, 0.02, 0.05, metal(), POD.x, 0.74 + 0.45, POD.z, 0.005, false);
  rbox(scene, 2.6, 0.08, 0.14, black(), POD.x, 0.6, POD.z, 0.01, false);
  for (const [x, y] of [[-2.85, 2.35], [-0.15, 2.35]]) { cyl(scene, 0.004, 0.004, H - y, black(), POD.x + x + 1.5, (H + y) / 2, POD.z, 6); }
  const pend = std("#1c1d21", { metalness: 0.5, roughness: 0.4 });     // two linear pendants over the pod
  for (const dz of [-0.4, 0.4]) {
    rbox(scene, 2.2, 0.05, 0.08, pend, POD.x, 2.32, POD.z + dz, 0.01, false);
    plane(scene, 2.15, 0.05, glow("#fff6e8", 1.6), POD.x, 2.294, POD.z + dz, 0, Math.PI / 2);
    for (const sx of [-0.9, 0.9]) cyl(scene, 0.002, 0.002, H - 2.34, black(), POD.x + sx, (H + 2.34) / 2, POD.z + dz, 4);
  }
}
const bots = {};
function station(id, x, z, f) { // f = +1: the bot faces +z (sits on the window side)
  const b = BOTS[id], ry = f > 0 ? Math.PI : 0;
  const top = rbox(scene, 1.4, 0.03, 0.74, white(), x, 0.74, z, 0.006);
  rbox(scene, 1.4, 0.012, 0.74, oak(), x, 0.722, z, 0, false);                      // oak edge under the white top
  for (const sx of [-0.66, 0.66]) { rbox(scene, 0.05, 0.71, 0.6, metal(), x + sx, 0.355, z, 0.006); rbox(scene, 0.06, 0.02, 0.66, metal(), x + sx, 0.01, z, 0.004); }
  rbox(scene, 0.42, 0.58, 0.5, white(), x + 0.42, 0.29, z + f * 0.05, 0.01);        // drawer pedestal
  for (let i = 0; i < 3; i++) rbox(scene, 0.12, 0.012, 0.012, metal(), x + 0.42, 0.48 - i * 0.18, z - f * 0.205, 0.004, false);
  block(x - 0.72, z - 0.38, x + 0.72, z + 0.38);
  // dual monitors on arms, keyboard + mouse, lamp, mug, notebook
  for (const [dx, a] of [[-0.3, 0.18], [0.3, -0.18]]) { const m = monitor(scene, x + dx, 0.755, z + f * 0.2, ry + a * f, b.screen, 0.56); }
  keyboardMouse(scene, x - 0.05, 0.755, z - f * 0.12, ry);
  deskLamp(scene, x + 0.6, 0.755, z + f * 0.22, ry + 0.4);
  mug(scene, x - 0.58, 0.755, z - f * 0.18, b.accent);
  notebook(scene, x - 0.48, 0.755, z - f * 0.02, ry + 0.2, "#2a2f3a");
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), new THREE.MeshStandardMaterial({ map: labelTex(b.name, { w: 320, h: 96, bg: "#1c1d21", fg: "#ffffff", font: "600 50px Inter, sans-serif", radius: 8 }), roughness: 0.3 }));
  plate.position.set(x + 0.35, 0.79, z - f * 0.33); plate.rotation.set(-0.25 * f, ry + (f > 0 ? 0 : 0), 0); if (f > 0) plate.rotation.y = 0; else plate.rotation.y = Math.PI;
  scene.add(plate);
  // personal touches
  if (id === "finbot") { papers(scene, x + 0.2, 0.755, z - f * 0.05, 0.1, 6); rbox(scene, 0.09, 0.015, 0.16, black(), x + 0.42, 0.763, z - f * 0.1, 0.004);
    for (let i = 0; i < 3; i++) rbox(scene, 0.05, 0.28, 0.24, std(["#1f6f5b", "#d8b24a", "#2f3338"][i]), x - 0.62 + i * 0.055, 0.9, z + f * 0.22, 0.006); }
  if (id === "peoplebot") { plant(scene, x - 0.5, z + f * 0.22, 0.32, "snake"); scene.children.at(-1).position.y = 0.755;
    const fr = rbox(scene, 0.13, 0.17, 0.015, std("#cdbfa6"), x + 0.45, 0.85, z + f * 0.05, 0.004); fr.rotation.y = ry + 0.3;
    const hs = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20, Math.PI), black()); hs.position.set(x + 0.15, 0.77, z - f * 0.02); hs.rotation.x = -Math.PI / 2; scene.add(hs); }
  if (id === "growthbot") { laptop(scene, x + 0.25, 0.755, z - f * 0.02, ry - 0.3, "growth");
    for (let i = 0; i < 4; i++) plane(scene, 0.07, 0.07, std(["#ffd76a", "#ff9fc6", "#9fd4ff", "#b6f0a8"][i], { roughness: 0.9 }), x - 0.45 + (i % 2) * 0.09, 1.02 + (i >> 1) * 0.09, POD.z - f * 0.023, f > 0 ? Math.PI : 0); }
  if (id === "opsbot") { const hat = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std("#f2c200", { roughness: 0.35 })); hat.position.set(x + 0.48, 0.755, z - f * 0.05); scene.add(hat);
    rbox(scene, 0.23, 0.012, 0.32, std("#8b5a2b"), x + 0.18, 0.762, z - f * 0.04, 0.004); papers(scene, x + 0.18, 0.77, z - f * 0.04, 0, 2);
    const box = std("#b88a57", { roughness: 0.95 }); rbox(scene, 0.45, 0.32, 0.36, box, x - 0.95, 0.16, z - f * 0.05, 0.01); block(x - 1.18, z - 0.25, x - 0.72, z + 0.15); }
  const bz = z - f * 0.72;
  makeBot(id, x - 0.05, bz).rotation.y = ry;
  block(x - 0.33, bz - 0.3, x + 0.23, bz + 0.3);
}

// ---------- the bots ----------
let STATUS = {};
fetch("status.json?" + Date.now()).then((r) => r.json()).then((s) => { STATUS = s.bots || {}; refreshStatus(); }).catch(() => {});
function faceTex() {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 160;
  const g = cv.getContext("2d");
  g.fillStyle = "#0a1418"; g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#8ff0ff"; g.shadowColor = "#8ff0ff"; g.shadowBlur = 12;
  g.beginPath(); g.ellipse(86, 72, 16, 21, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(170, 72, 16, 21, 0, 0, 7); g.fill();
  g.lineWidth = 7; g.strokeStyle = "#8ff0ff"; g.lineCap = "round"; g.beginPath(); g.arc(128, 100, 24, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FACE = faceTex();
function makeBot(id, x, z) {
  const b = BOTS[id];
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const shell = std("#eef0f2", { roughness: 0.3, metalness: 0.15 }), acc = std(b.accent, { roughness: 0.4, metalness: 0.2 }), dark = std("#2a2d33", { roughness: 0.5 });
  chair(g, 0, 0.1, 0, "#2b2e35");
  rbox(g, 0.36, 0.13, 0.4, dark, 0, 0.56, -0.04, 0.05);
  for (const s of [-0.1, 0.1]) { rbox(g, 0.12, 0.11, 0.42, shell, s, 0.58, -0.22, 0.045); rbox(g, 0.11, 0.44, 0.12, shell, s, 0.3, -0.4, 0.045); rbox(g, 0.13, 0.05, 0.2, dark, s, 0.04, -0.45, 0.02); }
  rbox(g, 0.42, 0.5, 0.28, shell, 0, 0.92, 0.03, 0.11);
  rbox(g, 0.28, 0.22, 0.03, acc, 0, 0.97, -0.115, 0.03);
  const head = new THREE.Group(); head.position.set(0, 1.38, 0.0); g.add(head);
  rbox(head, 0.4, 0.33, 0.33, shell, 0, 0, 0, 0.12);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshStandardMaterial({ map: FACE, emissiveMap: FACE, emissive: "#ffffff", emissiveIntensity: 0.9 }));
  face.position.set(0, 0, -0.167); face.rotation.y = Math.PI; head.add(face);
  for (const s of [-1, 1]) cyl(head, 0.06, 0.06, 0.04, acc, s * 0.215, 0, 0).rotation.z = Math.PI / 2;
  rbox(g, 0.09, 0.08, 0.09, dark, 0, 1.19, 0, 0.03);
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group(); a.position.set(s * 0.26, 1.08, -0.01); g.add(a);
    rbox(a, 0.1, 0.1, 0.34, shell, 0, -0.12, -0.13, 0.045).rotation.x = 0.7;
    rbox(a, 0.09, 0.09, 0.28, acc, 0, -0.23, -0.38, 0.04);
    return a;
  });
  if (id === "chiefbot") { rbox(g, 0.44, 0.51, 0.29, std("#1d2a4a", { roughness: 0.65 }), 0, 0.92, 0.035, 0.11).scale.set(1.03, 1, 0.97); rbox(g, 0.06, 0.26, 0.02, std("#8a1f2a"), 0, 0.94, -0.13, 0.008); }
  if (id === "peoplebot") { const hb = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.014, 8, 32, Math.PI), dark); hb.position.y = 0.02; head.add(hb); }
  if (id === "opsbot") rbox(g, 0.44, 0.28, 0.02, std("#d6ff3a", { roughness: 0.6 }), 0, 0.94, -0.125, 0.008);
  // small, tidy status badge above the head
  const lamp = { material: null };  // status lives on the badge only (a glowing dot looked like a game pickup up close)
  const pill = new THREE.Sprite(new THREE.SpriteMaterial({ map: badge(b.name, false) }));
  pill.scale.set(0.5, 0.11, 1); pill.position.set(0, 1.72, 0); g.add(pill);
  g.userData = { act: { label: `Talk to ${b.name}`, fn: () => openBot(id) }, id, head, arms, lamp, pill, busy: false };
  clickables.push(g); bots[id] = g;
  return g;
}
function badge(name, busy) {
  return labelTex(`${name} · ${busy ? "Busy" : "Available"}`, { w: 512, h: 112, bg: "#ffffffee", fg: busy ? "#b42318" : "#1a6b3c", font: "600 46px Inter, sans-serif" });
}
function refreshStatus() {
  for (const [id, g] of Object.entries(bots)) {
    const busy = STATUS[id] === "busy"; g.userData.busy = busy;
    g.userData.lamp.material = glow(busy ? "#ff4d4d" : "#35e07a", 2);
    g.userData.pill.material.map = badge(BOTS[id].name, busy); g.userData.pill.material.needsUpdate = true;
  }
}
station("finbot", POD.x - 0.7, POD.z - 0.375, 1);
station("peoplebot", POD.x + 0.7, POD.z - 0.375, 1);
station("growthbot", POD.x - 0.7, POD.z + 0.375, -1);
station("opsbot", POD.x + 0.7, POD.z + 0.375, -1);

// ---------- ChiefBot's glass office (back right) ----------
const OFF = { x0: 1.7, z1: -0.9 };
{
  const glassP = new THREE.MeshStandardMaterial({ color: "#f2f8ff", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false });
  const film = mat("film", () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false }));
  const gwall = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ry = -Math.atan2(z1 - z0, x1 - x0);
    const p = new THREE.Mesh(new THREE.BoxGeometry(len, H - 0.02, 0.012), glassP); p.position.set(cx, H / 2, cz); p.rotation.y = ry; scene.add(p);
    const f = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.014), film); f.position.set(cx, 1.15, cz); f.rotation.y = ry; scene.add(f); // privacy band
    for (const y of [0.02, H - 0.02]) { const t = rbox(scene, len, 0.04, 0.05, frameM, cx, y, cz, 0, false); t.rotation.y = ry; }
    block(x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04);
  };
  gwall(OFF.x0, -D, OFF.x0, OFF.z1); gwall(OFF.x0, OFF.z1, 2.6, OFF.z1); gwall(3.45, OFF.z1, W, OFF.z1); // door gap 2.6..3.45
  for (const x of [2.6, 3.45]) rbox(scene, 0.05, H, 0.06, frameM, x, H / 2, OFF.z1, 0, false);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.08), new THREE.MeshStandardMaterial({ map: labelTex("ChiefBot · Chief of Staff", { w: 640, h: 96, fg: "#2b2d31", font: "600 40px Inter, sans-serif" }), transparent: true }));
  sign.position.set(3.9, 1.55, OFF.z1 + 0.012); scene.add(sign);
  // walnut executive desk facing the door, credenza and shelf behind, guest chairs
  const walnut = mat("walnut", () => { const t = TEX.oak(); t.repeat.set(0.5, 0.5); return new THREE.MeshStandardMaterial({ map: t, color: "#8a5c3c", roughness: 0.4 }); });
  rbox(scene, 1.7, 0.04, 0.8, walnut, 3.1, 0.74, -2.35, 0.008);
  rbox(scene, 1.6, 0.68, 0.04, walnut, 3.1, 0.38, -1.98, 0.006);
  for (const sx of [-0.82, 0.82]) rbox(scene, 0.04, 0.72, 0.76, walnut, 3.1 + sx, 0.36, -2.35, 0.006);
  block(2.2, -2.8, 4.0, -1.9);
  monitor(scene, 3.1, 0.76, -2.62, 0, "chief", 0.7);
  laptop(scene, 2.55, 0.76, -2.3, 0.4, "mail");
  keyboardMouse(scene, 3.05, 0.76, -2.25, 0);
  mug(scene, 3.75, 0.76, -2.2, "#c9a14a"); notebook(scene, 3.55, 0.76, -2.4, -0.2, "#5a1f24"); deskLamp(scene, 3.8, 0.76, -2.6, -0.4);
  makeBot("chiefbot", 3.1, -3.0).rotation.y = Math.PI;
  block(2.8, -3.35, 3.4, -2.75);
  for (const x of [2.7, 3.5]) chair(scene, x, -1.45, Math.PI + (x < 3 ? 0.15 : -0.15), "#6a5240");
  block(2.4, -1.75, 3.8, -1.15);
  bookshelf(scene, W - 0.17, -2.3, -Math.PI / 2, 1.4, 2.0, 5); block(W - 0.36, -3.0, W, -1.6);
  plant(scene, 2.0, -3.15, 1.05, "fig"); block(1.8, -3.35, 2.2, -2.95);
  plane(scene, 2.4, 2.0, std("#c7b89f", { roughness: 1 }), 3.1, 0.005, -2.2, 0, -Math.PI / 2);
  framedArt(scene, W - 0.02, 1.6, -1.25, -Math.PI / 2, 5, 0.5, 0.62);
}

// ---------- right wall: sofa nook ----------
{
  const sofaM = mat("sofa", () => new THREE.MeshStandardMaterial({ map: TEX.fabric("#5b6b7d"), roughness: 1 }));
  const s = new THREE.Group(); s.position.set(W - 0.42, 0, 0.85); s.rotation.y = -Math.PI / 2; scene.add(s);
  rbox(s, 1.9, 0.2, 0.8, sofaM, 0, 0.22, 0, 0.04);
  for (const x of [-0.47, 0.47]) rbox(s, 0.92, 0.14, 0.62, sofaM, x, 0.39, -0.06, 0.06);
  rbox(s, 1.9, 0.45, 0.2, sofaM, 0, 0.6, 0.3, 0.07);
  for (const x of [-0.9, 0.9]) rbox(s, 0.16, 0.5, 0.8, sofaM, x, 0.4, 0, 0.06);
  for (const x of [-0.85, 0.85]) for (const z of [-0.33, 0.33]) cyl(s, 0.02, 0.015, 0.12, oak(), x, 0.06, z, 8);
  rbox(s, 0.4, 0.38, 0.12, std("#c9a14a", { roughness: 0.95 }), -0.55, 0.62, 0.15, 0.05).rotation.x = -0.25;
  block(W - 0.85, -0.15, W, 1.85);
  const t = new THREE.Group(); t.position.set(W - 1.35, 0, 0.85); scene.add(t);   // round coffee table
  cyl(t, 0.35, 0.35, 0.03, oak(), 0, 0.42, 0, 40); cyl(t, 0.03, 0.03, 0.4, black(), 0, 0.2, 0, 12); cyl(t, 0.2, 0.2, 0.02, black(), 0, 0.01, 0, 30);
  for (let i = 0; i < 2; i++) rbox(t, 0.24, 0.02, 0.3, std(["#e4dccb", "#30353d"][i]), 0.05 * i, 0.445 + i * 0.02, 0.05, 0.004).rotation.y = 0.3 * i;
  block(W - 1.72, 0.48, W - 0.98, 1.22);
  const fl = new THREE.Group(); fl.position.set(W - 0.3, 0, 2.05); scene.add(fl);     // floor lamp
  cyl(fl, 0.14, 0.15, 0.02, black(), 0, 0.01, 0, 24); cyl(fl, 0.012, 0.012, 1.5, black(), 0, 0.76, 0, 8);
  cyl(fl, 0.17, 0.2, 0.24, std("#efe8dc", { roughness: 0.9, side: THREE.DoubleSide }), 0, 1.55, 0, 24);
  const fp = new THREE.PointLight("#ffe2b8", 1.2, 3, 2); fp.position.set(0, 1.45, 0); fl.add(fp);
  block(W - 0.45, 1.9, W, 2.2);
  framedArt(scene, W - 0.02, 1.5, 0.85, -Math.PI / 2, 33, 1.1, 0.7);
}

// ---------- front: kitchenette (right), entrance door, meeting table + whiteboard (left) ----------
{
  const k = new THREE.Group(); k.position.set(2.95, 0, D - 0.31); scene.add(k);
  const front = std("#2f3a45", { roughness: 0.55 }), top = std("#e9e7e2", { roughness: 0.25 });
  rbox(k, 2.4, 0.86, 0.58, front, 0, 0.45, 0, 0.006);
  for (let i = 0; i < 4; i++) { rbox(k, 0.58, 0.8, 0.01, front, -0.9 + i * 0.6, 0.46, -0.295, 0.004); rbox(k, 0.14, 0.012, 0.012, metal(), -0.9 + i * 0.6, 0.78, -0.305, 0.004, false); }
  rbox(k, 2.44, 0.035, 0.62, top, 0, 0.895, -0.01, 0.004);
  rbox(k, 0.45, 0.02, 0.36, std("#c4c8cc", { metalness: 0.9, roughness: 0.25 }), -0.55, 0.905, 0, 0.01);         // sink
  const tap = cyl(k, 0.012, 0.012, 0.3, metal(), -0.55, 1.05, 0.15, 8); const sp = cyl(k, 0.01, 0.01, 0.16, metal(), -0.55, 1.2, 0.08, 8); sp.rotation.x = Math.PI / 2;
  const cm = new THREE.Group(); cm.position.set(0.45, 0.91, 0.02); k.add(cm);                                   // espresso machine
  rbox(cm, 0.32, 0.38, 0.36, std("#1c1d21", { metalness: 0.7, roughness: 0.3 }), 0, 0.19, 0, 0.03);
  rbox(cm, 0.2, 0.012, 0.12, metal(), 0, 0.05, -0.16, 0.004); cyl(cm, 0.03, 0.03, 0.05, metal(), 0, 0.22, -0.2, 12);
  cm.userData.act = { label: "Coffee machine", fn: () => toast("☕ Flat white, coming up.") }; clickables.push(cm);
  cyl(k, 0.07, 0.08, 0.2, std("#d8dadc", { metalness: 0.8, roughness: 0.3 }), 0.95, 1.01, 0.05, 20);          // kettle
  for (let i = 0; i < 3; i++) mug(k, 0.05 + i * 0.1, 0.913, -0.15, ["#f2f0ea", "#1f6f5b", "#2c5aa0"][i]);
  rbox(k, 2.4, 0.7, 0.34, std("#f1f0ec", { roughness: 0.45 }), 0, 1.85, 0.12, 0.006);                          // wall cabinets
  for (let i = 0; i < 4; i++) rbox(k, 0.12, 0.012, 0.012, metal(), -0.9 + i * 0.6, 1.55, -0.055, 0.004, false);
  plane(k, 2.4, 0.55, std("#dfe3e6", { roughness: 0.2 }), 0, 1.2, 0.285, Math.PI);                           // splashback
  rbox(scene, 0.68, 1.95, 0.64, std("#d9dde1", { metalness: 0.6, roughness: 0.3 }), 4.15, 0.975, D - 0.33, 0.02); // fridge
  cyl(scene, 0.012, 0.012, 0.6, metal(), 3.86, 1.25, D - 0.66, 8);
  cyl(scene, 0.15, 0.13, 0.42, std("#3a3d43", { roughness: 0.6 }), 1.55, 0.21, D - 0.3, 20);                    // bin
  block(1.4, D - 0.62, W, D);
  for (const x of [2.3, 3.0, 3.7]) { cyl(scene, 0.002, 0.002, 0.7, black(), x, H - 0.35, D - 0.9, 4); const sh = cyl(scene, 0.09, 0.12, 0.16, std("#1c1d21", { metalness: 0.4, roughness: 0.4 }), x, H - 0.78, D - 0.9, 20); const bl = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), glow("#ffe2b8", 1.4)); bl.rotation.x = Math.PI / 2; bl.position.set(x, H - 0.865, D - 0.9); scene.add(bl); }
}
{ // entrance: glass door in a black frame + EXIT sign; clicking it leaves
  const g = new THREE.Group(); g.position.set(0.1, 0, D); scene.add(g);
  rbox(g, 1.02, 2.17, 0.08, frameM, 0, 1.085, 0, 0.004);
  plane(g, 0.9, 2.05, glass, 0, 1.06, -0.045, Math.PI);
  rbox(g, 0.03, 0.9, 0.03, metal(), 0.36, 1.05, -0.08, 0.01);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), new THREE.MeshBasicMaterial({ map: labelTex("EXIT", { w: 256, h: 92, bg: "#0e7a3c", font: "700 60px Inter, sans-serif", radius: 6 }), toneMapped: false }));
  ex.position.set(0, 2.38, -0.02); ex.rotation.y = Math.PI; g.add(ex);
  g.userData.act = { label: "Exit", fn: () => exitOffice() }; clickables.push(g);
  plant(scene, -0.75, D - 0.35, 1.1, "fig"); block(-0.95, D - 0.55, -0.55, D);
  const coat = new THREE.Group(); coat.position.set(1.0, 0, D - 0.3); scene.add(coat); cyl(coat, 0.012, 0.014, 1.75, black(), 0, 0.88, 0, 8); cyl(coat, 0.18, 0.2, 0.02, black(), 0, 0.01, 0, 20);
  for (let i = 0; i < 4; i++) { const h = cyl(coat, 0.006, 0.006, 0.14, black(), Math.cos(i * 1.57) * 0.05, 1.7, Math.sin(i * 1.57) * 0.05, 6); h.rotation.set(Math.sin(i * 1.57) * 0.8, 0, -Math.cos(i * 1.57) * 0.8); }
  rbox(coat, 0.3, 0.5, 0.12, std("#3a4a5c", { roughness: 0.95 }), 0.08, 1.38, 0.04, 0.05);
}
{ // meeting table + whiteboard
  const t = new THREE.Group(); t.position.set(-3.1, 0, 2.3); scene.add(t);
  cyl(t, 0.55, 0.55, 0.035, white(), 0, 0.735, 0, 48); cyl(t, 0.04, 0.04, 0.7, metal(), 0, 0.37, 0, 12); cyl(t, 0.3, 0.3, 0.02, metal(), 0, 0.01, 0, 30);
  laptop(t, -0.1, 0.753, -0.15, 0.6, "chief"); notebook(t, 0.25, 0.753, 0.1, -0.4, "#a33a2e");
  block(-3.7, 1.7, -2.5, 2.9);
  for (const a of [0.4, 2.3, 4.2]) chair(scene, -3.1 + Math.sin(a) * 0.82, 2.3 + Math.cos(a) * 0.82, a, "#7a6a58");
  const wb = new THREE.Group(); wb.position.set(-3.1, 1.45, D - 0.02); wb.rotation.y = Math.PI; scene.add(wb);
  rbox(wb, 1.6, 0.95, 0.025, metal(), 0, 0, 0, 0.006);
  plane(wb, 1.54, 0.89, mat("wbtex", () => new THREE.MeshStandardMaterial({ roughness: 0.15, map: (() => { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 296; const g = cv.getContext("2d");
    g.fillStyle = "#fbfcfc"; g.fillRect(0, 0, 512, 296); g.strokeStyle = "#2c5aa0"; g.fillStyle = "#2c5aa0"; g.lineWidth = 3; g.font = "28px 'Comic Sans MS', cursive";
    g.fillText("Q4 plan", 24, 44); g.font = "20px 'Comic Sans MS', cursive"; ["• VAT201 due 23 Oct", "• Onboard 2 new clients", "• Payroll run 25th"].forEach((s, i) => g.fillText(s, 30, 90 + i * 34));
    g.strokeStyle = "#c0392b"; g.beginPath(); g.moveTo(320, 220); for (let i = 0; i < 6; i++) g.lineTo(320 + i * 30, 220 - i * 22 - (i % 2) * 10); g.stroke(); g.strokeStyle = "#333"; g.beginPath(); g.moveTo(310, 230); g.lineTo(490, 230); g.moveTo(310, 230); g.lineTo(310, 90); g.stroke();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })() })), 0, 0, 0.014);
  rbox(wb, 1.5, 0.03, 0.06, metal(), 0, -0.49, 0.03, 0.006);
}
plant(scene, -W + 0.35, D - 0.35, 1.2, "fig"); block(-W, D - 0.6, -W + 0.6, D);
plant(scene, 1.25, -0.6, 0.9, "snake"); block(1.05, -0.8, 1.45, -0.4);
const clock = new THREE.Group(); clock.position.set(-1.5, 2.25, D - 0.02); clock.rotation.y = Math.PI; scene.add(clock);
cyl(clock, 0.16, 0.16, 0.03, white(), 0, 0, 0, 40).rotation.x = Math.PI / 2;
{ const hh = rbox(clock, 0.012, 0.08, 0.005, black(), 0, 0.03, 0.02, 0, false); hh.rotation.z = -0.9; const mm = rbox(clock, 0.008, 0.12, 0.005, black(), 0, 0.05, 0.022, 0, false); mm.rotation.z = 0.5; }

// ---------- input: drag to look, WASD / joystick to walk, tap a bot ----------
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
    player.yaw -= (e.clientX - look.x) * 0.0042;
    player.pitch = Math.max(-0.9, Math.min(0.7, player.pitch - (e.clientY - look.y) * 0.0035));
    look.x = e.clientX; look.y = e.clientY;
  } else if (!touch) hover(e);
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(clickables, true)[0];
  if (!hit || hit.distance > 8) return null;
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
function blocked(x, z) { const R = 0.25; return solids.some(([a, b, c, d]) => x > a - R && x < c + R && z > b - R && z < d + R); }
const vel = { x: 0, z: 0 };
function move(dt) {
  let f = 0, s = 0;
  if (keys.w || keys.arrowup) f += 1; if (keys.s || keys.arrowdown) f -= 1;
  if (keys.a) s -= 1; if (keys.d) s += 1;
  if (keys.arrowleft) player.yaw += dt * 1.5; if (keys.arrowright) player.yaw -= dt * 1.5;
  f -= joy.y; s += joy.x;
  const sn = Math.sin(player.yaw), cs = Math.cos(player.yaw), sp = 1.5;
  const tx = (-sn * f + cs * s) * sp, tz = (-cs * f - sn * s) * sp;
  vel.x += (tx - vel.x) * Math.min(1, dt * 8); vel.z += (tz - vel.z) * Math.min(1, dt * 8);   // ease in/out, no jerky starts
  const dx = vel.x * dt, dz = vel.z * dt;
  if (!blocked(player.x + dx, player.z)) player.x += dx; else vel.x = 0;
  if (!blocked(player.x, player.z + dz)) player.z += dz; else vel.z = 0;
  if (player.z > D - 0.3 && player.x > -0.4 && player.x < 0.6) exitOffice();
}

// ---------- UI ----------
let near = null;
$("#act").onclick = () => near && near.fn();
$("#close").onclick = closePanel;
$("#exitBtn").onclick = () => exitOffice();
function openPanel(html) { $("#pbody").innerHTML = html; $("#panel").hidden = false; }
function closePanel() { $("#panel").hidden = true; }
let toastT;
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2400); }
let leaving = false;
function exitOffice() {
  if (leaving) return; leaving = true;
  document.body.classList.add("leaving");
  const ref = document.referrer && new URL(document.referrer).origin === location.origin ? document.referrer : "";
  setTimeout(() => { if (ref && history.length > 1) history.back(); else location.href = "/ai-team/"; }, 350);
}
$("#enter").onclick = () => { $("#intro").remove(); toast(touch ? "Tap an employee to talk to them" : "Click an employee to talk to them · WASD to walk"); };

function openBot(id) {
  const b = BOTS[id], busy = STATUS[id] === "busy";
  openPanel(`<div class="who"><img src="avatars/${id}.jpg" alt=""><div><div class="kick">${b.role}</div><h2>${b.name}</h2>
    <span class="st ${busy ? "busy" : "free"}">${busy ? "● Busy" : "● Available"}</span></div></div>
    <p>${b.pitch}</p>
    <div class="btns"><a class="big" href="mailto:hello@eaafix.com?subject=${b.name}%20for%20my%20business">Hire ${b.name}</a>
    <a class="big ghost" href="/ai-team/#prices">See prices</a>
    ${id === "finbot" ? `<button class="big ghost" id="demoBtn">▶ See a demo</button>` : ""}</div>${JOBS[id] ? workForm(id) : ""}<div id="res"></div>`);
  if (id === "finbot") $("#demoBtn").onclick = runDemo;
  if (JOBS[id]) wireWork(id);
}

// ---- give an employee work (owner 2026-10-10): files in, download links out (owner-only passcode) ----
const WORKS = "https://chat.sonneblomdigitaal.co.za/works";
const JOBS = {
  finbot: [["bank", "Bank statement → allocated workbook + Sage import", true], ["recon", "Blank VAT reconciliation (year end 28 Feb)", false]],
  peoplebot: [["uif", "UIF / IRP5 termination check (staff list, UI-19 list, IRP5 list)", true]],
};
function workForm(id) {
  const pass = localStorage.getItem("works-pass") || "";
  return `<div class="work"><div class="kick">Give ${BOTS[id].name} work</div>
    ${pass ? "" : `<input id="wPass" type="password" placeholder="Office passcode (asked once)">`}
    <select id="wTask">${JOBS[id].map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select>
    <input id="wClient" placeholder="Client name">
    <div class="wRow"><input id="wOpen" placeholder="Opening balance (bank only)" inputmode="decimal"><input id="wYear" placeholder="Year end (recon), e.g. 2027" inputmode="numeric"></div>
    <label class="wFile">📎 <span id="wFn">Choose file(s): CSV, Excel or PDF</span><input id="wFiles" type="file" multiple accept=".csv,.xlsx,.xlsm,.pdf"></label>
    <button class="big" id="wGo">Hand it over</button><div id="wOut" class="dim"></div></div>`;
}
function wireWork(id) {
  $("#wFiles").onchange = e => { $("#wFn").textContent = [...e.target.files].map(f => f.name).join(", ") || "Choose file(s)"; };
  $("#wGo").onclick = async () => {
    const pass = ($("#wPass") && $("#wPass").value) || localStorage.getItem("works-pass") || "";
    if (!pass) return ($("#wOut").textContent = "Enter the office passcode first.");
    const fd = new FormData(); fd.append("bot", id); fd.append("task", $("#wTask").value); fd.append("client", $("#wClient").value);
    fd.append("opening", $("#wOpen").value); fd.append("year", $("#wYear").value); fd.append("lang", "af");
    [...$("#wFiles").files].slice(0, 3).forEach(f => fd.append("files", f, f.name));
    $("#wGo").disabled = true; $("#wOut").innerHTML = `⏳ ${BOTS[id].name} is working on it… (PDFs take about a minute)`;
    try {
      const r = await fetch(WORKS + "/job", { method: "POST", headers: { "X-Pass": pass }, body: fd }); const d = await r.json();
      if (r.status === 401) { localStorage.removeItem("works-pass"); $("#wOut").textContent = "Wrong passcode."; return; }
      if (!d.ok) { $("#wOut").textContent = "⚠️ " + (d.error || "Something went wrong."); return; }
      localStorage.setItem("works-pass", pass);
      $("#wOut").innerHTML = `✅ ${d.summary}<br>${d.links.map(l => `<a class="dl" href="${l.url}">⬇ ${l.name}</a>`).join("")}<br><span class="dim">Links work for ${d.expires_hours} hours, then the files are deleted.</span>`;
    } catch (e) { $("#wOut").textContent = "⚠️ Couldn't reach the office server. Try again."; }
    finally { $("#wGo").disabled = false; }
  };
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

// ---------- loop ----------
window.officePlayer = player; // test hook
const clk = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clk.getDelta(), 0.05), t = clk.elapsedTime;
  if ($("#panel").hidden && !leaving) move(dt);
  camera.position.set(player.x, EYE, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
  for (const g of Object.values(bots)) {
    const u = g.userData, sp = u.busy ? 14 : 4;
    u.desk ??= g.rotation.y;
    const dist = Math.hypot(player.x - g.position.x, player.z - g.position.z);
    const want = dist < 2.2 ? Math.atan2(-(player.x - g.position.x), -(player.z - g.position.z)) : u.desk; // swivel to greet you
    let d = want - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 3);
    u.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * sp + i * 1.7) * (u.busy ? 0.06 : 0.02)));
    u.head.rotation.y = Math.sin(t * 0.5 + g.position.x) * (u.busy ? 0.04 : 0.18);
  }
  near = null;
  for (const o of clickables) { const p = o.getWorldPosition(new THREE.Vector3()); if (Math.hypot(p.x - player.x, p.z - player.z) < 1.5) { near = o.userData.act; break; } }
  const pr = $("#prompt");
  pr.style.display = near && $("#panel").hidden ? "block" : "none";
  if (near) pr.querySelector("span").textContent = near.label + (touch ? "" : " (E)");
  composer.render();
});
