// Sonneblom AI Works office v4 (owner 2026-10-10: "tighter and more detailed, not like a game, a virtual office that looks real").
// 9 m x 7 m room, oak floor, ceiling grid, realistic furniture and screens. PBR + environment light + soft shadows.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const W = 4.5, D = 3.5, H = 2.8; // half width, half depth, ceiling height (9 m x 7 m room)
export const LOW = matchMedia("(pointer: coarse)").matches;

export function setup(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dfe9f2");
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 60);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.12, 0.3, 0.985); // only the light panels glow, softly
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth / 2, innerHeight / 2);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 72 : 58;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize); resize();
  return { renderer, scene, camera, composer };
}

// ---------- procedural textures ----------
let SEED = 11;
export const rnd = () => ((SEED = (SEED * 16807) % 2147483647) / 2147483647);
export function canvasTex(w, h, draw, repeat = [1, 1], color = true) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const grain = (g, w, h, amp, n, size = 1) => {
  for (let i = 0; i < n; i++) { const v = (rnd() - 0.5) * amp; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(rnd() * w, rnd() * h, size, size); }
};
export const TEX = {
  oak: () => canvasTex(1024, 1024, (g, w, h) => {      // 8 planks across, staggered butt joints
    const pw = w / 8;
    for (let i = 0; i < 8; i++) {
      let y = -rnd() * 400;
      while (y < h) {
        const len = 300 + rnd() * 380, tone = 150 + rnd() * 35;
        g.fillStyle = `rgb(${tone + 40 | 0},${tone + 8 | 0},${tone - 40 | 0})`; g.fillRect(i * pw, y, pw, len);
        for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(90,55,25,${0.04 + rnd() * 0.1})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const x = i * pw + rnd() * pw; g.moveTo(x, y); g.bezierCurveTo(x + rnd() * 8 - 4, y + len / 3, x + rnd() * 8 - 4, y + len * 0.66, x + rnd() * 6 - 3, y + len); g.stroke(); }
        g.fillStyle = "rgba(40,25,10,.55)"; g.fillRect(i * pw, y, pw, 2);
        y += len;
      }
      g.fillStyle = "rgba(40,25,10,.5)"; g.fillRect(i * pw, 0, 2, h);
    }
    grain(g, w, h, 0.06, 20000);
  }, [2.2, 1.7]),
  rug: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#5d6470"; g.fillRect(0, 0, w, h); grain(g, w, h, 0.16, 40000, 1.5);
    g.strokeStyle = "#474d58"; g.lineWidth = 16; g.strokeRect(10, 10, w - 20, h - 20);
  }),
  plaster: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#efede8"; g.fillRect(0, 0, w, h); grain(g, w, h, 0.035, 9000, 2); }, [4, 2]),
  ceiling: () => canvasTex(256, 256, (g, w, h) => {     // 600 mm acoustic tiles in a T-bar grid
    g.fillStyle = "#f4f3ef"; g.fillRect(0, 0, w, h); grain(g, w, h, 0.07, 9000, 1.5);
    g.fillStyle = "#d9d9d4"; g.fillRect(0, 0, w, 5); g.fillRect(0, 0, 5, h);
  }, [15, 11.7]),
  slats: () => canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = "#1e1c1a"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { const t = 120 + rnd() * 30; g.fillStyle = `rgb(${t + 45 | 0},${t + 10 | 0},${t - 35 | 0})`; g.fillRect(x + 4, 0, 24, h); }
    grain(g, w, h, 0.06, 6000);
  }, [3, 1]),
  fabric: (hex) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = hex; g.fillRect(0, 0, w, h); grain(g, w, h, 0.12, 7000); }, [2, 2]),
  mesh: () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#26282d"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a3d44"; for (let y = 0; y < h; y += 4) for (let x = (y / 4) % 2 * 2; x < w; x += 4) g.fillRect(x, y, 2, 2); }, [4, 4]),
  keyboard: () => canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = "#d9dbde"; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) { g.fillStyle = "#f6f7f8"; g.fillRect(6 + c * 16.4, 6 + r * 17, 14, 14); }
    g.fillStyle = "#f6f7f8"; g.fillRect(60, 6 + 4 * 17, 120, 14);
  }),
  books: () => canvasTex(512, 128, (g, w, h) => {
    const C = ["#7a2e2e", "#25476b", "#d9c9a5", "#2f5d4a", "#a36a2b", "#3b3b44", "#b8b2a6", "#6b4c7a", "#1f3a5a", "#c1442e"];
    let x = 0;
    while (x < w) { const bw = 10 + rnd() * 18, bh = h * (0.72 + rnd() * 0.28); g.fillStyle = C[rnd() * C.length | 0]; g.fillRect(x, h - bh, bw - 1, bh); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x + 2, h - bh + 8, bw - 5, 3); g.fillRect(x + 2, h - 18, bw - 5, 2); x += bw; }
  }),
  sky: (view = 0) => canvasTex(2048, 1024, (g, w, h) => skyline(g, w, h, view)),
  art: (seed) => canvasTex(256, 320, (g, w, h) => {      // abstract framed print
    SEED = seed; g.fillStyle = "#f3efe7"; g.fillRect(0, 0, w, h);
    const C = ["#d9a441", "#2f4b6e", "#c4573a", "#88a39a", "#1f1f24"];
    for (let i = 0; i < 6; i++) { g.fillStyle = C[i % 5]; g.globalAlpha = 0.85; g.beginPath(); g.arc(40 + rnd() * 180, 40 + rnd() * 240, 20 + rnd() * 70, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = "#1f1f24"; g.fillRect(30, h - 40, 120, 3);
  }),
};

// Screens: realistic app UIs per employee (spreadsheet, payroll, calendar, stock, dashboard)
export function screenTex(kind) {
  return canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    const bar = { fin: "#1f7a4d", people: "#2c5aa0", growth: "#b03a7a", ops: "#c46a1a", chief: "#1d2a4a", mail: "#2f6fd6" }[kind] || "#333";
    g.fillStyle = bar; g.fillRect(0, 0, w, 26);
    g.fillStyle = "#fff"; g.font = "600 14px Inter, sans-serif";
    g.fillText({ fin: "Statement_FNB_Sep.xlsx", people: "Payroll · October 2026", growth: "Content plan · October", ops: "Stock & jobs", chief: "Morning brief", mail: "Inbox" }[kind] || "", 10, 18);
    g.font = "12px Inter, sans-serif";
    if (kind === "fin" || kind === "people" || kind === "ops") {
      const cols = kind === "fin" ? ["Date", "Description", "Amount", "Account"] : kind === "people" ? ["Employee", "Gross", "PAYE", "Net"] : ["Item", "On hand", "Reorder", "Status"];
      g.fillStyle = "#eef1f4"; g.fillRect(0, 26, w, 22); g.fillStyle = "#333";
      cols.forEach((c, i) => g.fillText(c, 10 + i * 125, 42));
      for (let r = 0; r < 10; r++) {
        const y = 48 + r * 24; g.fillStyle = r % 2 ? "#fafbfc" : "#fff"; g.fillRect(0, y, w, 24);
        g.strokeStyle = "#e6e8eb"; g.beginPath(); g.moveTo(0, y + 24); g.lineTo(w, y + 24); g.stroke();
        g.fillStyle = "#444";
        const row = kind === "fin" ? [`0${r + 1}/09`, ["Woolworths", "Eskom", "Client EFT", "Telkom", "SARS", "Salaries"][r % 6], (r % 3 ? "-" : "") + "R" + (1200 + r * 731), ["Groceries", "Electricity", "Sales", "Phone", "Tax", "Wages"][r % 6]]
          : kind === "people" ? [["T. Mokoena", "A. van Wyk", "L. Naidoo", "J. Botha", "S. Dlamini"][r % 5], "R" + (18500 + r * 1300), "R" + (1900 + r * 210), "R" + (16200 + r * 1050)]
          : [["Flour 10kg", "Boxes", "Gloves", "Labels", "Tape"][r % 5], String(40 - r * 3), "20", r % 4 === 2 ? "ORDER" : "OK"];
        row.forEach((c, i) => { g.fillStyle = c === "ORDER" ? "#c0392b" : String(c).startsWith("-") ? "#b03a2e" : "#444"; g.fillText(c, 10 + i * 125, y + 16); });
      }
    } else if (kind === "growth") {
      for (let c = 0; c < 7; c++) for (let r = 0; r < 4; r++) {
        const x = 8 + c * 72, y = 34 + r * 66; g.strokeStyle = "#e3e6ea"; g.strokeRect(x, y, 68, 62);
        g.fillStyle = "#888"; g.fillText(String(1 + r * 7 + c), x + 4, y + 13);
        if ((c + r) % 3 !== 1) { g.fillStyle = ["#f6d4e6", "#d6e6fb", "#fde7c7"][(c + r) % 3]; g.fillRect(x + 4, y + 20, 60, 16); g.fillStyle = "#555"; g.fillText(["Reel", "Post", "Story"][(c + r) % 3], x + 8, y + 32); }
      }
    } else {
      [["3", "approvals waiting"], ["R48 210", "owed to you"], ["7 days", "to VAT201"], ["2", "new leads"]].forEach(([a, b], i) => {
        const x = 10 + (i % 2) * 250, y = 36 + (i / 2 | 0) * 70; g.fillStyle = "#f2f4f8"; g.fillRect(x, y, 240, 62);
        g.fillStyle = "#1d2a4a"; g.font = "700 24px Inter, sans-serif"; g.fillText(a, x + 10, y + 32); g.font = "12px Inter, sans-serif"; g.fillStyle = "#666"; g.fillText(b, x + 10, y + 52);
      });
      g.strokeStyle = "#2f6fd6"; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 12; i++) g.lineTo(20 + i * 40, 270 - (i * 7 + Math.sin(i) * 14)); g.stroke();
    }
  });
}

