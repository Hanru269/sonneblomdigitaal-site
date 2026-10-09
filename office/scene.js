// Sonneblom AI Works office v2 (2026-10-09): compact modern office, one personalised cubicle per AI employee,
// ChiefBot in a glass corner office. PBR materials + environment reflections + soft shadows + bloom.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const W = 8, D = 6, H = 3.1; // half width, half depth, ceiling height (16 m x 12 m room)
const LOW = matchMedia("(pointer: coarse)").matches;

export function setup(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#cfe6f5");
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 80);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.4, 0.96);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth / 2, innerHeight / 2);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 78 : 66;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize); resize();
  return { renderer, scene, camera, composer };
}

// ---------- procedural textures ----------
function canvasTex(w, h, draw, repeat = [1, 1], color = true) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const noise = (g, w, h, base, amp, n = 9000, size = 2) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * amp; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v)})`; g.fillRect(Math.random() * w, Math.random() * h, size, size); }
};
export const TEX = {
  carpet: () => canvasTex(256, 256, (g, w, h) => {
    noise(g, w, h, "#4a5262", 0.18, 14000, 2);
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h); // carpet tile seams
  }, [8, 6]),
  wood: () => canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = "#b9854f"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(80,40,10,${0.05 + Math.random() * 0.12})`; g.fillRect(0, y, w, 1 + Math.random()); }
    for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(90,45,15,.25)"; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 50, 6, 0, 0, 7); g.stroke(); }
  }),
  fabric: (hex) => canvasTex(128, 128, (g, w, h) => {
    noise(g, w, h, hex, 0.12, 6000, 1);
    g.fillStyle = "rgba(255,255,255,.035)"; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  }, [2, 1]),
  plaster: () => canvasTex(256, 256, (g, w, h) => noise(g, w, h, "#eceae6", 0.05, 8000, 2), [4, 2]),
  ceiling: () => canvasTex(256, 256, (g, w, h) => {
    noise(g, w, h, "#f2f2f0", 0.05, 4000, 2);
    g.strokeStyle = "#c9c9c6"; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  }, [10, 8]),
  sky: () => canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#7fb8e6"); gr.addColorStop(0.65, "#d9ecf7"); gr.addColorStop(1, "#c4ccd2");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 55; i++) { // soft distant skyline
      const bw = 20 + Math.random() * 60, bh = 60 + Math.random() * 230, x = Math.random() * w;
      g.fillStyle = `rgba(${90 + Math.random() * 40},${105 + Math.random() * 40},${125 + Math.random() * 40},${0.35 + Math.random() * 0.3})`;
      g.fillRect(x, h - bh - 40, bw, bh + 40);
    }
    g.fillStyle = "rgba(80,110,70,.5)"; for (let i = 0; i < 80; i++) { g.beginPath(); g.arc(Math.random() * w, h - 30 + Math.random() * 20, 10 + Math.random() * 18, 0, 7); g.fill(); }
  }, [1, 1]),
};

// ---------- materials ----------
const M = {};
export const mat = (key, make) => (M[key] ||= make());
export const std = (color, o = {}) => mat("s" + color + JSON.stringify(o), () => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o }));
export const glow = (color, k = 2.2) => mat("g" + color + k, () => new THREE.MeshStandardMaterial({ color: "#000", emissive: color, emissiveIntensity: k }));

// ---------- mesh helpers ----------
export function rbox(parent, w, h, d, m, x, y, z, r = 0.02, cast = true) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), m);
  mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function cyl(parent, rt, rb, h, m, x, y, z, seg = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function labelTex(text, { w = 512, h = 128, bg = null, fg = "#fff", font = "600 64px Inter, Segoe UI, sans-serif", glowC = null } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, h / 2); g.fill(); }
    g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = fg;
    if (glowC) { g.shadowColor = glowC; g.shadowBlur = 18; }
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// ---------- furniture ----------
export function chair(parent, x, z, ry, color = "#2b2f3a") {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const seat = std(color, { roughness: 0.85 }), metal = std("#9aa3ad", { metalness: 0.9, roughness: 0.25 });
  rbox(g, 0.5, 0.08, 0.48, seat, 0, 0.47, 0, 0.04);
  rbox(g, 0.48, 0.55, 0.07, seat, 0, 0.8, 0.23, 0.04);
  cyl(g, 0.03, 0.03, 0.36, metal, 0, 0.27, 0);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = rbox(g, 0.32, 0.03, 0.04, metal, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15, 0.01); leg.rotation.y = -a; }
  return g;
}
export function monitor(parent, x, y, z, ry, screenColor) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const dark = std("#1b1d22", { roughness: 0.35, metalness: 0.4 });
  rbox(g, 0.62, 0.38, 0.03, dark, 0, 0.32, 0, 0.012);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), glow(screenColor, 0.9)); s.position.set(0, 0.32, 0.017); g.add(s);
  cyl(g, 0.015, 0.015, 0.14, dark, 0, 0.1, -0.02); rbox(g, 0.2, 0.015, 0.14, dark, 0, 0.008, -0.02, 0.006);
  return g;
}
export function plant(parent, x, z, s = 1, potColor = "#e9e4dc") {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(g, 0.17, 0.13, 0.36, std(potColor, { roughness: 0.4 }), 0, 0.18, 0);
  const leaf = std("#2f7d4a", { roughness: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), leaf); l.scale.set(0.45, 1.6, 0.18);
    const a = i * 2.4, r = 0.05 + (i % 4) * 0.03;
    l.position.set(Math.cos(a) * r, 0.5 + (i % 5) * 0.09, Math.sin(a) * r); l.rotation.set(Math.cos(a) * 0.6, a, Math.sin(a) * 0.6);
    l.castShadow = true; g.add(l);
  }
  return g;
}