// City view through the windows: a calm mid-rise business district (no landmarks; owner wants real, not themed)
function skyline(g, w, h, view) {
  SEED = 7 + view * 101;
  const HZ = h * 0.56;
  const sky = g.createLinearGradient(0, 0, 0, HZ); sky.addColorStop(0, "#6f9fcf"); sky.addColorStop(0.7, "#bcd6ea"); sky.addColorStop(1, "#e9e6df");
  g.fillStyle = sky; g.fillRect(0, 0, w, HZ);
  g.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 10; i++) { const x = rnd() * w, y = 50 + rnd() * HZ * 0.5; for (let j = 0; j < 5; j++) { g.beginPath(); g.ellipse(x + j * 30, y + (j % 2) * 6, 50 + rnd() * 30, 10 + rnd() * 6, 0, 0, 7); g.fill(); } }
  g.fillStyle = "#9aa6b2"; g.fillRect(0, HZ - 10, w, h);
  const tower = (x, top, bw, tone, near) => {
    g.fillStyle = tone; g.fillRect(x, top, bw, h - top);
    g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(x, top, bw * 0.2, h - top);
    const cw = near ? 10 : 5, ch = near ? 14 : 7;
    for (let y = top + ch; y < h; y += ch * 1.6) for (let xx = x + 3; xx < x + bw - cw; xx += cw * 1.5) {
      g.fillStyle = `rgba(${150 + rnd() * 40 | 0},${175 + rnd() * 30 | 0},${200 + rnd() * 30 | 0},${0.35 + rnd() * 0.3})`; g.fillRect(xx, y, cw, ch);
    }
  };
  for (let x = -20; x < w; x += 25 + rnd() * 30) tower(x, HZ - 60 + rnd() * 60, 30 + rnd() * 50, `rgb(${150 + rnd() * 30 | 0},${158 + rnd() * 30 | 0},${168 + rnd() * 30 | 0})`, false);
  for (let x = -30; x < w; x += 60 + rnd() * 90) tower(x, HZ + 40 + rnd() * 120, 80 + rnd() * 110, `rgb(${95 + rnd() * 35 | 0},${104 + rnd() * 35 | 0},${116 + rnd() * 35 | 0})`, true);
  g.fillStyle = "#567a52"; for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(rnd() * w, h - rnd() * 60, 10 + rnd() * 14, 0, 7); g.fill(); } // street trees
  const haze = g.createLinearGradient(0, HZ - 80, 0, HZ + 160); haze.addColorStop(0, "rgba(233,230,223,0)"); haze.addColorStop(0.5, "rgba(233,230,223,.35)"); haze.addColorStop(1, "rgba(233,230,223,0)");
  g.fillStyle = haze; g.fillRect(0, HZ - 80, w, 240);
}

// ---------- materials ----------
const M = {};
export const mat = (key, make) => (M[key] ||= make());
export const std = (color, o = {}) => mat("s" + color + JSON.stringify(o), () => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o }));
export const glow = (color, k = 2.2) => mat("g" + color + k, () => new THREE.MeshStandardMaterial({ color: "#000", emissive: color, emissiveIntensity: k }));
export const metal = () => std("#b9bfc6", { metalness: 0.9, roughness: 0.28 });
export const black = () => std("#1c1d21", { metalness: 0.5, roughness: 0.4 });
export const oak = () => mat("oakdesk", () => { const t = TEX.oak(); t.repeat.set(0.5, 0.5); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.42 }); });
export const white = () => std("#f4f4f2", { roughness: 0.35 });

// ---------- mesh helpers ----------
export function rbox(parent, w, h, d, m, x, y, z, r = 0.01, cast = true) {
  const mesh = new THREE.Mesh(r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z); mesh.castShadow = cast && !LOW; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function cyl(parent, rt, rb, h, m, x, y, z, seg = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z); mesh.castShadow = !LOW; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function plane(parent, w, h, m, x, y, z, ry = 0, rx = 0) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); p.receiveShadow = true; parent.add(p); return p;
}
export function labelTex(text, { w = 512, h = 128, bg = null, fg = "#fff", font = "600 64px Inter, Segoe UI, sans-serif", radius = null } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, radius ?? h / 2); g.fill(); }
    g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = fg;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// ---------- furniture ----------
// Ergonomic task chair: mesh back, padded seat, armrests, gas lift, 5-star base with casters.
export function chair(parent, x, z, ry, color = "#2b2e35") {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const seat = mat("seat" + color, () => new THREE.MeshStandardMaterial({ map: TEX.fabric(color), roughness: 0.95 }));
  const meshM = mat("chairmesh", () => new THREE.MeshStandardMaterial({ map: TEX.mesh(), roughness: 0.8, side: THREE.DoubleSide }));
  const k = black(), m = metal();
  rbox(g, 0.5, 0.07, 0.48, seat, 0, 0.47, 0, 0.03);
  rbox(g, 0.46, 0.52, 0.03, k, 0, 0.83, 0.25, 0.02).rotation.x = -0.12;           // back frame
  plane(g, 0.42, 0.48, meshM, 0, 0.83, 0.235, Math.PI, 0.12);                      // mesh
  for (const s of [-1, 1]) { rbox(g, 0.04, 0.2, 0.04, k, s * 0.25, 0.58, 0.02, 0.01); rbox(g, 0.07, 0.025, 0.24, k, s * 0.25, 0.69, 0.0, 0.01); }
  cyl(g, 0.025, 0.025, 0.3, m, 0, 0.29, 0, 12); cyl(g, 0.04, 0.04, 0.08, k, 0, 0.42, 0, 12);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = rbox(g, 0.3, 0.03, 0.045, m, Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15, 0.01); leg.rotation.y = -a;
    cyl(g, 0.025, 0.025, 0.035, k, Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29, 10).rotation.z = Math.PI / 2;
  }
  return g;
}
// Monitor on a desk arm with a real UI on screen
export function monitor(parent, x, y, z, ry, kind, wide = 0.6) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const k = black();
  rbox(g, wide, wide * 0.58, 0.025, k, 0, 0.36, 0, 0.006);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(wide - 0.025, wide * 0.58 - 0.025), mat("scr" + kind, () => {
    const t = screenTex(kind); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.55, roughness: 0.3 });
  }));
  s.position.set(0, 0.36, 0.0135); g.add(s);
  rbox(g, 0.06, 0.06, 0.06, k, 0, 0.36, -0.04, 0.01);
  cyl(g, 0.012, 0.012, 0.26, metal(), 0, 0.17, -0.07, 10);
  rbox(g, 0.12, 0.012, 0.1, k, 0, 0.006, -0.07, 0.004);
  return g;
}
export function laptop(parent, x, y, z, ry, kind) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const al = std("#c9ccd1", { metalness: 0.8, roughness: 0.3 });
  rbox(g, 0.32, 0.012, 0.22, al, 0, 0.006, 0, 0.004);
  const lid = new THREE.Group(); lid.position.set(0, 0.012, -0.11); lid.rotation.x = -0.25; g.add(lid);
  rbox(lid, 0.32, 0.21, 0.008, al, 0, 0.105, 0, 0.004);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.18), mat("scr" + kind, () => { const t = screenTex(kind); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#fff", emissiveIntensity: 0.55 }); }));
  s.position.set(0, 0.105, 0.005); lid.add(s);
  return g;
}
export function keyboardMouse(parent, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const kb = mat("kb", () => new THREE.MeshStandardMaterial({ map: TEX.keyboard(), roughness: 0.5 }));
  rbox(g, 0.42, 0.014, 0.14, kb, 0, 0.007, 0, 0.004);
  rbox(g, 0.24, 0.003, 0.2, std("#2a2c31", { roughness: 0.95 }), 0.36, 0.0015, 0, 0.002);
  rbox(g, 0.06, 0.025, 0.1, std("#e8e9eb", { roughness: 0.3 }), 0.36, 0.014, 0.0, 0.02);
  return g;
}
export function deskLamp(parent, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const k = black();
  cyl(g, 0.07, 0.08, 0.02, k, 0, 0.01, 0, 20);
  const a = cyl(g, 0.008, 0.008, 0.36, k, 0, 0.18, 0.04, 8); a.rotation.x = 0.25;
  const b = cyl(g, 0.008, 0.008, 0.3, k, 0, 0.38, -0.02, 8); b.rotation.x = -1.1;
  const sh = cyl(g, 0.03, 0.07, 0.1, k, 0, 0.36, -0.16, 20); sh.rotation.x = -0.5;
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), glow("#ffe9c4", 1.2)); bulb.position.set(0, 0.32, -0.19); bulb.rotation.x = Math.PI / 2 + 0.5; g.add(bulb);
  return g;
}
export function mug(parent, x, y, z, color) {
  const m = std(color, { roughness: 0.3 });
  cyl(parent, 0.04, 0.036, 0.095, m, x, y + 0.0475, z, 18);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16, Math.PI), m); h.position.set(x + 0.04, y + 0.05, z); h.rotation.z = -Math.PI / 2; parent.add(h);
}
export function papers(parent, x, y, z, ry, n = 5) {
  for (let i = 0; i < n; i++) { const p = rbox(parent, 0.21, 0.003, 0.297, std("#fbfbf8", { roughness: 0.9 }), x + (rnd() - 0.5) * 0.02, y + i * 0.003, z + (rnd() - 0.5) * 0.02, 0, false); p.rotation.y = ry + (rnd() - 0.5) * 0.15; }
}
export function notebook(parent, x, y, z, ry, color) {
  const n = rbox(parent, 0.15, 0.015, 0.21, std(color, { roughness: 0.8 }), x, y + 0.0075, z, 0.003); n.rotation.y = ry;
  const pen = cyl(parent, 0.004, 0.004, 0.14, black(), x + 0.1, y + 0.005, z, 6); pen.rotation.set(Math.PI / 2, 0, ry + 0.3);
}
export function plant(parent, x, z, s = 1, kind = "fig", potColor = "#e7e2d9") {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(g, 0.16, 0.12, 0.34, std(potColor, { roughness: 0.5 }), 0, 0.17, 0, 24);
  cyl(g, 0.15, 0.15, 0.01, std("#3b2a1e", { roughness: 1 }), 0, 0.335, 0, 24);
  const leafM = std(kind === "snake" ? "#3f6b3a" : "#2f6b3d", { roughness: 0.55, side: THREE.DoubleSide });
  if (kind === "snake") {
    for (let i = 0; i < 11; i++) { const a = i * 2.4, r = 0.03 + (i % 3) * 0.03; const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.55 + rnd() * 0.3), leafM); l.position.set(Math.cos(a) * r, 0.62, Math.sin(a) * r); l.rotation.set((rnd() - 0.5) * 0.25, a, (rnd() - 0.5) * 0.25); l.castShadow = !LOW; g.add(l); }
  } else {
    cyl(g, 0.012, 0.016, 1.0, std("#5a4433"), 0, 0.82, 0, 8);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39, yy = 0.65 + (i / 26) * 0.75, r = 0.08 + rnd() * 0.12;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6), leafM); l.scale.set(1, 0.12, 0.75);
      l.position.set(Math.cos(a) * r, yy, Math.sin(a) * r); l.rotation.set(rnd() * 0.6 - 0.3, -a, -0.5 + rnd() * 0.3); l.castShadow = !LOW; g.add(l);
    }
  }
  return g;
}
export function bookshelf(parent, x, z, ry, w = 1.2, h = 1.8, shelves = 5) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const wood = oak(), d = 0.32;
  for (const s of [-1, 1]) rbox(g, 0.025, h, d, wood, s * (w / 2 - 0.0125), h / 2, 0, 0.004);
  rbox(g, w, h, 0.012, std("#e9e6df"), 0, h / 2, -d / 2 + 0.006, 0, false);
  const books = mat("booksM", () => new THREE.MeshStandardMaterial({ map: TEX.books(), roughness: 0.8 }));
  for (let i = 0; i <= shelves; i++) {
    const y = 0.04 + i * (h - 0.06) / shelves; rbox(g, w - 0.05, 0.025, d, wood, 0, y, 0, 0.004);
    if (i < shelves) {
      const bh = (h - 0.06) / shelves - 0.06, bw = (w - 0.1) * (0.55 + rnd() * 0.4);
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d - 0.06), [books, books, std("#e8e2d4"), std("#e8e2d4"), books, books]);
      b.position.set(-(w - 0.1) / 2 + bw / 2 + rnd() * ((w - 0.1) - bw), y + 0.013 + bh / 2, 0.01); b.castShadow = !LOW; g.add(b);
    }
  }
  return g;
}
export function framedArt(parent, x, y, z, ry, seed, w = 0.6, h = 0.75) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  rbox(g, w, h, 0.03, black(), 0, 0, 0, 0.004);
  plane(g, w - 0.08, h - 0.08, std("#ffffff", { roughness: 0.9 }), 0, 0, 0.016);
  plane(g, w - 0.16, h - 0.16, new THREE.MeshStandardMaterial({ map: TEX.art(seed), roughness: 0.8 }), 0, 0, 0.017);
  return g;
}
