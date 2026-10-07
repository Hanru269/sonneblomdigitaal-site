import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const $ = s => document.querySelector(s);
const KEY = "hq-pass";
const API = "";
const MOBILE = matchMedia("(max-width: 700px)").matches || "ontouchstart" in window;
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const usd = n => "R" + Math.round(n || 0).toLocaleString("en-US");
const num = n => (n ?? 0).toLocaleString("en-US");
const ago = ts => { const m = Math.round((Date.now() - new Date(ts)) / 60000); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const isToday = ts => new Date(ts).toDateString() === new Date().toDateString();
let PW = null, D = null, M = null, svc = null;
const DEMO = !!window.CITY_DEMO;  // public demo (/city-tour/city/): sample numbers from demo.json, no password, no private links
const scrub = t => t;

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decrypt(pw) {
  if (DEMO) {  // sample data; sales marked {ago: minutes} are moved to 'today' so the money beams light up
    const d = await (await fetch("demo.json?t=" + Date.now(), { cache: "no-store" })).json();
    return d;
  }
  const enc = await (await fetch("../data.enc.json?t=" + Date.now(), { cache: "no-store" })).json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(enc.salt), iterations: enc.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.ct))));
}

function model(D) {
  const s = D.snapshot, f = s.firm || {};
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const sv = f.sars || {}, ci = f.cipc || {}, uf = f.ufiling || {}, dl = f.labour || {}, wh = f.warehouse || {}, bi = f.billing || {},
    ad = f.ads || {}, bk = f.bank || {}, hr = f.hr || [], fs = f.fs || {};
  const left = Math.max(0, 100 - pct(wh.used, wh.capacity));
  const staff = (s.staff || {}).staff || [];
  const person = id => staff.find(x => x.id === id) || {};
  const perf = id => hr.find(x => x.id === id) || {};
  const caseRows = xs => (xs || []).map(x => [`${x.client} · ${x.type}`, `${x.status}${x.due ? " · due " + x.due : ""}`]);
  const home = (id, pos, color, big) => {
    const p = person(id), h = perf(id), title = p.title || "";
    return { id: "home_" + id, name: `${p.name}'s home`, short: (p.name || "").toUpperCase(), icon: "🏠", color, pos, w: big ? 7 : 6, d: big ? 7 : 6, h: big ? 7 : 5.5, kind: "house",
      status: "ok", today: 0, total: 0,
      tag: [title, p.status === "working" ? "at the office" : p.status],
      board: { title: `${(p.name || "").toUpperCase()} · ${title.toUpperCase()}`, main: h.score != null ? h.score + "/100" : title, mainLabel: h.score != null ? "HR Bot score this month" : "role",
        rows: [["Status", p.status || "–"], ["Now", p.now || "–"], ...(h.fs != null ? [["FS done", h.fs], ["Sendbacks", h.sendbacks]] : [["Tasks today", h.tasks ?? "–"]])] },
      sheet: () => sheetHTML(`${p.name}'s home`, `${title} · ${p.job || ""}`, h.score != null ? h.score + "/100" : title, h.score != null ? "HR Bot score this month" : "role",
        [["Status", p.status], ["Working on", p.now || "–"], ...(h.fs != null ? [["Financial statements", h.fs], ["Sent back by Director", h.sendbacks], ["Accuracy", h.accuracy + "%"],
          ["Bank statements", h.bank], ["SARS cases closed", h.sars]] : [["Tasks done today", h.tasks ?? "–"], ["Calls / clients helped", h.calls ?? "–"]])],
        [], "", `${p.name} lives here. The little lights show when they're logged in at the office.`) };
  };
  const B = [
    { id: "sars", name: "SARS eFiling", short: "SARS", icon: "🦁", color: 0x1f8a4c, pos: [-25, 6], w: 14, d: 10, h: 11, kind: "market", status: "ok", today: 0, total: 0,
      tag: [`${sv.audits_open} audits open`, `${sv.verif_open} verifications`],
      board: { title: "SARS EFILING", main: String(sv.audits_open + sv.verif_open), mainLabel: "audits + verifications open",
        rows: [["Audits open", sv.audits_open], ["Verifications open", sv.verif_open], ["Due this week", sv.due_week], ["Closed this month", sv.closed_month], ["Returns filed (month)", sv.returns_filed]] },
      sheet: () => sheetHTML("SARS eFiling", "Income tax, VAT, PAYE and provisional tax · audits and verifications per client", sv.audits_open + sv.verif_open, "SARS cases open",
        [["Audits open", sv.audits_open], ["Verifications open", sv.verif_open], ["Due this week", sv.due_week], ["Closed this month", sv.closed_month], ["Returns filed (month)", sv.returns_filed], ["Assessments received", sv.assessments]],
        caseRows(sv.cases), "Open SARS cases", "", "Employees upload the supporting documents per case; the Director signs off before submission.") },
    { id: "cipc", name: "CIPC", short: "CIPC", icon: "🏛️", color: 0x2b6cb0, pos: [25, 6], w: 11, d: 9, h: 9, kind: "market", status: "ok", today: 0, total: 0,
      tag: [`${ci.ar_due} annual returns due`, `${ci.bo_due} BO filings`],
      board: { title: "CIPC", main: String(ci.ar_due), mainLabel: "annual returns due (60 days)",
        rows: [["Beneficial ownership due", ci.bo_due], ["New registrations", ci.registrations], ["Director changes", ci.changes], ["Filed this month", ci.filed_month]] },
      sheet: () => sheetHTML("CIPC", "Company registrations, annual returns, beneficial ownership, director changes", ci.ar_due, "annual returns due",
        [["Beneficial ownership due", ci.bo_due], ["New registrations", ci.registrations], ["Director changes", ci.changes], ["Filed this month", ci.filed_month], ["Deregistration risk", ci.at_risk]],
        caseRows(ci.items), "Coming up", "") },
    { id: "ufiling", name: "uFiling · UI-19 Bot", short: "UFILING", icon: "🤖", color: 0x7c3aed, pos: [0, 32], w: 9, d: 7, h: 7, kind: "dome", status: "ok", today: 0, total: 0,
      tag: [`${uf.ui19_month} UI-19s this month`, `${uf.declared}/${uf.clients} declared`],
      board: { title: "UFILING · UI-19 BOT", main: String(uf.ui19_month), mainLabel: "UI-19s generated + stored this month",
        rows: [["Clients on uFiling", uf.clients], ["Declarations done", `${uf.declared}/${uf.clients}`], ["Due by", uf.due], ["Salary files read", uf.payrolls]] },
      sheet: () => sheetHTML("uFiling · UI-19 Bot", "The bot reads each client's monthly salary data, generates the UI-19 per employee, stores it in the client file and prepares the uFiling declaration.", uf.ui19_month, "UI-19s generated this month",
        [["Clients on uFiling", uf.clients], ["Declarations done", `${uf.declared}/${uf.clients}`], ["Employees covered", uf.employees], ["Salary files read", uf.payrolls], ["Errors flagged", uf.errors], ["Due by", uf.due]],
        (uf.latest || []).map(x => [x.client, `${x.n} UI-19s · ${x.when}`]), "Latest runs", "", "Flagged files (missing ID numbers, odd salary jumps) go to Admin before anything is submitted.") },
    { id: "labour", name: "Department of Labour", short: "LABOUR", icon: "⚖️", color: 0xd97706, pos: [-28, 46], w: 9, d: 8, h: 16, kind: "glass", status: "ok", today: 0, total: 0,
      tag: [`${dl.roe_due} ROEs due`, `${dl.lgs} good standing letters`],
      board: { title: "DEPT OF LABOUR", main: String(dl.roe_due), mainLabel: "COIDA Returns of Earnings due",
        rows: [["Letters of good standing", dl.lgs], ["UIF compliance checks", dl.uif_checks], ["Inspections booked", dl.inspections], ["Filed this month", dl.filed_month]] },
      sheet: () => sheetHTML("Department of Labour", "COIDA Return of Earnings, letters of good standing, UIF compliance", dl.roe_due, "ROEs due",
        [["Letters of good standing", dl.lgs], ["UIF compliance checks", dl.uif_checks], ["Inspections booked", dl.inspections], ["Filed this month", dl.filed_month]],
        caseRows(dl.items), "Coming up", "") },
    { id: "warehouse", name: "Document Warehouse", short: "WAREHOUSE", icon: "📦", color: 0x0ea5e9, pos: [28, 46], w: 12, d: 9, h: 8, kind: "warehouse", status: left < 20 ? "stale" : "ok", today: 0, total: 0, fill: pct(wh.used, wh.capacity) / 100,
      tag: [`${left}% storage left`, `${wh.used}/${wh.capacity} boxes`],
      board: { title: "WAREHOUSE", main: left + "%", mainLabel: "storage left",
        rows: [["Boxes stored", `${wh.used} / ${wh.capacity}`], ["Added this month", wh.added_month], ["Due for shredding", wh.shred], ["Full in about", wh.months_left + " months"]] },
      sheet: () => sheetHTML("Document Warehouse", "Client files kept for the legal 5 years, then shredded", left + "%", "storage left",
        [["Boxes stored", `${wh.used} / ${wh.capacity}`], ["Full", pct(wh.used, wh.capacity) + "%"], ["Added this month", wh.added_month], ["Due for shredding", wh.shred], ["Full in about", wh.months_left + " months"], ["Scanned to cloud", wh.scanned + "%"]],
        (wh.by_year || []).map(x => [x.year, `${x.boxes} boxes`]), "Boxes by year", "", "Shredding the boxes older than 5 years frees space before the warehouse is full.") },
    { id: "billing", name: "Billing", short: "BILLING", icon: "🧾", color: 0xeab308, pos: [-28, -36], w: 7, d: 7, h: 14, kind: "coin", status: "ok", today: bi.paid_today || 0, total: bi.paid_month || 0,
      tag: [`R${num(bi.outstanding)} outstanding`, `${bi.overdue} overdue`],
      board: { title: "CLIENT BILLING", main: "R" + num(bi.invoiced_month), mainLabel: "invoiced this month",
        rows: [["Paid this month", "R" + num(bi.paid_month)], ["Outstanding", "R" + num(bi.outstanding)], ["Overdue 60+ days", bi.overdue], ["Invoices sent", bi.invoices]] },
      sheet: () => sheetHTML("Billing", "Monthly retainers, once-off work and disbursements per client", "R" + num(bi.invoiced_month), "invoiced this month",
        [["Paid this month", "R" + num(bi.paid_month)], ["Paid today", "R" + num(bi.paid_today)], ["Outstanding", "R" + num(bi.outstanding)], ["Overdue 60+ days", bi.overdue], ["Invoices sent", bi.invoices], ["Retainer clients", bi.retainers]],
        (bi.debtors || []).map(x => [x.client, `R${num(x.amount)} · ${x.days} days`]), "Biggest debtors", "") },
    { id: "bank", name: "Bank Statement Centre", short: "BANK STATEMENTS", icon: "🏦", color: 0x10b981, pos: [28, -36], w: 9, d: 7, h: 12, kind: "rnd", status: "ok", today: 0, total: 0,
      tag: [`${bk.processed_today} processed today`, `${bk.pending} waiting`],
      board: { title: "BANK STATEMENTS", main: String(bk.processed_month), mainLabel: "statements processed this month",
        rows: [["Today", bk.processed_today], ["Waiting", bk.pending], ["Transactions coded", num(bk.transactions)], ["Auto-coded", bk.auto + "%"]] },
      sheet: () => sheetHTML("Bank Statement Centre", "Employees capture and allocate client bank statements for the books and the financial statements", bk.processed_month, "statements processed this month",
        [["Processed today", bk.processed_today], ["Waiting", bk.pending], ["Transactions coded", num(bk.transactions)], ["Auto-coded by rules", bk.auto + "%"], ["Queries to clients", bk.queries]],
        (bk.queue || []).map(x => [x.client, `${x.months} · ${x.who}`]), "In progress", "") },
    { id: "fsreview", name: "Director's Review Office", short: "FS REVIEW", icon: "✅", color: 0x22c55e, pos: [60, 24], w: 6, d: 6, h: 18, kind: "glass", status: "ok", today: 0, total: 0,
      tag: [`${fs.waiting} waiting for review`, `${fs.sent_back} sent back`],
      board: { title: "FS REVIEW", main: String(fs.approved_month), mainLabel: "financial statements approved (month)",
        rows: [["Waiting for Director", fs.waiting], ["Sent back (month)", fs.sent_back], ["First-time right", pct(fs.approved_month - fs.sent_back, fs.approved_month) + "%"]] },
      sheet: () => sheetHTML("Director's Review Office", "Every set of financial statements is reviewed by the Director. Wrong ones go back to the preparer; fewer sendbacks = better work.", fs.approved_month, "approved this month",
        [["Waiting for review", fs.waiting], ["Sent back this month", fs.sent_back], ["First-time right", pct(fs.approved_month - fs.sent_back, fs.approved_month) + "%"]],
        (fs.recent || []).map(x => [`${x.client} · ${x.who}`, x.result]), "Latest reviews", "") },
    { id: "hrbot", name: "HR Bot", short: "HR BOT", icon: "📊", color: 0xec4899, pos: [60, 48], w: 8, d: 8, h: 14, kind: "git", status: "ok", today: 0, total: 0,
      tag: [`top: ${(hr.filter(x => x.fs != null).sort((a, b) => b.score - a.score)[0] || {}).name || "–"}`, "output × accuracy"],
      board: { title: "HR BOT", main: (hr.filter(x => x.fs != null).sort((a, b) => b.score - a.score)[0] || {}).name || "–", mainLabel: "best performer this month",
        rows: hr.filter(x => x.fs != null).sort((a, b) => b.score - a.score).map(x => [x.name, `${x.score} · ${x.sendbacks} sendbacks`]) },
      sheet: () => sheetHTML("HR Bot", "Scores each employee on real output (financial statements, bank statements, SARS cases) and accuracy (Director sendbacks). Few sendbacks = high accuracy.",
        (hr.filter(x => x.fs != null).sort((a, b) => b.score - a.score)[0] || {}).name || "–", "best performer this month",
        hr.filter(x => x.fs != null).map(x => [x.name, `${x.score}/100`]),
        hr.filter(x => x.fs != null).sort((a, b) => b.score - a.score).map(x => [`${x.name}: ${x.fs} FS · ${x.bank} bank · ${x.sars} SARS`, `${x.sendbacks} sendbacks · ${x.accuracy}% right`]),
        "Ranking (output · accuracy)", "", "Score = output volume (weighted by job size) × first-time-right rate. Updated every time the Director approves or sends back a file.") },
    { id: "ads", name: "Ads & Website", short: "ADS & WEB", icon: "📣", color: 0x3b82f6, pos: [-60, -44], w: 10, d: 10, h: 26, kind: "media", status: "ok", today: 0, total: 0,
      tag: [`${num(ad.visits_month)} site visits`, `${ad.leads_month} new enquiries`],
      board: { title: "ADS & WEBSITE", main: String(ad.leads_month), mainLabel: "new client enquiries this month",
        rows: [["Website visits", num(ad.visits_month)], ["Facebook followers", num(ad.fb)], ["LinkedIn followers", num(ad.li)], ["Posts this week", ad.posts_week], ["Ad spend", "R" + num(ad.spend)]] },
      sheet: () => sheetHTML("Ads & Website", "Website, Google Business profile and social media", ad.leads_month, "new client enquiries this month",
        [["Website visits", num(ad.visits_month)], ["Facebook followers", num(ad.fb)], ["LinkedIn followers", num(ad.li)], ["Google reviews", `${ad.reviews} (${ad.stars}★)`], ["Posts this week", ad.posts_week], ["Ad spend (month)", "R" + num(ad.spend)]],
        (ad.posts || []).map(x => [x.text, x.stat]), "Latest posts", "") },
    home("dir", [-60, -14], 0xf59e0b, true), home("adm", [-60, 16], 0xa78bfa), home("rec", [-60, 46], 0xf472b6),
    home("e1", [60, -48], 0x34d399), home("e2", [60, -24], 0x60a5fa), home("e3", [60, 0], 0xfb923c),
    { id: "library", name: "The Library", short: "LIBRARY", icon: "📚", color: 0xe8a87c, pos: [0, -66], w: 20, d: 12, h: 12, kind: "library", status: "ok", today: 0, total: 0,
      tag: ["Claude", "tap to talk"],
      board: { title: "THE LIBRARY", main: "CLAUDE", mainLabel: "the firm's AI assistant", rows: [["Bots looked after", 2], ["Data", ago(s.ts)]] },
      sheet: () => sheetHTML("The Library", "Where the Director talks to Claude from inside the city", "Claude", "AI assistant",
        [["Model", "Claude (Claude Code)"], ["Runs on", "the firm's server, 24/7"], ["Can", "read data, run the bots, update the city"]], [], "",
        "In the live version this opens a chat with Claude. Ask things like \"Which clients have SARS audits due this week?\" or \"Generate this month's UI-19s for all payroll clients\" and Claude does it.") },
  ];
  const day = bi.paid_today || 0, tot = bi.paid_month || 0;
  return { flow: { clicks: ad.leads_month, views: ad.visits_month, ads: 1 }, working: D.working || [], B, s, tot, day, feeZar: 0, sales: bi.invoices || 0 };
}
const svLabel = n => !svc ? "unknown" : svc[n] === "active" ? "🟢 running" : "🔴 " + (svc[n] || "down");

const LINKS = {};
const ACTIONS = {};
const actionsHTML = id => DEMO || !ACTIONS[id] ? "" : `<div class="links acts2"><div class="lt">Quick actions · Claude does it in the Library</div>${ACTIONS[id](M.s).map(([t, p]) => `<button class="ask" data-p="${esc(p)}">${esc(t)}</button>`).join("")}</div>`;
async function ask(msg) {
  await openTerm();
  $("#tin").value = msg; $("#tin").dispatchEvent(new Event("input"));
  if ($("#tsend").disabled || !get(LKEY)) return;  // Library login first: the task waits in the box
  $("#tform").requestSubmit();
}
const linksHTML = id => !DEMO && (LINKS[id] || []).length ? `<div class="links"><div class="lt">Quick links</div>${LINKS[id].map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join("")}</div>` : "";

function funnelHTML(f) {
  if (DEMO || !f.steps) return "";
  const pct = r => r == null ? "–" : (r * 100 < 10 ? (r * 100).toFixed(1) : Math.round(r * 100)) + "%";
  const a = f.ads || {}, p = f.page || {}, t = f.today || {}, src = f.sources || {};
  const rows = f.steps.map(x => {
    const bad = x.name === f.bottleneck, ok = x.rate != null && x.rate >= x.norm;
    return `<div${bad ? ' style="color:#ff6b6b;font-weight:700"' : ""}><span>${bad ? "🚧" : x.rate == null ? "⚪" : ok ? "🟢" : "🟠"} ${esc(x.name)}</span><span>${num(x.to)}/${num(x.from)} · ${pct(x.rate)} <i style="opacity:.6">(normal ${pct(x.norm)})</i></span></div>`;
  }).join("");
  return `<div class="list"><div style="color:var(--dim);font-size:12px"><span>Sales funnel since tracking started</span></div>${rows}</div>
    <div class="note"><b>${esc(f.verdict || "")}</b><br>Ad: ${num(a.impressions)} views · ${num(a.clicks)} clicks · R${(a.spend || 0).toFixed(2)} spent${a.active ? " · 🟢 running" : ""}
    <br>Last 24 h: ${num(t.visits)} visits · ${num(t.plans)} saw prices · ${num(t.plan)} plan taps · ${num(t.pay)} pay taps
    <br>Visitors from: ad ${num(src.ad || 0)} · social ${num(src.social || 0)} · direct ${num(src.direct || 0)} · other ${num(src.other || 0)}
    <br>Checkouts opened: ${num(p.checkouts)} · Paid: ${num(p.paid)} (${usd(p.revenue_usd || 0)})</div>`;
}

function sheetHTML(title, sub, big, bigLabel, kvs, list, listTitle, link, note) {
  if (DEMO) link = "";
  return scrub(`<h2>${esc(title)}</h2><div class="sub">${esc(sub)}</div>
    <div class="big">${typeof big === "number" && bigLabel.includes("revenue") ? usd(big) : esc(typeof big === "number" ? num(big) : big)}<small>${esc(bigLabel)}</small></div>
    <div class="grid">${kvs.map(([k, v]) => `<div class="kv"><b>${esc(v ?? "–")}</b><span>${esc(k)}</span></div>`).join("")}</div>
    ${list.length ? `<div class="list"><div style="color:var(--dim);font-size:12px"><span>${esc(listTitle)}</span></div>${list.map(([a, b]) => `<div><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join("")}</div>` : ""}
    ${note ? `<div class="note">${note}</div>` : ""}
    ${link ? `<a class="go" href="${link}" target="_blank" rel="noopener">Open ↗</a>` : ""}`);
}

function windowTex(color, lit = 0.55, seed = 1) {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128;
  const g = c.getContext("2d"); g.fillStyle = "#0d0726"; g.fillRect(0, 0, 64, 128);
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) {
    if (rnd() < lit) { g.fillStyle = rnd() < 0.15 ? color : rnd() < 0.5 ? "#ffe9b0" : "#fff6dc"; g.fillRect(x, y, 4, 5); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
const hex = c => "#" + c.toString(16).padStart(6, "0");

function boardTex(b) {
  const c = document.createElement("canvas"); c.width = 2048; c.height = 1200;  // drawn at 2x for sharp billboards
  const g = c.getContext("2d"); g.setTransform(2, 0, 0, 2, 0, 0); paintBoard(g, b);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
function paintBoard(g, b) {
  const W = 1024, H = 600, col = hex(b.color);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#160a3c"); grd.addColorStop(1, "#07031a");
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.strokeStyle = col; g.lineWidth = 10; g.shadowColor = col; g.shadowBlur = 30; g.strokeRect(12, 12, W - 24, H - 24); g.shadowBlur = 0;
  g.fillStyle = col; g.font = "800 54px Sora"; g.fillText(b.board.title, 48, 92);
  const dot = { ok: "#3dffa8", down: "#ff4d6d", stale: "#ffd166", unknown: "#7d74a8" }[b.status];
  g.fillStyle = dot; g.beginPath(); g.arc(W - 70, 74, 18, 0, 7); g.fill();
  g.fillStyle = "#3dffa8"; g.font = "800 132px Sora"; g.shadowColor = "#3dffa8"; g.shadowBlur = 24;
  let main = String(b.board.main); g.fillText(main, 48, 250, W - 96); g.shadowBlur = 0;
  g.fillStyle = "#a99cd6"; g.font = "600 34px Inter"; g.fillText(scrub(b.board.mainLabel), 52, 300);
  const rows = b.board.rows.slice(0, 6);
  rows.forEach(([k, v], i) => {
    const x = 48 + (i % 2) * 480, y = 380 + Math.floor(i / 2) * 76;
    g.fillStyle = "#a99cd6"; g.font = "600 30px Inter"; g.fillText(scrub(k), x, y);
    g.fillStyle = "#ffffff"; g.font = "800 40px Sora"; g.fillText(String(v), x + 230, y, 220);
  });
}

let renderer, scene, camera, controls, labels, composer, bloom, clock = new THREE.Clock();
const picks = [], anim = [], groups = {};
let flight = null;

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.body.prepend(renderer.domElement);
  labels = new CSS2DRenderer(); labels.setSize(innerWidth, innerHeight);
  Object.assign(labels.domElement.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: 5 });
  document.body.append(labels.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0420);
  scene.fog = new THREE.FogExp2(0x1a0b3a, 0.0042);
  camera = new THREE.PerspectiveCamera(MOBILE ? 58 : 48, innerWidth / innerHeight, 0.5, 900);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 6, maxDistance: 380, maxPolarAngle: 1.47,
    screenSpacePanning: false, zoomSpeed: 1.1, rotateSpeed: 0.7 });
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  home(true);

  scene.add(new THREE.HemisphereLight(0x9c7bff, 0x10052a, 0.9));
  const moon = new THREE.DirectionalLight(0xc9b8ff, 0.8); moon.position.set(-40, 80, 30); scene.add(moon);

  const pr = renderer.getPixelRatio();
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, samples: MOBILE ? 2 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.45, 0.82);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  addrEventListeners();
}

const PARK = 78;                       // office park half-size: our buildings live inside it
const STREETS = [84];                  // one ring road round the park (both signs), 10 wide; no outer city blocks
const EXT = 100;                       // city edge
const VAULT = [0, 6];                  // the Vault in the middle of the market square
const POOL = [-5, 5, -54, -16];        // reflecting pool x0, x1, z0, z1 (in front of the Library)
const PLAZA = [-36, 36, -6, 20];       // paved market square round the Vault
const NEON = [0xff2bd6, 0x00f0ff, 0xfff200, 0xff3b6b, 0x8b5cf6, 0x22ff88, 0xff8a00];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const towers = [];                     // outer city towers {x,z,w,d,h} (street-mode collisions)

function ground() {
  towers.length = 0;
  const lines = STREETS.flatMap(v => [-v, v]).sort((a, b) => a - b);
  const d = new THREE.Object3D(), col = new THREE.Color();
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(EXT * 2 + 260, EXT * 2 + 260), new THREE.MeshStandardMaterial({ color: 0x0b0716, roughness: 0.28, metalness: 0.6 }));
  asphalt.rotation.x = -Math.PI / 2; scene.add(asphalt);
  const grass = new THREE.Mesh(new THREE.BoxGeometry(PARK * 2, 0.3, PARK * 2), new THREE.MeshStandardMaterial({ color: 0x1d6b3c, emissive: 0x06301a, roughness: 0.95 }));
  grass.position.y = 0.15; scene.add(grass);
  const kerb = neonEdges(new THREE.BoxGeometry(PARK * 2 + 0.4, 0.32, PARK * 2 + 0.4), 0x22ff88); kerb.position.y = 0.16; scene.add(kerb);

  const slabs = [], screens = [];
  for (let i = 0; i < lines.length - 1; i++) for (let j = 0; j < lines.length - 1; j++) {
    const x0 = lines[i] + 5, x1 = lines[i + 1] - 5, z0 = lines[j] + 5, z1 = lines[j + 1] - 5;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, Dp = z1 - z0;
    if (Math.abs(cx) < 1 && Math.abs(cz) < 1) continue;  // the park
    slabs.push([cx, cz, W, Dp]);
    const square = (Math.abs(cx) < 1 || Math.abs(cz) < 1) && Math.max(Math.abs(cx), Math.abs(cz)) < 90;
    const far = Math.max(Math.abs(cx), Math.abs(cz));
    if (square) {  // a row of towers whose park-facing walls carry big screens
      const alongX = Math.abs(cx) < 1, len = alongX ? W : Dp, n = MOBILE ? 5 : 6, step = len / n;
      const face = alongX ? -Math.sign(cz) : -Math.sign(cx);   // direction towards the park
      for (let k = 0; k < n; k++) {
        const s = -len / 2 + step * (k + 0.5), w = step - 2.4, dd = (alongX ? Dp : W) - 6, h = rnd(26, 52);
        const x = alongX ? s : cx, z = alongX ? cz : s;
        towers.push({ x, z, w: alongX ? w : dd, d: alongX ? dd : w, h, square: true });
        const sw = w * 0.86, sh = Math.min(sw * 0.62, h - 10), y = h - sh / 2 - rnd(2, 6);
        const off = dd / 2 + 0.25;
        screens.push({ x: alongX ? x : x + face * off, z: alongX ? z + face * off : z, y, w: sw, h: sh, ry: alongX ? (face > 0 ? 0 : Math.PI) : (face > 0 ? Math.PI / 2 : -Math.PI / 2) });
      }
    } else {  // 2x2 lots of cyberpunk towers, taller further out
      for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (Math.random() < 0.12) continue;  // the odd empty lot
        const lw = W / 2, ld = Dp / 2, w = rnd(lw * 0.55, lw - 2.5), dd = rnd(ld * 0.55, ld - 2.5);
        const axis = Math.abs(cx) < 1 || Math.abs(cz) < 1;   // blocks in line with the park stay lower so the view stays open
        const h = axis ? rnd(18, 42) : (far < 120 ? rnd(30, 75) : rnd(45, 125)) * (Math.random() < 0.1 ? 1.4 : 1);
        towers.push({ x: cx + fx * lw / 2, z: cz + fz * ld / 2, w, d: dd, h });
      }
    }
  }
  const slab = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshStandardMaterial({ color: 0x1b1530, roughness: 0.7 }), slabs.length);
  slabs.forEach(([x, z, w, dd], i) => { d.position.set(x, 0.15, z); d.scale.set(w, 1, dd); d.rotation.set(0, 0, 0); d.updateMatrix(); slab.setMatrixAt(i, d.matrix); });
  scene.add(slab);

  const mats = ["#c084fc", "#38bdf8", "#f472b6"].map((c, i) => { const t = windowTex(c, 0.42, i + 7); t.repeat.set(3, 8);
    return new THREE.MeshStandardMaterial({ color: 0x150d33, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.35, metalness: 0.4 }); });
  const box = new THREE.BoxGeometry(1, 1, 1);
  mats.forEach((mat, k) => {
    const mine = towers.filter((_, i) => i % 3 === k), inst = new THREE.InstancedMesh(box, mat, mine.length);
    mine.forEach((t, i) => { d.position.set(t.x, t.h / 2 + 0.3, t.z); d.scale.set(t.w, t.h, t.d); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); });
    scene.add(inst);
  });
  const strips = [];
  towers.forEach(t => {
    const c = pick(NEON);
    if (!t.square || Math.random() < 0.5) for (const [sx, sz] of [[-1, -1], [1, 1], [1, -1], [-1, 1]].slice(0, Math.random() < 0.5 ? 2 : 4))
      strips.push([t.x + sx * t.w / 2, t.h / 2 + 0.3, t.z + sz * t.d / 2, 0.22, t.h, 0.22, c]);
    strips.push([t.x, t.h - rnd(1, 4), t.z, t.w + 0.3, 0.35, t.d + 0.3, pick(NEON)]);
    if (Math.random() < 0.35) strips.push([t.x, t.h * rnd(0.3, 0.7), t.z, t.w + 0.3, 0.25, t.d + 0.3, c]);
    if (!t.square && t.h > 60 && Math.random() < 0.5) strips.push([t.x, t.h + 4, t.z, 0.25, 8, 0.25, 0xff3b6b]);  // antenna
  });
  const neon = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), strips.length);
  strips.forEach(([x, y, z, w, h, dd, c], i) => { d.position.set(x, y, z); d.scale.set(w, h, dd); d.updateMatrix(); neon.setMatrixAt(i, d.matrix); neon.setColorAt(i, col.set(c)); });
  scene.add(neon);
  towers.forEach(t => solids.push({ x: t.x, z: t.z, r: Math.min(t.w, t.d) / 2 + 0.8, h: t.h }));

  const dashes = [];
  for (const c of lines) for (let s = -EXT; s < EXT; s += 6) {
    if (lines.some(l => Math.abs(s + 1.5 - l) < 6)) continue;  // keep intersections clear
    dashes.push([s + 1.5, c, 0], [c, s + 1.5, 1]);
  }
  for (const c of [-STREETS[0], STREETS[0]]) for (const s of [0]) for (let k = -4; k <= 4; k += 1.1) dashes.push([s + k * 0 + 0, c + k, 2], [c + k, s, 3]);
  const mark = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.02, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), dashes.length);
  dashes.forEach(([x, z, t], i) => {
    d.position.set(x, 0.02, z); d.rotation.set(0, 0, 0);
    if (t === 0) d.scale.set(3, 1, 0.18); else if (t === 1) d.scale.set(0.18, 1, 3); else if (t === 2) d.scale.set(3.4, 1, 0.5); else d.scale.set(0.5, 1, 3.4);
    d.updateMatrix(); mark.setMatrixAt(i, d.matrix); mark.setColorAt(i, col.set(t < 2 ? 0xffd34d : 0xe8e8ff));
  });
  scene.add(mark);

  const L = [], gap = MOBILE ? 24 : 16;
  for (const c of lines) for (let s = -EXT + 8; s < EXT; s += gap) {
    if (lines.some(l => Math.abs(s - l) < 7)) continue;
    for (const side of [-1, 1]) { L.push([s, c + side * 5.4, 0, side]); L.push([c + side * 5.4, s, 1, side]); }
  }
  const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 5.2, 6), new THREE.MeshStandardMaterial({ color: 0x2b2550, metalness: 0.7, roughness: 0.4 }), L.length);
  const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 1.8), new THREE.MeshStandardMaterial({ color: 0x2b2550 }), L.length);
  const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.14, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), L.length);
  const lampCols = [0x00f0ff, 0xff2bd6, 0xffe2a8];
  L.forEach(([x, z, ax, side], i) => {
    const ry = ax === 0 ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(x, 2.6, z); d.updateMatrix(); post.setMatrixAt(i, d.matrix);
    d.rotation.set(0, ry, 0); d.position.set(x, 5.1, z); d.translateZ(0.9); d.updateMatrix(); arm.setMatrixAt(i, d.matrix);
    d.translateZ(0.7); d.position.y = 5.0; d.updateMatrix(); head.setMatrixAt(i, d.matrix); head.setColorAt(i, col.set(lampCols[i % 3]));
  });
  scene.add(post, arm, head);

  cars(lines); skyCars(); rain();

  const sp = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 + 0.25, R = 520; sp.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd8ccff, size: 1.2, fog: false })));
}

function cars(lines) {
  const lanes = [];
  for (const c of lines) for (const [ax, off, dir] of [[0, -2.4, 1], [0, 2.4, -1], [1, -2.4, -1], [1, 2.4, 1]]) lanes.push({ ax, c: c + off, dir, v: rnd(9, 17) });
  const N = MOBILE ? 72 : 150, list = [];
  for (let i = 0; i < N; i++) { const ln = lanes[i % lanes.length]; list.push({ ln, s: rnd(-EXT, EXT), v: ln.v * rnd(0.9, 1.1) }); }
  const part = (geo, mat, count) => { const m = new THREE.InstancedMesh(geo, mat, count); scene.add(m); return m; };
  const bodyCols = [0x1e1b4b, 0xfafafa, 0x111111, 0xb91c1c, 0x0ea5e9, 0xfacc15, 0x6d28d9, 0x9ca3af, 0x064e3b];
  const body = part(new THREE.BoxGeometry(1.9, 0.55, 4.3), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.28 }), N);
  const nose = part(new THREE.BoxGeometry(1.86, 0.3, 1.1), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.28 }), N);
  const cabin = part(new THREE.BoxGeometry(1.6, 0.5, 2.1), new THREE.MeshStandardMaterial({ color: 0x0a0f1f, metalness: 0.9, roughness: 0.1, emissive: 0x1b2a55, emissiveIntensity: 0.6 }), N);
  const wheel = part(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 }), N * 4);
  const hl = part(new THREE.BoxGeometry(0.45, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xf2f7ff, toneMapped: false }), N * 2);
  const tl = part(new THREE.BoxGeometry(1.7, 0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0xff1a3c, toneMapped: false }), N);
  const glow = part(new THREE.PlaneGeometry(2.3, 4.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), N);
  const col = new THREE.Color();
  list.forEach((c, i) => { body.setColorAt(i, col.set(bodyCols[i % bodyCols.length])); nose.setColorAt(i, col); glow.setColorAt(i, col.set(NEON[i % NEON.length])); });
  const loc = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const P = { body: loc(0, 0.62, 0), nose: loc(0, 0.45, 1.9), cabin: loc(0, 1.13, -0.35), tl: loc(0, 0.78, -2.17), glow: loc(0, 0.06, 0),
    w: [loc(-0.95, 0.36, 1.35), loc(0.95, 0.36, 1.35), loc(-0.95, 0.36, -1.35), loc(0.95, 0.36, -1.35)], hl: [loc(-0.6, 0.6, 2.46), loc(0.6, 0.6, 2.46)] };
  const m = new THREE.Matrix4(), tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const set = (inst, i, local) => inst.setMatrixAt(i, tmp.multiplyMatrices(m, local));
  anim.push(dt => {
    list.forEach((c, i) => {
      const ln = c.ln; c.s += c.v * ln.dir * dt;
      if (c.s > EXT) c.s = -EXT; else if (c.s < -EXT) c.s = EXT;
      if (ln.ax === 0) { pos.set(c.s, 0, ln.c); q.setFromAxisAngle(up, ln.dir > 0 ? Math.PI / 2 : -Math.PI / 2); }
      else { pos.set(ln.c, 0, c.s); q.setFromAxisAngle(up, ln.dir > 0 ? 0 : Math.PI); }
      m.compose(pos, q, one);
      set(body, i, P.body); set(nose, i, P.nose); set(cabin, i, P.cabin); set(tl, i, P.tl); set(glow, i, P.glow);
      P.w.forEach((w, k) => set(wheel, i * 4 + k, w)); P.hl.forEach((h, k) => set(hl, i * 2 + k, h));
    });
    for (const x of [body, nose, cabin, wheel, hl, tl, glow]) x.instanceMatrix.needsUpdate = true;
  });
}

function skyCars() {
  const N = MOBILE ? 10 : 22, list = [];
  for (let i = 0; i < N; i++) list.push({ ax: i % 2, c: pick(STREETS) * pick([-1, 1]) + rnd(-3, 3), y: rnd(30, 85), s: rnd(-EXT, EXT), v: rnd(22, 40) * pick([-1, 1]), ph: Math.random() * 6 });
  const hull = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.9, 3.2, 4, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9aa4c4, metalness: 0.85, roughness: 0.25 }), N);
  const ring = new THREE.InstancedMesh(new THREE.TorusGeometry(1.25, 0.12, 6, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N);
  const blink = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2040, toneMapped: false }), N);
  const col = new THREE.Color(); list.forEach((c, i) => ring.setColorAt(i, col.set(NEON[(i + 2) % NEON.length])));
  scene.add(hull, ring, blink);
  const d = new THREE.Object3D();
  anim.push((dt, t) => {
    list.forEach((c, i) => {
      c.s += c.v * dt; if (c.s > EXT + 40) c.s = -EXT - 40; else if (c.s < -EXT - 40) c.s = EXT + 40;
      const y = c.y + Math.sin(t * 0.8 + c.ph) * 1.2;
      if (c.ax === 0) { d.position.set(c.s, y, c.c); d.rotation.set(0, c.v > 0 ? Math.PI / 2 : -Math.PI / 2, Math.sin(t + c.ph) * 0.05); }
      else { d.position.set(c.c, y, c.s); d.rotation.set(0, c.v > 0 ? 0 : Math.PI, Math.sin(t + c.ph) * 0.05); }
      d.scale.setScalar(1); d.updateMatrix(); hull.setMatrixAt(i, d.matrix); ring.setMatrixAt(i, d.matrix);
      d.translateY(1); d.scale.setScalar((t * 2 + c.ph) % 1 < 0.15 ? 1.4 : 0.01); d.updateMatrix(); blink.setMatrixAt(i, d.matrix);
    });
    hull.instanceMatrix.needsUpdate = ring.instanceMatrix.needsUpdate = blink.instanceMatrix.needsUpdate = true;
  });
}

function slides() {
  const r = M.s.diary || {};
  return [{ color: 0x1f8a4c, status: "ok", board: { title: "ACCOUNTING CITY", main: usd(M.day), mainLabel: "fees collected today", rows: [["This month", usd(M.tot)], ["Invoices", num(M.sales)], ["Staff", ((M.s.staff || {}).staff || []).length], ["Buildings", M.B.length]] } },
    ...M.B.filter(b => b.board).map(b => ({ ...b, title: b.board.title }))];
}
function timesSquare(screens) {
  const S = slides(), cvs = [];
  screens.forEach((sc, i) => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 600;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sc.w, sc.h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    mesh.position.set(sc.x, sc.y, sc.z); mesh.rotation.y = sc.ry; scene.add(mesh);
    const frame = neonEdges(new THREE.PlaneGeometry(sc.w + 0.5, sc.h + 0.5), pick(NEON)); frame.position.copy(mesh.position); frame.rotation.y = sc.ry; scene.add(frame);
    cvs.push({ c, t, k: i % S.length });
    paint(c, t, S[i % S.length]);
  });
  const tc = document.createElement("canvas"); tc.width = 4096; tc.height = 128;
  const g = tc.getContext("2d"); g.scale(2, 2); g.fillStyle = "#05020f"; g.fillRect(0, 0, 2048, 64);
  const r = M.s.diary || {};
  const items = [`FEES TODAY ${usd(M.day)}`, `THIS MONTH ${usd(M.tot)}`, ...M.B.filter(b => b.tag).map(b => `${b.short} ${b.tag[0]}`)];
  g.font = "800 34px Sora"; g.fillStyle = "#ffd34d"; g.fillText(items.join("   ◆   ") + "   ◆   ", 10, 45, 2030);
  const tt = new THREE.CanvasTexture(tc); tt.wrapS = THREE.RepeatWrapping; tt.repeat.x = 0.35; tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = renderer.capabilities.getMaxAnisotropy();
  screens.forEach((sc, i) => { if (i % 2) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sc.w, 1.3), new THREE.MeshBasicMaterial({ map: tt, toneMapped: false }));
    m.position.set(sc.x, sc.y - sc.h / 2 - 1.2, sc.z); m.rotation.y = sc.ry; scene.add(m); });
  let next = 0, j = 0;
  anim.push((dt, t) => {
    tt.offset.x = (tt.offset.x + dt * 0.04) % 1;
    if (t > next && cvs.length) { next = t + 0.6; const s = cvs[j++ % cvs.length]; s.k = (s.k + 1) % S.length; paint(s.c, s.t, S[s.k]); }
  });
}
function paint(c, t, b) { const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); paintBoard(g, b); t.needsUpdate = true; }

function rain() {
  const N = MOBILE ? 900 : 2400, p = new Float32Array(N * 6), sp = [];
  for (let i = 0; i < N; i++) { const x = rnd(-70, 70), y = rnd(0, 60), z = rnd(-70, 70); p.set([x, y, z, x, y - 1.2, z], i * 6); sp.push(rnd(45, 65)); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: 0.28, depthWrite: false }));
  lines.userData.weather = true; scene.add(lines);
  anim.push(dt => {
    lines.position.set(Math.round(camera.position.x / 10) * 10, Math.max(0, camera.position.y - 40), Math.round(camera.position.z / 10) * 10);
    const W = SKIN.weather || {}, len = W.len ?? 1.2, f = W.speed ?? 1;
    if (!lines.visible) return;
    for (let i = 0; i < N; i++) { let y = p[i * 6 + 1] - sp[i] * f * dt; if (y < 0) y += 60; p[i * 6 + 1] = y; p[i * 6 + 4] = y - len; }
    geo.attributes.position.needsUpdate = true;
  });
}

function neonEdges(geo, color) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color }));
}

function tower(w, h, d, color, seed, lit) {
  const g = new THREE.Group(), geo = new THREE.BoxGeometry(w, h, d), t = windowTex(hex(color), lit, seed);
  t.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 6)));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1c1050, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.75, roughness: 0.5 }));
  m.position.y = h / 2; g.add(m);
  const e = neonEdges(geo, color); e.position.y = h / 2; g.add(e);
  return g;
}

function faceDir(b) {
  if (b.kind === "library") return new THREE.Vector3(0, 0, 1);
  if (Math.abs(b.pos[0]) > 40) return new THREE.Vector3(-Math.sign(b.pos[0]), 0, 0);
  return new THREE.Vector3(VAULT[0] - b.pos[0], 0, VAULT[1] - b.pos[1]).normalize();
}

function building(b) {
  const g = new THREE.Group(); g.position.set(b.pos[0], 0, b.pos[1]); g.userData.b = b;
  const c = b.color, lit = b.status === "down" ? 0.08 : 0.6;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(b.w * 0.95, b.w, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x24125e, emissive: c, emissiveIntensity: 0.25 }));
  plinth.position.y = 0.3; g.add(plinth);
  let top = b.h;
  if (b.kind === "mega") {  // stepped skyscraper with a crown
    const t1 = tower(b.w, b.h * 0.55, b.d, c, 11, lit); g.add(t1);
    const t2 = tower(b.w * 0.72, b.h * 0.3, b.d * 0.72, c, 12, lit); t2.position.y = b.h * 0.55; g.add(t2);
    const t3 = tower(b.w * 0.45, b.h * 0.15, b.d * 0.45, c, 13, lit); t3.position.y = b.h * 0.85; g.add(t3);
    [[-b.w * 0.9, 0.45], [b.w * 0.9, 0.35]].forEach(([x, k]) => { const s = tower(b.w * 0.5, b.h * k, b.d * 0.6, c, 14 + x, lit); s.position.x = x; g.add(s); });
  } else if (b.kind === "market") {  // market hall: lit hall, glowing barrel roof, a row of striped stalls out front
    const f = faceDir(b), m = new THREE.Group(); m.rotation.y = Math.atan2(f.x, f.z); g.add(m);
    const h1 = b.h * 0.55; m.add(tower(b.w, h1, b.d, c, 41, lit));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(b.d / 2, b.d / 2, b.w, 24, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1a0f3a, emissive: c, emissiveIntensity: 0.45, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }));
    roof.rotation.z = Math.PI / 2; roof.position.y = h1; m.add(roof);
    for (let x = -b.w / 2; x <= b.w / 2 + 0.01; x += b.w / 4) { const r = neonEdges(new THREE.TorusGeometry(b.d / 2, 0.02, 3, 24, Math.PI), c); r.rotation.y = Math.PI / 2; r.position.set(x, h1, 0); m.add(r); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.7, 1.1), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); sign.position.set(0, h1 - 1, b.d / 2 + 0.05); m.add(sign);
    const n = Math.max(3, Math.round(b.w / 2.6)), step = b.w / n, cols = [c, 0xffffff];
    for (let i = 0; i < n; i++) {
      const x = -b.w / 2 + step * (i + 0.5), z = b.d / 2 + 2.4;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(step * 0.8, 0.9, 1.1), new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 })); counter.position.set(x, 0.75, z); m.add(counter);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(step * 0.9, 0.12, 1.7), new THREE.MeshStandardMaterial({ color: cols[i % 2], emissive: cols[i % 2], emissiveIntensity: 0.35 }));
      canopy.position.set(x, 2.5, z + 0.1); canopy.rotation.x = 0.25; m.add(canopy);
      for (const px of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2), new THREE.MeshStandardMaterial({ color: 0xdddddd })); pole.position.set(x + px * step * 0.4, 1.4, z + 0.7); m.add(pole); }
      for (let k = 0; k < 3; k++) { const fr = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: pick([0xff4f4f, 0xffd34d, 0x7dff8a, 0xff9a3d]) })); fr.position.set(x - 0.4 + k * 0.4, 1.32, z); m.add(fr); }
    }
    top = h1 + b.d / 2;
  } else if (b.kind === "media") {  // HQ block with a spinning dish
    g.add(tower(b.w, b.h, b.d, c, 21, lit));
    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, 6.28, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xbcd4ff, emissive: c, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI * 0.65; const piv = new THREE.Group(); piv.position.y = b.h + 1.2; piv.add(dish); g.add(piv);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7), new THREE.MeshBasicMaterial({ color: c })); mast.position.set(2.5, b.h + 3.5, 2.5); g.add(mast);
    anim.push(dt => piv.rotation.y += dt * 0.6); top = b.h + 7;
  } else if (b.kind === "spire") {
    g.add(tower(b.w, b.h, b.d, c, 31, lit));
    const sp = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.42, 9, 4), new THREE.MeshStandardMaterial({ color: 0x2a0f3d, emissive: c, emissiveIntensity: 0.8 }));
    sp.position.y = b.h + 4.5; sp.rotation.y = Math.PI / 4; g.add(sp);
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), new THREE.MeshBasicMaterial({ color: 0xff7ab8 })); gem.position.y = b.h + 10; g.add(gem);
    anim.push((dt, t) => { gem.rotation.y += dt; gem.scale.setScalar(1 + Math.sin(t * 2) * 0.12); }); top = b.h + 11;
  } else if (b.kind === "shop") {  // arcade: wide low block with neon awning
    g.add(tower(b.w, b.h, b.d, c, 41, lit));
    const aw = new THREE.Mesh(new THREE.BoxGeometry(b.w + 2, 0.4, 3), new THREE.MeshBasicMaterial({ color: c })); aw.position.set(0, 4, b.d / 2 + 1); g.add(aw);
    const t2 = tower(b.w * 0.5, 7, b.d * 0.5, c, 42, lit); t2.position.y = b.h; g.add(t2); top = b.h + 7;
  } else if (b.kind === "small") {  // little KDP bookshop with a delivery box sign
    g.add(tower(b.w, b.h, b.d, c, 51, lit));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.8, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0x3a2205, emissive: c, emissiveIntensity: 0.5 }));
    roof.position.y = b.h + 1.75; roof.rotation.y = Math.PI / 4; g.add(roof);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), new THREE.MeshStandardMaterial({ color: 0xc8924a, emissive: 0xffb020, emissiveIntensity: 0.3 }));
    box.position.set(b.w / 2 + 1.5, 0.6, b.d / 2 + 1.5); g.add(box); top = b.h + 3.5;
  } else if (b.kind === "dome") {  // lab dome
    g.add(tower(b.w, b.h, b.d, c, 61, lit));
    const dm = new THREE.Mesh(new THREE.SphereGeometry(b.w * 0.6, 24, 12, 0, 6.28, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1a66, emissive: c, emissiveIntensity: 0.7, wireframe: true }));
    dm.position.y = b.h; g.add(dm); anim.push(dt => dm.rotation.y += dt * 0.3); top = b.h + b.w * 0.6;
  } else if (b.kind === "coin") {  // mint tower with a spinning Solana-purple coin
    g.add(tower(b.w, b.h, b.d, c, 71, lit));
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.45, 32), new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0x9945ff, emissiveIntensity: 0.55, metalness: 0.6 }));
    coin.rotation.x = Math.PI / 2; const piv = new THREE.Group(); piv.position.y = b.h + 3.2; piv.add(coin); g.add(piv);
    anim.push((dt, t) => { piv.rotation.y += dt * 1.4; piv.position.y = b.h + 3.2 + Math.sin(t * 1.5) * 0.4; }); top = b.h + 5.6;
  } else if (b.kind === "house") {  // employee home: walls with windows, pyramid roof, chimney, door, little garden fence
    g.add(tower(b.w, b.h, b.d, c, 91 + b.pos[1], lit));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.82, 3.6, 4), new THREE.MeshStandardMaterial({ color: 0x8b3a2b, emissive: c, emissiveIntensity: 0.25 }));
    roof.position.y = b.h + 1.8; roof.rotation.y = Math.PI / 4; g.add(roof);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x6b4b3a })); ch.position.set(b.w * 0.22, b.h + 2.4, b.d * 0.15); g.add(ch);
    const f = faceDir(b), door = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.2), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    door.position.set(f.x * (b.w / 2 + 0.03), 1.1, f.z * (b.d / 2 + 0.03)); door.lookAt(door.position.clone().add(f)); g.add(door);
    const fm = new THREE.MeshStandardMaterial({ color: 0xf5f0e6 });
    for (let i = -4; i <= 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), fm);
      const side = new THREE.Vector3(-f.z, 0, f.x); p.position.copy(f.clone().multiplyScalar(b.w / 2 + 2.2).add(side.multiplyScalar(i * 0.9))); p.position.y = 0.45; g.add(p); }
    top = b.h + 3.6;
  } else if (b.kind === "warehouse") {  // document warehouse: wide shed, sawtooth roof, roller doors, a fill gauge that shows how full it is
    g.add(tower(b.w, b.h, b.d, c, 95, lit * 0.5));
    for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(b.w / 4, 0.25, b.d * 0.9), new THREE.MeshStandardMaterial({ color: 0x9aa4b2, emissive: c, emissiveIntensity: 0.2 }));
      t.position.set(-b.w / 2 + b.w / 8 + i * b.w / 4, b.h + 1, 0); t.rotation.z = 0.45; g.add(t); }
    const f = faceDir(b), side = new THREE.Vector3(-f.z, 0, f.x);
    [-1, 1].forEach(k => { const d = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.28, b.h * 0.6), new THREE.MeshStandardMaterial({ color: 0xcfd6df, emissive: 0x334455, emissiveIntensity: 0.4 }));
      d.position.copy(f.clone().multiplyScalar(Math.max(b.w, b.d) / 2 + 0.05).add(side.clone().multiplyScalar(k * b.w * 0.22))); d.position.y = b.h * 0.3; d.lookAt(d.position.clone().add(f)); g.add(d); });
    const fill = b.fill ?? 0.5, gh = b.h + 6, gauge = new THREE.Group();
    gauge.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, gh, 1.4), new THREE.MeshStandardMaterial({ color: 0x1f2937, transparent: true, opacity: 0.55 })));
    const lvl = new THREE.Mesh(new THREE.BoxGeometry(1.2, gh * fill, 1.2), new THREE.MeshBasicMaterial({ color: fill > 0.85 ? 0xef4444 : fill > 0.65 ? 0xf59e0b : 0x22c55e, toneMapped: false }));
    lvl.position.y = -gh / 2 + gh * fill / 2; gauge.add(lvl);
    gauge.position.copy(side.clone().multiplyScalar(-(b.w / 2 + 2))); gauge.position.y = gh / 2; g.add(gauge);
    for (let i = 0; i < 6; i++) { const bx = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), new THREE.MeshStandardMaterial({ color: 0xc8924a }));
      bx.position.copy(f.clone().multiplyScalar(Math.max(b.w, b.d) / 2 + 1.6).add(side.clone().multiplyScalar(b.w * 0.42 + (i % 3) * 1.05))); bx.position.y = 0.4 + Math.floor(i / 3) * 0.8; g.add(bx); }
    top = gh;
  } else if (b.kind === "glass") {  // Contra: glass office tower with a spinning halo
    const glass = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), new THREE.MeshStandardMaterial({ color: 0x0b3a4a, metalness: 0.9, roughness: 0.08, emissive: c, emissiveIntensity: 0.18, transparent: true, opacity: 0.92 }));
    glass.position.y = b.h / 2; g.add(glass);
    for (let y = 3; y < b.h; y += 3) { const f = neonEdges(new THREE.BoxGeometry(b.w + 0.05, 0.01, b.d + 0.05), c); f.position.y = y; g.add(f); }
    const e = neonEdges(new THREE.BoxGeometry(b.w, b.h, b.d), c); e.position.y = b.h / 2; g.add(e);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.2, 8, 40), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    halo.rotation.x = Math.PI / 2; halo.position.y = b.h + 2.4; g.add(halo);
    anim.push((dt, t) => { halo.rotation.z += dt; halo.position.y = b.h + 2.4 + Math.sin(t * 2) * 0.3; }); top = b.h + 3;
  } else if (b.kind === "mail") {  // Zoho: post office with a giant glowing envelope and paper planes circling
    g.add(tower(b.w, b.h, b.d, c, 81, lit));
    const env = new THREE.Group(); env.position.y = b.h + 3.2;
    env.add(new THREE.Mesh(new THREE.BoxGeometry(6, 3.8, 0.4), new THREE.MeshStandardMaterial({ color: 0xfff7d6, emissive: c, emissiveIntensity: 0.35 })));
    const flap = new THREE.Mesh(new THREE.ConeGeometry(3.05, 1.9, 3), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    flap.rotation.set(0, 0, Math.PI); flap.scale.set(1, 1, 0.12); flap.position.set(0, 0.95, 0.25); env.add(flap);
    g.add(env); anim.push((dt, t) => env.rotation.y = Math.sin(t * 0.7) * 0.6);
    const planes = [...Array(4)].map((_, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.rotation.x = Math.PI / 2; const piv = new THREE.Group(); piv.add(m); m.position.x = 5 + i; piv.rotation.y = i * 1.6; piv.position.y = b.h + 4 + i; g.add(piv); return piv; });
    anim.push(dt => planes.forEach((p, i) => p.rotation.y += dt * (0.8 + i * 0.2))); top = b.h + 6;
  } else if (b.kind === "pin") {  // Pinterest: white studio tower with a giant red map pin bobbing on the roof
    g.add(tower(b.w, b.h, b.d, c, 91, lit));
    const red = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 });
    const pin = new THREE.Group(); pin.position.y = b.h + 4.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 16), red); head.position.y = 1.2; pin.add(head);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 24), red); tip.rotation.x = Math.PI; tip.position.y = -1.3; pin.add(tip);
    const dotP = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); dotP.position.set(0.8, 1.7, 1.2); pin.add(dotP);
    g.add(pin); anim.push((dt, t) => { pin.rotation.y += dt * 0.8; pin.position.y = b.h + 4.2 + Math.sin(t * 2) * 0.5; }); top = b.h + 7;
  } else if (b.kind === "git") {  // GitHub: dark foundry with a glowing commit graph (branches + nodes) growing from the roof
    g.add(tower(b.w, b.h, b.d, 0x6e40c9, 95, lit));
    const gm = new THREE.MeshBasicMaterial({ color: 0x3dffa8, toneMapped: false }), node = new THREE.SphereGeometry(0.45, 12, 8);
    const graph = new THREE.Group(); graph.position.y = b.h;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8), gm); stem.position.y = 4; graph.add(stem);
    [[0, 1.5], [0, 3.5], [0, 5.5], [0, 7.5]].forEach(([x, y]) => { const n = new THREE.Mesh(node, gm); n.position.set(x, y, 0); graph.add(n); });
    [[-1, 2.5, 5], [1, 4, 7]].forEach(([sx, y0, y1]) => {  // two side branches that merge back
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, y1 - y0 - 1), new THREE.MeshBasicMaterial({ color: sx < 0 ? 0xff7b72 : 0x58a6ff, toneMapped: false }));
      br.position.set(sx * 2, (y0 + y1) / 2, 0); graph.add(br);
      for (const y of [y0 + 0.5, y1 - 0.5]) { const n = new THREE.Mesh(node, br.material); n.position.set(sx * 2, y, 0); graph.add(n); }
    });
    g.add(graph); anim.push(dt => graph.rotation.y += dt * 0.5); top = b.h + 8.5;
  } else if (b.kind === "rnd") {  // R&D: low lab with a glass roof and a spinning atom above it
    g.add(tower(b.w, b.h, b.d, c, 97, lit));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.8, 1.2, b.d * 0.8), new THREE.MeshStandardMaterial({ color: 0x0b3a2a, metalness: 0.9, roughness: 0.1, emissive: c, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }));
    roof.position.y = b.h + 0.6; g.add(roof);
    const atom = new THREE.Group(); atom.position.y = b.h + 5;
    atom.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    const rings = [0, 1.05, 2.1].map(a => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.09, 8, 48), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
      r.rotation.set(Math.PI / 2, a, 0); const e = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0x00f0ff })); e.position.x = 2.6; r.add(e); atom.add(r); return r; });
    g.add(atom); anim.push(dt => { atom.rotation.y += dt * 0.6; rings.forEach((r, i) => r.rotation.z += dt * (1.5 + i * 0.4)); }); top = b.h + 8;
  } else if (b.kind === "store") {  // Side Hustle City, open: lit tower, glowing OPEN ring, a tiny spinning city on the roof
    g.add(tower(b.w, b.h, b.d, c, 7, lit));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(b.w, b.d) * 0.72, 0.18, 8, 64), new THREE.MeshBasicMaterial({ color: 0x3dffa8, toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = b.h * 0.55; g.add(ring);
    const roof = new THREE.Group(); roof.position.y = b.h + 0.3;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.3, 32), new THREE.MeshBasicMaterial({ color: 0xffb020, toneMapped: false })); roof.add(pad);
    const cols = [0xff3d9a, 0x00e5ff, 0xffd166, 0x9945ff, 0x3dffa8, 0xff8a3d];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = i % 3 ? 2.3 : 1.1, h = 0.8 + ((i * 7) % 5) * 0.45;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], toneMapped: false }));
      m.position.set(Math.cos(a) * r, 0.15 + h / 2, Math.sin(a) * r); roof.add(m); }
    g.add(roof); anim.push((dt, t) => { roof.rotation.y += dt * 0.5; ring.position.y = b.h * (0.5 + 0.08 * Math.sin(t * 1.2)); });
    top = b.h + 3.5;
  } else if (b.kind === "construction") {  // Showroom: half-built floors in scaffolding, a turning crane, warning lights; grows with the pipeline
    const built = Math.max(0.2, b.built || 0), hb = b.h * built;
    g.add(tower(b.w, hb, b.d, c, 99, lit));
    const steel = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8a00, emissiveIntensity: 0.4 });
    const frame = neonEdges(new THREE.BoxGeometry(b.w + 0.6, b.h, b.d + 0.6), 0xffb020); frame.position.y = b.h / 2; g.add(frame);
    for (let y = 3; y < b.h; y += 3) { const f = neonEdges(new THREE.BoxGeometry(b.w + 0.6, 0.01, b.d + 0.6), 0xffb020); f.position.y = y; g.add(f); }
    const back = faceDir(b).multiplyScalar(-(Math.max(b.w, b.d) / 2 + 2));  // crane stands behind the site, away from the camera
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.7, b.h + 10, 0.7), steel); mast.position.set(back.x, (b.h + 10) / 2, back.z); g.add(mast);
    const jib = new THREE.Group(); jib.position.set(back.x, b.h + 10, back.z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 0.5), steel); arm.position.x = -5; jib.add(arm);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xdddddd })); cable.position.set(-11, -3, 0); jib.add(cable);
    const load = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.6), new THREE.MeshStandardMaterial({ color: 0x5eead4, emissive: 0x00f0ff, emissiveIntensity: 0.4 })); load.position.set(-11, -6.5, 0); jib.add(load);
    const warn = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2d55 })); warn.position.set(3, 0.6, 0); jib.add(warn);
    g.add(jib); anim.push((dt, t) => { jib.rotation.y = Math.sin(t * 0.25) * 1.2; warn.visible = Math.sin(t * 5) > 0; });
    top = b.h + 2;
  } else if (b.kind === "library") {  // Lincoln Memorial: stepped base, Doric colonnade all round, plain frieze + attic, seated figure inside
    const marble = new THREE.MeshStandardMaterial({ color: 0xece6da, emissive: 0xfff1dc, emissiveIntensity: 0.22, roughness: 0.6 });
    const W = b.w, D = b.d, base = 1.5, ch = b.h - 4.1;
    [[W + 3, D + 3], [W + 2, D + 2], [W + 1, D + 1]].forEach(([w, d], i) => { const st = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), marble); st.position.y = 0.25 + i * 0.5; g.add(st); });
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(W * 0.45, 0.25 * (i + 1), 0.6), marble); st.position.set(0, 0.125 * (i + 1), D / 2 + 2.1 + (5 - i) * 0.6); g.add(st); }  // grand front stairs
    const colGeo = new THREE.CylinderGeometry(0.34, 0.4, ch, 14), capGeo = new THREE.BoxGeometry(0.95, 0.25, 0.95), cols = [];
    const nx = 12, nz = 6;
    for (let i = 0; i < nx; i++) for (const sz of [-1, 1]) cols.push([-W / 2 + 0.6 + i * (W - 1.2) / (nx - 1), sz * (D / 2 - 0.6)]);
    for (let i = 1; i < nz - 1; i++) for (const sx of [-1, 1]) cols.push([sx * (W / 2 - 0.6), -D / 2 + 0.6 + i * (D - 1.2) / (nz - 1)]);
    cols.forEach(([x, z]) => { const col = new THREE.Mesh(colGeo, marble); col.position.set(x, base + ch / 2, z); g.add(col);
      const cap = new THREE.Mesh(capGeo, marble); cap.position.set(x, base + ch - 0.12, z); g.add(cap); });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, emissive: 0xffb36b, emissiveIntensity: 0.6 });
    for (const [w, d, x, z] of [[W - 3.4, 0.4, 0, -D / 2 + 1.9], [0.4, D - 3.8, -W / 2 + 1.9, 0], [0.4, D - 3.8, W / 2 - 1.9, 0], [3.2, 0.4, -W / 2 + 3.5, D / 2 - 1.9], [3.2, 0.4, W / 2 - 3.5, D / 2 - 1.9]]) {
      const wl = new THREE.Mesh(new THREE.BoxGeometry(w, ch, d), wallMat); wl.position.set(x, base + ch / 2, z); g.add(wl); }
    const lamp = new THREE.PointLight(0xffc58f, 30, 18, 2); lamp.position.set(0, base + ch - 1, 0); g.add(lamp);
    const statue = new THREE.Group(); statue.position.set(0, base, -D / 2 + 3);
    const sm = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, emissive: 0xffffff, emissiveIntensity: 0.3 });
    [[2.4, 1.6, 1.6, 0, 0.8, 0], [1.4, 1.9, 0.9, 0, 2.55, -0.2], [1.5, 0.35, 1.3, 0, 1.75, 0.55]].forEach(([w, h, d, x, y, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm); p.position.set(x, y, z); statue.add(p); });
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), sm); hd.position.set(0, 3.85, -0.15); statue.add(hd); g.add(statue);
    const ent = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 1.3, D + 0.4), marble); ent.position.y = base + ch + 0.65; g.add(ent);
    const frieze = neonEdges(new THREE.BoxGeometry(W + 0.45, 0.01, D + 0.45), c); frieze.position.y = base + ch + 0.9; g.add(frieze);
    const attic = new THREE.Mesh(new THREE.BoxGeometry(W - 2, 1.5, D - 2), marble); attic.position.y = base + ch + 1.3 + 0.75; g.add(attic);
    top = base + ch + 2.8;
  }
  const bc = { ok: 0x3dffa8, down: 0xff2d55, stale: 0xffd166, unknown: 0x8a80b8 }[b.status];
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: bc }));
  beacon.position.y = top + 0.8; g.add(beacon);
  anim.push((dt, t) => beacon.scale.setScalar(b.status === "down" ? (Math.sin(t * 8) > 0 ? 1.4 : 0.6) : 1 + Math.sin(t * 3) * 0.15));
  if (b.today > 0) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 240, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc56b, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = top + 120; g.add(beam);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.12, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    halo.rotation.x = Math.PI / 2; halo.position.y = top + 2; g.add(halo);
    anim.push((dt, t) => { beam.material.opacity = 0.4 + Math.sin(t * 3) * 0.15; halo.position.y = top + 2 + ((t * 3) % 6); halo.material.opacity = 1; });
  }
  const tex = boardTex(b), bw = b.kind === "mega" ? 16 : 11, bh = bw * 600 / 1024;
  const board = new THREE.Group();
  [0, Math.PI].forEach(r => { const p = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    p.rotation.y = r; p.position.z = r ? -0.06 : 0.06; board.add(p); });
  board.add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, bh + 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0x05020f })));
  const postH = b.kind === "mega" ? 10 : b.h < 14 ? 3.5 : 6;
  [-bw / 3, bw / 3].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, postH), new THREE.MeshBasicMaterial({ color: 0x2a1670 })); p.position.set(x, -bh / 2 - postH / 2, 0); board.add(p); });
  const toward = faceDir(b);
  const off = b.kind === "market" ? b.d / 2 + 5.5 : Math.max(b.w, b.d) * (b.kind === "mega" ? 0.75 : 0.95) + 2;
  if (b.kind === "library") { board.children.slice(-2).forEach(p => p.visible = false); board.position.set(0, top + bh / 2 + 0.6, 0); top += bh + 1; }
  else board.position.set(toward.x * off, postH + bh / 2, toward.z * off);
  if (b.kind === "market") { board.position.y += b.h * 0.55; board.children.slice(-2).forEach(p => { p.scale.y = (postH + b.h * 0.55) / postH; p.position.y = -bh / 2 - (postH + b.h * 0.55) / 2; }); }
  board.lookAt(board.position.clone().add(g.position).add(toward));
  g.add(board); g.userData.board = board; g.userData.top = top;
  const el = document.createElement("div"); el.className = "tag"; el.style.setProperty("--c", hex(c));
  el.innerHTML = `<b>${b.icon} ${esc(b.short)}</b><span class="${b.today > 0 ? "v" : "z"}">${esc(b.tag[0])}</span> · <span class="z">${esc(b.tag[1])}</span>`;
  el.onclick = () => focus(b.id);
  const lab = new CSS2DObject(el); lab.position.y = top + 3.5; g.add(lab);
  g.traverse(o => { if (o.isMesh) { o.userData.bid = b.id; picks.push(o); } });
  groups[b.id] = g; scene.add(g);
  if (b.today > 0) {
    const coins = [...Array(5)].map((_, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      m.rotation.z = Math.PI / 2; scene.add(m); return { m, k: i / 5 }; });
    const V = new THREE.Vector3(VAULT[0], 0.8, VAULT[1]), from = new THREE.Vector3(b.pos[0], 0.8, b.pos[1]), to = from.clone().sub(V).setLength(10).add(V);
    anim.push(dt => coins.forEach(c => { c.k = (c.k + dt * 0.15) % 1; c.m.position.lerpVectors(from, to, c.k); c.m.rotation.y += dt * 4; }));
  }
}

function flowBeam() {
  const A = groups.ads, Z = groups.billing; if (!A || !Z) return;
  const f = M.flow || {}, on = f.ads > 0;
  const from = A.position.clone().setY(A.userData.top + 1), to = Z.position.clone().setY(Z.userData.top + 1);
  const mid = from.clone().lerp(to, 0.5).setY(Math.max(from.y, to.y) + 16);
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const geo = new THREE.TubeGeometry(curve, 96, 0.32, 10, false), uv = geo.attributes.uv, cols = [];
  const ca = new THREE.Color(0x3b82f6), cb = new THREE.Color(0xff8a3d), tc = new THREE.Color();
  for (let i = 0; i < uv.count; i++) { tc.copy(ca).lerp(cb, uv.getX(i)); cols.push(tc.r, tc.g, tc.b); }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 4;
  const cx = cv.getContext("2d"), gr = cx.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, "rgba(255,255,255,0.15)"); gr.addColorStop(0.75, "rgba(255,255,255,0.15)"); gr.addColorStop(0.92, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0.15)");
  cx.fillStyle = gr; cx.fillRect(0, 0, 256, 4);
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(6, 1);
  const mk = (r, o, map) => new THREE.Mesh(r === 1 ? geo : new THREE.TubeGeometry(curve, 96, 0.32 * r, 10, false).setAttribute("color", geo.attributes.color),
    new THREE.MeshBasicMaterial({ vertexColors: true, map, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const core = mk(1, on ? 0.9 : 0.55, tex), glow = mk(3.2, on ? 0.12 : 0.07);
  scene.add(core, glow);
  const ends = [from, to].map((p, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: i ? 0xff8a3d : 0x3b82f6, transparent: true, toneMapped: false }));
    r.rotation.x = Math.PI / 2; r.position.copy(p); scene.add(r); return r; });
  const n = Math.max(2, Math.min(6, 2 + Math.round(Math.log10(1 + (f.clicks || 0) * 10 + (f.views || 0)))));
  const shirts = [0xffd166, 0x7dd3fc, 0xff6b9a, 0x34d399, 0xc084fc, 0xffffff];
  const runners = [...Array(n)].map((_, i) => {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: shirts[i], toneMapped: false });
    const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 3, 8), m); bd.position.y = 0.55; bd.rotation.x = 0.35; g.add(bd);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2c4 })); hd.position.set(0, 1.25, 0.25); g.add(hd);
    const legs = [-0.13, 0.13].map(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), m); l.position.set(x, 0.05, 0); g.add(l); return l; });
    g.scale.setScalar(1.3); scene.add(g); return { g, legs, k: i / n, v: 0.06 + (i % 3) * 0.012 };
  });
  const p = new THREE.Vector3(), tg = new THREE.Vector3();
  anim.push((dt, t) => {
    tex.offset.x -= dt * (on ? 0.6 : 0.3);
    core.material.opacity = (on ? 0.8 : 0.5) + Math.sin(t * 2) * 0.1;
    ends.forEach((r, i) => { const k = (t * 0.8 + i * 0.5) % 1; r.scale.setScalar(0.6 + k); r.material.opacity = 1 - k; });
    runners.forEach((r, i) => {
      r.k = (r.k + dt * r.v) % 1;
      curve.getPointAt(r.k, p); curve.getTangentAt(r.k, tg);
      r.g.position.copy(p).y += 0.35 + Math.abs(Math.sin(t * 12 + i)) * 0.15;
      r.g.lookAt(p.x + tg.x, r.g.position.y + tg.y, p.z + tg.z);
      r.legs.forEach((l, j) => l.rotation.x = Math.sin(t * 12 + i + j * Math.PI) * 0.7);
    });
  });
}

const MONEY = ["billing", "sars", "cipc", "labour", "ufiling", "bank"];
function moneyBeams() {
  const V = groups.vault; if (!V) return;
  const to = V.position.clone().setY(9.5);
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 4;
  const cx = cv.getContext("2d"), gr = cx.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, "rgba(255,255,255,0.1)"); gr.addColorStop(0.8, "rgba(255,255,255,0.1)"); gr.addColorStop(0.95, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0.1)");
  cx.fillStyle = gr; cx.fillRect(0, 0, 128, 4);
  M.B.filter(b => MONEY.includes(b.id) && groups[b.id]).forEach((b, bi) => {
    const A = groups[b.id], hot = b.today > 0, from = A.position.clone().setY(A.userData.top + 0.5);
    const mid = from.clone().lerp(to, 0.5).setY(Math.max(from.y, to.y) + 6 + from.distanceTo(to) * 0.12);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(Math.max(2, Math.round(curve.getLength() / 14)), 1);
    const col = new THREE.Color(b.color).lerp(new THREE.Color(0xffd166), 0.55);
    const tube = (r, o, map) => new THREE.Mesh(new THREE.TubeGeometry(curve, 64, r, 6, false),
      new THREE.MeshBasicMaterial({ color: col, map, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const core = tube(hot ? 0.3 : 0.18, hot ? 0.95 : 0.55, tex), glow = tube(hot ? 0.9 : 0.5, hot ? 0.14 : 0.07);
    scene.add(core, glow);
    const sparks = hot ? [...Array(3)].map((_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8, toneMapped: false }));
      scene.add(m); return { m, k: i / 3 }; }) : [];
    const sp = new THREE.Vector3();
    anim.push((dt, t) => {
      tex.offset.x -= dt * (hot ? 0.5 : 0.22);
      core.material.opacity = (hot ? 0.85 : 0.45) + Math.sin(t * 1.6 + bi) * 0.08;
      sparks.forEach(s => { s.k = (s.k + dt * 0.12) % 1; curve.getPointAt(s.k, sp); s.m.position.copy(sp); s.m.scale.setScalar(0.8 + Math.sin(t * 6 + s.k * 9) * 0.25); });
    });
  });
}

function workBeams() {
  (M.working || []).forEach((id, wi) => {
    const g = groups[id]; if (!g) return;
    const top = g.userData.top, mat = o => new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 300, 12, 1, true), mat(0.6)); core.position.y = top + 150;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 300, 16, 1, true), mat(0.05)); glow.position.y = top + 150;
    g.add(core, glow);
    const rings = [...Array(4)].map((_, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.07, 6, 36), mat(0.9)); r.rotation.x = Math.PI / 2; g.add(r); return { r, k: i / 4 }; });
    const el = document.createElement("div"); el.className = "tag work"; el.innerHTML = "<b>🛠️ Claude working</b>";
    const lab = new CSS2DObject(el); lab.position.y = top + 16; g.add(lab);
    anim.push((dt, t) => {
      core.material.opacity = 0.45 + Math.sin(t * 4 + wi) * 0.15;
      rings.forEach(o => { o.k = (o.k + dt * 0.25) % 1; o.r.position.y = top + 1 + o.k * 40; o.r.scale.setScalar(1 + o.k * 1.5); o.r.material.opacity = 0.9 * (1 - o.k); });
    });
  });
}

function vault() {
  const g = new THREE.Group(); g.userData.b = { id: "vault" };
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 5, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a2e1a, emissive: 0xff9a5a, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
  drum.position.y = 3; g.add(drum);
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), new THREE.MeshStandardMaterial({ color: 0xffe2c4, emissive: 0xffc58f, emissiveIntensity: 0.6 }));
    col.position.set(Math.cos(a) * 6.1, 3, Math.sin(a) * 6.1); g.add(col); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(6.2, 32, 16, 0, 6.28, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff3e0 }));
  dome.position.y = 5.5; g.add(dome);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 0.6, 48), new THREE.MeshStandardMaterial({ color: 0x1d0f4a, emissive: 0x6d28d9, emissiveIntensity: 0.4 }));
  base.position.y = 0.3; g.add(base);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, t = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0x5eead4 }));
    t.position.set(Math.cos(a) * 8, 1.4, Math.sin(a) * 8); g.add(t); }
  const el = document.createElement("div"); el.className = "tag vaultTag"; el.style.setProperty("--c", "#ffd166");
  el.onclick = () => focus("vault");
  const lab = new CSS2DObject(el); lab.position.y = 14; g.add(lab); g.userData.el = el;
  g.traverse(o => { if (o.isMesh) { o.userData.bid = "vault"; picks.push(o); } });
  g.position.set(VAULT[0], 0, VAULT[1]); groups.vault = g; scene.add(g);
}

const EYE = 1.8;
let mode = "orbit", yaw = 0, pitch = 0, vert = 0, wheelV = 0;
const keys = {}, joy = { x: 0, y: 0 }, solids = [];

function life() {
  solids.push({ x: VAULT[0], z: VAULT[1], r: 9.8, h: 13 });
  const d = new THREE.Object3D(), col = new THREE.Color();
  const walk = new THREE.MeshStandardMaterial({ color: 0x5b5470, roughness: 0.85 }), stone = new THREE.MeshStandardMaterial({ color: 0x3d3550, roughness: 0.7 });
  const paths = [], seg = (x0, z0, x1, z1, w = 5, color) => {
    const len = Math.hypot(x1 - x0, z1 - z0), u = new THREE.Vector2((x1 - x0) / len, (z1 - z0) / len);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), walk); m.rotation.set(-Math.PI / 2, 0, Math.atan2(-u.x, -u.y));
    m.position.set((x0 + x1) / 2, 0.31, (z0 + z1) / 2); scene.add(m);
    if (color) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.18, len), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })); l.rotation.copy(m.rotation); l.position.copy(m.position); l.position.y = 0.32; scene.add(l); }
    paths.push({ a: new THREE.Vector2(x0, z0), u, len, w });
  };
  const BX = 44;
  seg(-BX, -70, -BX, 70, 6, 0x3b82f6); seg(BX, -70, BX, 70, 6, 0x9945ff);                 // boulevards
  seg(-BX, -70, BX, -70, 5); seg(-BX, 70, BX, 70, 5);                                        // north + south promenades
  seg(-9, -56, -9, PLAZA[2], 4); seg(9, -56, 9, PLAZA[2], 4);                                // walks either side of the pool
  seg(0, PLAZA[3], 0, PARK, 6, 0xffd166);                                                    // grand entrance from the south
  seg(-BX, VAULT[1] + 8, PLAZA[0], VAULT[1] + 8, 5); seg(PLAZA[1], VAULT[1] + 8, BX, VAULT[1] + 8, 5);  // market street to both boulevards
  seg(-PARK, 0, -BX, 0, 4); seg(BX, 0, PARK, 0, 4);                                          // side gates
  M.B.forEach(b => {
    const size = Math.max(b.w, b.d) * 0.8;
    solids.push({ x: b.pos[0], z: b.pos[1], r: size + 0.6, h: b.h + 12 });
    if (Math.abs(b.pos[0]) > 40) { const sx = Math.sign(b.pos[0]); seg(sx * BX, b.pos[1], b.pos[0] - sx * (size + 0.5), b.pos[1], 3.4, b.color); }  // spur from the boulevard to the door
  });
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(PLAZA[1] - PLAZA[0], PLAZA[3] - PLAZA[2]), stone); pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0.305, (PLAZA[2] + PLAZA[3]) / 2); scene.add(pave);
  const pk = neonEdges(new THREE.BoxGeometry(PLAZA[1] - PLAZA[0], 0.01, PLAZA[3] - PLAZA[2]), 0xffd166); pk.position.set(0, 0.33, (PLAZA[2] + PLAZA[3]) / 2); scene.add(pk);
  const fore = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), stone); fore.rotation.x = -Math.PI / 2; fore.position.set(0, 0.305, -56); scene.add(fore);
  const [px0, px1, pz0, pz1] = POOL;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(px1 - px0 + 1.2, 0.5, pz1 - pz0 + 1.2), new THREE.MeshStandardMaterial({ color: 0xd9d2c4, emissive: 0x332a1a, emissiveIntensity: 0.3 })); rim.position.set((px0 + px1) / 2, 0.4, (pz0 + pz1) / 2); scene.add(rim);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(px1 - px0, pz1 - pz0), new THREE.MeshStandardMaterial({ color: 0x0a2a55, emissive: 0x1e5aa8, emissiveIntensity: 0.35, metalness: 0.9, roughness: 0.05 }));
  water.rotation.x = -Math.PI / 2; water.position.set((px0 + px1) / 2, 0.66, (pz0 + pz1) / 2); scene.add(water);
  anim.push((dt, t) => water.material.emissiveIntensity = 0.3 + Math.sin(t * 0.8) * 0.06);
  const nearPath = (x, z, pad) => paths.some(p => { const dx = x - p.a.x, dz = z - p.a.y, t = dx * p.u.x + dz * p.u.y; return t > -pad && t < p.len + pad && Math.abs(-dx * p.u.y + dz * p.u.x) < p.w / 2 + pad; });
  const nearSolid = (x, z, pad) => solids.some(s => Math.hypot(x - s.x, z - s.z) < s.r + pad);
  const inRect = (x, z, [x0, x1, z0, z1], pad) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad;
  const open = (x, z, pad) => !nearSolid(x, z, pad) && !nearPath(x, z, pad) && !inRect(x, z, PLAZA, pad) && !inRect(x, z, POOL, pad + 3) && !inRect(x, z, [-20, 20, -62, -50], pad);

  const spots = [];
  for (let z = -54; z <= -18; z += 6) for (const x of [-14, 14]) spots.push([x, z, 1.1]);
  for (let z = -66; z <= 66; z += 9) for (const x of [-BX - 4.5, -BX + 4.5, BX - 4.5, BX + 4.5]) if (open(x, z, 0.5)) spots.push([x, z, 0.95]);
  for (let i = 0, n = MOBILE ? 40 : 70; spots.length < n + 70 && i < 4000; i++) {
    const x = (Math.random() * 2 - 1) * (PARK - 3), z = (Math.random() * 2 - 1) * (PARK - 3);
    if (open(x, z, 3)) spots.push([x, z, 0.8 + Math.random() * 0.6]);
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x4a2c5a }), spots.length);
  const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.35, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x08240f, roughness: 0.7, flatShading: true }), spots.length);
  const palette = [0x22c55e, 0x16a34a, 0x4ade80, 0xf9a8d4, 0x15803d, 0x86efac, 0x22c55e];
  spots.forEach(([x, z, sc], i) => {
    d.position.set(x, 0.6 * sc + 0.3, z); d.scale.setScalar(sc); d.rotation.set(0, 0, 0); d.updateMatrix(); trunk.setMatrixAt(i, d.matrix);
    d.position.y = 2.5 * sc + 0.3; d.updateMatrix(); leaf.setMatrixAt(i, d.matrix);
    leaf.setColorAt(i, col.set(palette[i % palette.length]).multiplyScalar(0.55 + Math.random() * 0.3));
  });
  scene.add(trunk, leaf);
  if (DEMO) window.__clearPath = (x0, z0, x1, z1, r) => {
    const a = new THREE.Vector3(x0, 0, z0), b = new THREE.Vector3(x1, 0, z1), line = new THREE.Line3(a, b), q = new THREE.Vector3(), c = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    spots.forEach(([x, z], i) => { line.closestPointToPoint(q.set(x, 0, z), true, c); if (c.distanceTo(q) < r) { trunk.setMatrixAt(i, zero); leaf.setMatrixAt(i, zero); } });
    trunk.instanceMatrix.needsUpdate = leaf.instanceMatrix.needsUpdate = true;
  };

  const lamps = [], benches = [];
  paths.forEach(p => { for (let t = 4; t < p.len - 2; t += 10) for (const side of [-1, 1]) {
    const off = side * (p.w / 2 + 0.6), x = p.a.x + p.u.x * t - p.u.y * off, z = p.a.y + p.u.y * t + p.u.x * off;
    if (!nearSolid(x, z, 0.5)) { lamps.push([x, z]); if (p.w >= 5 && (t / 10 | 0) % 2) benches.push([x + p.u.x * 3, z + p.u.y * 3, Math.atan2(p.u.x, p.u.y)]); }
  } });
  const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x3b2a7a }), lamps.length);
  const bulb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), lamps.length);
  lamps.forEach(([x, z], i) => { d.scale.setScalar(1); d.position.set(x, 2.0, z); d.updateMatrix(); post.setMatrixAt(i, d.matrix); d.position.y = 3.8; d.updateMatrix(); bulb.setMatrixAt(i, d.matrix); });
  scene.add(post, bulb);
  const bench = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: 0x7c4a2a }), benches.length);
  benches.forEach(([x, z, r], i) => { d.position.set(x, 0.55, z); d.rotation.set(0, r, 0); d.updateMatrix(); bench.setMatrixAt(i, d.matrix); });
  d.rotation.set(0, 0, 0); scene.add(bench);

  const fl = [];
  for (let i = 0; fl.length < (MOBILE ? 350 : 700) && i < 20000; i++) {
    const cx = (Math.random() * 2 - 1) * (PARK - 4), cz = (Math.random() * 2 - 1) * (PARK - 4);
    if (!open(cx, cz, 2.5)) continue;
    const c = pick([0xff4fa3, 0xffd34d, 0xffffff, 0xb57bff, 0xff7a45, 0x7dd3fc]);
    for (let k = 0; k < 14; k++) fl.push([cx + rnd(-1.6, 1.6), cz + rnd(-1.6, 1.6), c]);
  }
  const flower = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x331133, emissiveIntensity: 0.6 }), fl.length);
  fl.forEach(([x, z, c], i) => { d.position.set(x, 0.42, z); d.scale.setScalar(rnd(0.8, 1.4)); d.updateMatrix(); flower.setMatrixAt(i, d.matrix); flower.setColorAt(i, col.set(c)); });
  d.scale.setScalar(1); scene.add(flower);
  const hedges = [];
  for (let s = -PARK + 2; s <= PARK - 2; s += 2) for (const e of [-PARK + 1.2, PARK - 1.2]) for (const [x, z] of [[s, e], [e, s]]) if (!nearPath(x, z, 1.5)) hedges.push([x, z]);
  const hedge = new THREE.InstancedMesh(new THREE.BoxGeometry(2.05, 1.1, 1.3), new THREE.MeshStandardMaterial({ color: 0x14532d, emissive: 0x052e16, roughness: 0.9 }), hedges.length);
  hedges.forEach(([x, z], i) => { d.rotation.set(0, Math.abs(z) > PARK - 2 ? 0 : Math.PI / 2, 0); d.position.set(x, 0.85, z); d.updateMatrix(); hedge.setMatrixAt(i, d.matrix); });
  d.rotation.set(0, 0, 0); scene.add(hedge);

  const NP = MOBILE ? 55 : 90, people = [];
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.26, 0.75, 3, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x150a30 }), NP);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }), NP);
  const shirts = [0xff6b9a, 0x60a5fa, 0xfacc15, 0x34d399, 0xf97316, 0xc084fc, 0xffffff, 0x22d3ee], skins = [0xf1c27d, 0x8d5524, 0xc68642, 0xffdbac, 0x6b4226];
  const busy = paths.filter(p => p.len > 15);
  for (let i = 0; i < NP; i++) {
    const a = busy[i % busy.length];
    people.push({ a, s: Math.random() * a.len, lo: 0.5, hi: a.len - 0.5, side: (Math.random() < 0.5 ? -1 : 1) * (a.w / 2 - 0.7) * (0.5 + Math.random() * 0.5), v: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 0.8), ph: Math.random() * 6 });
    body.setColorAt(i, col.set(shirts[i % shirts.length])); head.setColorAt(i, col.set(skins[i % skins.length]));
  }
  scene.add(body, head);
  const at = (p, s, side) => [p.a.a.x + p.a.u.x * s - p.a.u.y * side, p.a.a.y + p.a.u.y * s + p.a.u.x * side];
  const dogs = [], dogCols = [0x8b5a2b, 0xf5f5f5, 0x222222, 0xd2a36c, 0x5c3a1e];
  for (let i = 0; i < (MOBILE ? 10 : 16); i++) {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: dogCols[i % dogCols.length] });
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.7), m); bd.position.y = 0.42; g.add(bd);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.28), m); hd.position.set(0, 0.62, 0.42); g.add(hd);
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.08), m); ear.position.set(0, 0.76, 0.36); g.add(ear);
    for (const [x, z] of [[-0.1, 0.25], [0.1, 0.25], [-0.1, -0.25], [0.1, -0.25]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.07), m); l.position.set(x, 0.15, z); g.add(l); }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), m); tail.position.set(0, 0.55, -0.45); tail.rotation.x = -0.6; g.add(tail);
    scene.add(g); dogs.push({ g, tail, p: people[i * 3 % NP] });
  }
  anim.push((dt, t) => {
    people.forEach((p, i) => {
      p.s += p.v * dt; if (p.s > p.hi || p.s < p.lo) { p.v *= -1; p.s = Math.max(p.lo, Math.min(p.hi, p.s)); }
      const [x, z] = at(p, p.s, p.side), u = p.a.u, bob = Math.abs(Math.sin(t * 7 + p.ph)) * 0.06;
      p.x = x; p.z = z; p.h = Math.atan2(u.x * Math.sign(p.v), u.y * Math.sign(p.v));
      d.scale.setScalar(1); d.rotation.set(0, p.h, 0);
      d.position.set(x, 0.95 + bob, z); d.updateMatrix(); body.setMatrixAt(i, d.matrix);
      d.position.y = 1.73 + bob; d.updateMatrix(); head.setMatrixAt(i, d.matrix);
    });
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
    dogs.forEach((o, i) => {
      const p = o.p, [x, z] = at(p, p.s + Math.sign(p.v) * 0.9, p.side - Math.sign(p.side || 1) * 0.7);
      o.g.position.set(x, 0.3 + Math.abs(Math.sin(t * 11 + i)) * 0.05, z);
      o.g.rotation.y = p.h; o.tail.rotation.y = Math.sin(t * 14 + i) * 0.7;
    });
  });

  const NB = 22, wing = new THREE.BufferGeometry();
  wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.25, -1, 0.4, 0, 0, 0, -0.2, 0, 0, 0.25, 1, 0.4, 0, 0, 0, -0.2], 3));
  const birds = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ color: 0xe9e2ff, side: THREE.DoubleSide }), NB);
  const flock = [...Array(NB)].map((_, i) => ({ r: 30 + Math.random() * 60, a: Math.random() * 6.28, y: 38 + Math.random() * 30, v: (0.08 + Math.random() * 0.08) * (i % 3 ? 1 : -1), ph: Math.random() * 6 }));
  scene.add(birds);
  anim.push((dt, t) => { flock.forEach((f, i) => { f.a += f.v * dt;
    d.position.set(Math.cos(f.a) * f.r, f.y + Math.sin(t + f.ph) * 2, Math.sin(f.a) * f.r); d.rotation.set(0, -f.a + (f.v > 0 ? 0 : Math.PI), 0);
    d.scale.set(0.9, 0.2 + Math.abs(Math.sin(t * 9 + f.ph)) * 1.3, 0.9); d.updateMatrix(); birds.setMatrixAt(i, d.matrix); });
    birds.instanceMatrix.needsUpdate = true; });
}

const MODE_HINT = {
  orbit: "Drag to look around · pinch or scroll to zoom · two fingers / right-drag to move · tap a building",
  fly: "🦅 Bird: drag to look · joystick or WASD to fly · ▲▼ or Space/Shift for height · tap a building",
  walk: "🚶 Street: drag to look · joystick or WASD to walk · Shift to run · tap a building to walk to it",
};
function applyLook() { camera.rotation.set(pitch, yaw, 0, "YXZ"); }
function syncLook() { const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ"); yaw = e.y; pitch = e.x; }

function setMode(m, silent) {
  if (m === mode) return;
  const prev = mode; mode = m; flight = null;
  if (m === "orbit") {
    controls.enabled = true;
    const dv = new THREE.Vector3(); camera.getWorldDirection(dv);
    const t = camera.position.clone().add(dv.multiplyScalar(prev === "walk" ? 20 : 35)); t.y = Math.max(0, t.y);
    controls.target.copy(t);
  } else {
    controls.enabled = false; syncLook();
    const p = camera.position;
    if (m === "walk") {
      const r = Math.hypot(p.x, p.z);
      if (r > EXT) { p.x *= EXT / r; p.z *= EXT / r; }
      p.y = EYE; pitch = 0.08;
    } else if (prev === "walk") p.y = 22;
    applyLook();
  }
  document.querySelectorAll("#modes button").forEach(b => b.classList.toggle("on", b.dataset.mode === m));
  $("#joy").hidden = m === "orbit"; $("#updown").hidden = m !== "fly";
  if (!silent) { const h = $("#hint"); h.textContent = MODE_HINT[m]; h.style.opacity = 1; clearTimeout(h._t); h._t = setTimeout(() => h.style.opacity = 0, 6000); }
}

function freeMove(dt) {
  const k = c => keys[c] ? 1 : 0;
  const fwd = k("KeyW") + k("ArrowUp") - k("KeyS") - k("ArrowDown") - joy.y + wheelV;
  const str = k("KeyD") + k("ArrowRight") - k("KeyA") - k("ArrowLeft") + joy.x;
  wheelV *= 0.85; if (Math.abs(wheelV) < 0.01) wheelV = 0;
  const p = camera.position, cp = Math.cos(pitch);
  let speed = mode === "fly" ? 30 : 9;
  if (mode === "walk" && (keys.ShiftLeft || keys.ShiftRight)) speed *= 2.2;
  const f = mode === "fly" ? new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp) : new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  p.addScaledVector(f, fwd * speed * dt).addScaledVector(r, str * speed * dt);
  if (mode === "fly") p.y += (k("Space") + k("KeyE") - k("ShiftLeft") - k("KeyQ") + vert) * speed * 0.7 * dt;
  for (const s of solids) {  // buildings are solid
    if (p.y > s.h) continue;
    const dx = p.x - s.x, dz = p.z - s.z, dd = Math.hypot(dx, dz);
    if (dd < s.r && dd > 0.001) { p.x = s.x + dx / dd * s.r; p.z = s.z + dz / dd * s.r; }
  }
  const R = Math.hypot(p.x, p.z); if (R > 230) { p.x *= 230 / R; p.z *= 230 / R; }
  p.y = mode === "walk" ? EYE : Math.min(230, Math.max(1.2, p.y));
  applyLook();
}

function freeInput() {
  const cv = renderer.domElement; let look = null;
  addEventListener("keydown", e => { if (e.target.closest && e.target.closest("textarea,input")) return; keys[e.code] = true;
    if (mode !== "orbit" && ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); });
  addEventListener("keyup", e => keys[e.code] = false);
  addEventListener("blur", () => Object.keys(keys).forEach(k => keys[k] = false));
  cv.addEventListener("pointerdown", e => { if (mode !== "orbit" && e.isPrimary) { look = { x: e.clientX, y: e.clientY, id: e.pointerId }; flight = null; } });
  addEventListener("pointermove", e => {
    if (!look || e.pointerId !== look.id || mode === "orbit") return;
    const s = e.pointerType === "touch" ? 0.006 : 0.004;
    yaw -= (e.clientX - look.x) * s; pitch -= (e.clientY - look.y) * s;
    pitch = Math.max(mode === "walk" ? -1.1 : -1.5, Math.min(mode === "walk" ? 1.2 : 1.5, pitch));
    look.x = e.clientX; look.y = e.clientY; applyLook(); $("#hint").style.opacity = 0;
  });
  addEventListener("pointerup", e => { if (look && e.pointerId === look.id) look = null; });
  cv.addEventListener("wheel", e => { if (mode === "orbit") return; e.preventDefault(); wheelV = Math.max(-4, Math.min(4, wheelV - e.deltaY * 0.01)); }, { passive: false });
  const pad = $("#joy"), knob = $("#knob"); let jid = null;
  const jmove = e => { const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 18;
    let x = e.clientX - cx, y = e.clientY - cy; const l = Math.hypot(x, y); if (l > max) { x *= max / l; y *= max / l; }
    knob.style.transform = `translate(${x}px,${y}px)`; joy.x = x / max; joy.y = y / max; };
  pad.addEventListener("pointerdown", e => { jid = e.pointerId; pad.setPointerCapture(jid); jmove(e); e.stopPropagation(); flight = null; });
  pad.addEventListener("pointermove", e => { if (e.pointerId === jid) jmove(e); });
  const jend = e => { if (e.pointerId !== jid) return; jid = null; joy.x = joy.y = 0; knob.style.transform = ""; };
  pad.addEventListener("pointerup", jend); pad.addEventListener("pointercancel", jend);
  for (const [id, v] of [["#up", 1], ["#dn", -1]]) { const b = $(id);
    b.addEventListener("pointerdown", e => { vert = v; b.setPointerCapture(e.pointerId); });
    const off = () => vert = 0; b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); }
  document.querySelectorAll("#modes button").forEach(b => b.onclick = () => setMode(b.dataset.mode));
}

const STC = { working: "#3dffa8", "on duty": "#3dffa8", "on call": "#7df9ff", late: "#ffd166", off: "#ff4d6d", unknown: "#7d74a8" };
const staffOf = id => ((M.s.staff || {}).staff || []).filter(x => x.bld === id);
const agoS = s => s == null ? "" : s < 90 ? "just now" : s < 5400 ? Math.round(s / 60) + " min ago" : s < 129600 ? Math.round(s / 3600) + " h ago" : Math.round(s / 86400) + " d ago";
const staffRow = x => `<div class="emp"><span class="av" style="border-color:${STC[x.status] || "#7d74a8"}">${x.emoji}</span>
  <span class="ej"><b>${esc(x.name)}</b> <i style="color:${STC[x.status] || "#7d74a8"}">● ${esc(x.status)}${x.last_s != null ? " · " + agoS(x.last_s) : ""}</i><br>${esc(x.now ? x.now + " · " : "")}${esc(x.job)}</span>
  <button class="assign" data-emp="${esc(x.id)}">Assign</button></div>`;
const staffHTML = id => !staffOf(id).length ? "" : `<div class="staffbox"><div class="lt">👥 Staff here · tap Assign to give them a job</div>${staffOf(id).map(staffRow).join("")}</div>`;
function assign(eid) {
  const x = ((M.s.staff || {}).staff || []).find(y => y.id === eid); if (!x) return;
  openTerm().then(() => { const t = $("#tin"); t.value = `Task for ${x.name} (${x.job}): `; t.dispatchEvent(new Event("input")); t.focus(); });
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-emp]"); if (b) { e.stopPropagation(); assign(b.dataset.emp); } }, true);
function staffPanel() {
  const all = (M.s.staff || {}).staff || [], el = $("#staff");
  if (!all.length) { $("#staffbtn").hidden = true; return; }
  const on = all.filter(x => ["working", "on duty"].includes(x.status)).length;
  $("#staffbtn").textContent = `👥 STAFF · ${on}/${all.length} ON`;
  const bn = id => id === "vault" ? "The Vault" : (M.B.find(b => b.id === id) || {}).name || id;
  const prof = x => !x.profile ? "" : `<details class="prof"><summary>Job profile</summary><p>${esc(x.profile.mission || "")}</p>
    <b>MUST</b><ul>${(x.profile.must || []).map(m => `<li>${esc(m)}</li>`).join("")}</ul>
    <b>NEVER</b><ul>${(x.profile.never || []).map(m => `<li>${esc(m)}</li>`).join("")}</ul><i>Runs: ${esc(x.profile.cron || "")}</i></details>`;
  const rep = x => !x.report ? "" : `<div class="rep">📨 ${esc(x.report.ts.slice(11, 16))} · ${esc(x.report.title)}${(x.report.lines || []).length ? `<br>${x.report.lines.slice(0, 4).map(l => esc(l.slice(0, 140))).join("<br>")}` : ""}</div>`;
  const card = x => `<div class="mgr"><div class="emp"><span class="av big" style="border-color:${STC[x.status] || "#7d74a8"}">${x.emoji}</span>
    <span class="ej"><b>${esc(x.name)}</b> <i style="color:${STC[x.status] || "#7d74a8"}">● ${esc(x.status)}</i><br><span class="ttl">${esc(x.title || x.job)}</span> · <span class="dn" data-id="${esc(x.bld)}">${esc(bn(x.bld))}</span></span>
    <button class="assign" data-emp="${esc(x.id)}">Assign</button></div>${rep(x)}${prof(x)}
    <div class="team">${all.filter(y => y.boss === x.id && y.role !== "manager").map(staffRow).join("")}</div></div>`;
  const ceo = all.find(x => x.role === "ceo"), mgrs = all.filter(x => x.role === "manager");
  el.innerHTML = `<h4>👥 THE FIRM · ${all.length} STAFF</h4><p class="sub2">Who is in, what they are working on, and their job. Performance scores live in the HR Bot.</p>` +
    (ceo ? `<div class="ceo">${card(ceo).replace('<div class="team">', '<div class="team" hidden>')}</div>` : "") + mgrs.map(card).join("");
  el.querySelectorAll(".dn[data-id]").forEach(d => d.onclick = () => { el.hidden = true; focus(d.dataset.id); });
}
const staffTags = [];
function staffFigures() {
  const by = {};
  ((M.s.staff || {}).staff || []).forEach(x => (by[x.bld] = by[x.bld] || []).push(x));
  Object.entries(by).forEach(([bid, xs]) => {
    const b = bid === "vault" ? { pos: VAULT, w: 12, d: 12 } : M.B.find(y => y.id === bid), g = groups[bid]; if (!b || !g) return;
    const f = bid === "vault" ? new THREE.Vector3(0, 0, 1) : faceDir(b), side = new THREE.Vector3(-f.z, 0, f.x), d0 = Math.max(b.w, b.d) / 2 + 2.6;
    xs.forEach((x, i) => {
      const k = i - (xs.length - 1) / 2, col = new THREE.Color(STC[x.status] || "#7d74a8");
      const w = new THREE.Group(); if (x.role) w.scale.setScalar(1.35);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), new THREE.MeshStandardMaterial({ color: 0x1b1036, emissive: col, emissiveIntensity: 0.9 }));
      body.position.y = 0.7; w.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffe0c2, emissive: 0x332211 })); head.position.y = 1.45; w.add(head);
      w.position.copy(f.clone().multiplyScalar(d0).add(side.clone().multiplyScalar(k * 1.3))); w.position.y = 0;
      g.add(w);
      const el = document.createElement("div"); el.className = "tag stag"; el.style.setProperty("--c", STC[x.status] || "#7d74a8");
      el.innerHTML = `<b>${x.emoji} ${esc(x.name)}${x.title ? " · " + esc(x.title.split(" ")[0]) : ""}</b>`; el.onclick = () => assign(x.id);
      const lab = new CSS2DObject(el); lab.position.set(w.position.x, 2.4 + (i % 2) * 0.9, w.position.z); lab.visible = false; g.add(lab);
      staffTags.push({ bid, lab });
      const ph = i * 1.7; anim.push((dt, t) => { w.position.y = Math.abs(Math.sin(t * 2.2 + ph)) * (x.status === "working" ? 0.25 : 0.06); });
    });
  });
}
const showStaffTags = id => staffTags.forEach(o => o.lab.visible = o.bid === id);

function todoNote(t) {
  const el = $("#todo");
  if (!t || !t.items) return (el.hidden = true);
  let ticks = {}; try { ticks = JSON.parse(get("todo-ticks") || "{}"); } catch (e) {}
  const min = get("todo-min") === "1", done = t.items.filter(x => x.done || ticks[x.id]).length;
  const who = Object.fromEntries(((M.s.staff || {}).staff || []).map(x => [x.id, x.name.toUpperCase()]));
  el.hidden = false; el.classList.toggle("min", min);
  el.innerHTML = `<h4><span>📝 ${esc(t.title || "CLIENT PRIORITIES")} · ${done}/${t.items.length}</span><button id="todomin">${min ? "show" : "hide"}</button></h4>` +
    t.items.map(x => { const d = x.done || ticks[x.id];
      return `<label class="${d ? "done" : ""}"><input type="checkbox" data-t="${esc(x.id)}" ${d ? "checked" : ""} ${x.done ? "disabled" : ""}><span>${esc(x.text)}<span class="who">${who[x.who] || ""}</span></span></label>`; }).join("");
  $("#todomin").onclick = () => { try { localStorage.setItem("todo-min", min ? "0" : "1"); } catch (e) {} todoNote(t); };
  el.querySelectorAll("input[data-t]").forEach(i => i.onchange = () => {
    ticks[i.dataset.t] = i.checked; try { localStorage.setItem("todo-ticks", JSON.stringify(ticks)); } catch (e) {} todoNote(t); });
}
$("#askbar").onclick = () => DEMO ? focus("library") : openTerm();

function liveStrip(p) {
  const el = $("#livestats"), st = (M.s.firm || {}).live;
  if (!st) return (el.hidden = true);
  el.hidden = false;
  el.innerHTML = `<span class="lv">● TODAY</span>` +
    `<button data-id="bank">🏦 Statements <b>${num(st.statements)}</b></button>` +
    `<button data-id="sars">🦁 SARS cases <b>${num(st.sars_open)}</b></button>` +
    `<button data-id="ufiling">🤖 UI-19s <b>${num(st.ui19)}</b></button>` +
    `<button data-id="fsreview">↩️ Sendbacks <b>${num(st.sendbacks)}</b></button>`;
}

function hud() {
  const { B, tot, day, feeZar, sales, s } = M;
  groups.vault.userData.el.innerHTML = `<b>FEES COLLECTED · TODAY</b><span style="font:800 18px Sora;color:${day ? "#3dffa8" : "#fff"}">${usd(day)}</span><br><span class="z">${usd(tot)} this month · ${sales} invoices</span>`;
  const dc = { ok: "#3dffa8", down: "#ff4d6d", stale: "#ffd166", unknown: "#7d74a8" };
  const att = (s.pulse || {}).attention || {};
  const why = b => [...(att[b.id] || []), ...(b.status === "down" ? ["Something here is down"] : [])];
  const chip = (id, label, color, w) => `<button class="chip${w.length ? " need" : ""}" data-id="${id}" title="${esc(w.join(" · "))}" style="border-color:${color}88;color:${color}">${w.length ? `<i class="blip"></i>` : ""}${esc(label)}</button>`;
  const names = { vault: "Fees", sars: "SARS", cipc: "CIPC", ufiling: "uFiling", labour: "Labour", warehouse: "Warehouse", billing: "Billing", bank: "Bank stmts", fsreview: "FS Review", hrbot: "HR Bot", ads: "Ads & Web", library: "Library",
    home_dir: "🏠 Johan", home_adm: "🏠 Lerato", home_rec: "🏠 Zanele", home_e1: "🏠 Pieter", home_e2: "🏠 Thandi", home_e3: "🏠 Ruan" };
  const list = [chip("vault", "Fees", "#ffd166", att.vault || [])].concat(B.map(b => chip(b.id, names[b.id] || b.short, hex(b.color), why(b))));
  $("#chips").innerHTML = list.join("");
  M.need = id => id === "vault" ? att.vault || [] : why(B.find(x => x.id === id) || {});
  liveStrip(s.pulse);
  staffPanel();
  todoNote(s.todo);
  document.querySelectorAll("[data-id]").forEach(x => x.onclick = () => focus(x.dataset.id));
  $("#updated").textContent = `data ${ago(s.ts)} · refreshes every 30 min`;
  const rows = B.filter(b => b.id !== "library").map(b => {
    const earned = b.id === "_none" ? (b.zar ? "R" + num(b.zar) : "R0") : usd(b.today);
    const total = b.id === "_none" ? "R" + num(b.zar || 0) : usd(b.total);
    return `<tr><td>${b.icon} ${esc(b.short)}</td><td><span class="dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dc[b.status]}"></span></td><td>${earned}</td><td>${total}</td></tr>`; });
  $("#payroll").innerHTML = `<h4>FEES · TODAY</h4><table><tr><th>Building</th><th>On</th><th>Today</th><th>Month</th></tr>${rows.join("")}</table>
    <p>Thin arcs into the Vault = fee-earning work (bright when paid today). The blue-to-gold arc from Ads & Website to Billing = new client enquiries turning into invoices. A cyan beam into the sky = a bot or Claude is working there right now.</p>`;
}

function vaultSheet() {
  const bi = (M.s.firm || {}).billing || {};
  return sheetHTML("Fees collected", "Money paid in by clients", usd(M.day), "collected today",
    [["This month", usd(bi.paid_month)], ["Invoiced this month", usd(bi.invoiced_month)], ["Outstanding", usd(bi.outstanding)], ["Retainer clients", bi.retainers]],
    (bi.debtors || []).map(x => [x.client, `${usd(x.amount)} · ${x.days} days`]), "Still owed");
}
function focus(id) {
  $("#hint").style.opacity = 0; $("#payroll").hidden = true; $("#staff").hidden = true; showStaffTags(id);
  const g = groups[id]; if (!g) return;
  const b = M.B.find(x => x.id === id);
  const portrait = innerWidth < innerHeight;
  if (id === "vault") {
    fly(new THREE.Vector3(VAULT[0], 6, VAULT[1]), mode === "walk" ? new THREE.Vector3(VAULT[0], EYE, VAULT[1] + 24) : new THREE.Vector3(VAULT[0], 16, VAULT[1] + (portrait ? 34 : 26)));
  } else if (mode !== "walk") {  // three-quarter front view framing the whole building + billboard in the part of the screen the panel leaves free
    const board = g.userData.board, bp = new THREE.Vector3(); board.getWorldPosition(bp);
    const side = innerWidth >= 900, Hpx = innerHeight, Wpx = innerWidth;
    let top = side ? 136 : 128, bottom = side ? Hpx - 110 : Hpx * 0.48, right = side ? Wpx - 430 : Wpx;
    if (DEMO && window.__demoBand) [top, bottom, right] = window.__demoBand(Wpx, Hpx);  // video director leaves room for captions
    const visV = (bottom - top) / Hpx, visH = right / Wpx, cyF = (top + bottom) / 2 / Hpx, cxF = right / 2 / Wpx;
    const H = Math.max(g.userData.top || b.h, bp.y + 3.5) + 1.5, wide = Math.max(b.w, b.d) * 2 + 8;
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), th = tv * camera.aspect;
    const dist = Math.min(340, Math.max(H / (2 * tv * visV), wide / (2 * th * visH)) * 1.08 + Math.max(b.w, b.d) / 2);
    const dir = faceDir(b).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);   // ~30° off the front so the billboard doesn't hide the doors
    const c = new THREE.Vector3(b.pos[0], H / 2, b.pos[1]);
    const pos = c.clone().add(dir.clone().multiplyScalar(dist)); pos.y = H / 2 + dist * 0.36;  // a little above, to see over the neighbours
    const look = c.clone(); look.y -= (0.5 - cyF) * 2 * dist * tv;
    look.add(new THREE.Vector3().crossVectors(dir.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar((0.5 - cxF) * 2 * dist * th));
    fly(look, pos);
  } else {
    const bp = new THREE.Vector3(), board = g.userData.board; board.getWorldPosition(bp);
    const dir = new THREE.Vector3(); board.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const want = (b.kind === "mega" ? 21 : 15) * (portrait ? 1.6 : 1);
    const room = Math.hypot(bp.x, bp.z) - 11, dist = mode === "walk" ? Math.min(want, room) : want;
    const pos = bp.clone().add(dir.multiplyScalar(dist));
    pos.y = mode === "walk" ? EYE : dist > room ? Math.max(bp.y + 4, 15) : bp.y + 2.5;  // hop over the Vault dome when backing up
    const look = bp.clone(); if (portrait && id !== "library") look.y -= 3.2;  // board sits above the stats sheet
    if (!portrait && innerWidth >= 900 && id !== "library") look.add(new THREE.Vector3(dir.z, 0, -dir.x).setLength(b.kind === "mega" ? 6 : 4.5));  // room for the side panel
    fly(look, pos);
  }
  if (id === "library" && !DEMO) return openTerm();
  closeTerm();
  const sheet = $("#sheet"); sheet.style.setProperty("--c", id === "vault" ? "#ffd166" : hex(b.color));
  const nd = !DEMO && M.need ? M.need(id) : [];
  $("#sheetbody").innerHTML = (nd.length ? `<div class="needs"><b><i class="blip"></i>NEEDS YOU</b>${nd.map(x => `<div>${esc(x)}</div>`).join("")}</div>` : "") +
    (id === "vault" ? vaultSheet() : b.sheet()) + staffHTML(id) + actionsHTML(id) + linksHTML(id);
  sheet.hidden = false; sheet.scrollTop = 0;
}

function fly(target, pos) {
  flight = { t0: performance.now(), t: 0, ft: controls.target.clone(), fp: camera.position.clone(), tt: target, tp: pos };
}
function home(instant) {
  showStaffTags(null);
  const t = new THREE.Vector3(0, 4, -4), p = MOBILE && innerWidth < innerHeight ? new THREE.Vector3(0, 215, 190) : new THREE.Vector3(0, 125, 135);  // above a street, looking into the park
  if (mode !== "orbit") setMode("orbit", true);
  if (instant) { controls.target.copy(t); camera.position.copy(p); } else fly(t, p);
}

function addrEventListeners() {
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); labels.setSize(innerWidth, innerHeight);
  });
  const ray = new THREE.Raycaster(), v = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener("pointerdown", e => down = [e.clientX, e.clientY, Date.now()]);
  renderer.domElement.addEventListener("pointerup", e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8 || Date.now() - down[2] > 450) return;
    v.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v, camera);
    const hit = ray.intersectObjects(picks, false)[0]; if (hit) focus(hit.object.userData.bid);
  });
  controls.addEventListener("start", () => { flight = null; $("#hint").style.opacity = 0; });
  freeInput();
  $("#home").onclick = () => { $("#sheet").hidden = true; closeTerm(); home(); };
  $("#sheetx").onclick = () => $("#sheet").hidden = true;
  $("#payrollbtn").onclick = () => { $("#staff").hidden = true; $("#payroll").hidden = !$("#payroll").hidden; };
  $("#staffbtn").onclick = () => { $("#payroll").hidden = true; $("#staff").hidden = !$("#staff").hidden; };
  $("#lockbtn").onclick = () => { set(KEY, null); location.reload(); };
  $("#refresh").onclick = () => reload();
  $("#bananas").onclick = async () => {  // Go Bananas: the server re-collects every source (update.sh), then we reload the data
    const btn = $("#bananas"); if (btn.disabled) return; btn.disabled = true; btn.textContent = "🍌 Going…";
    try {
      const r = await (await fetch("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pw: PW }) })).json();
      if (r.error) btn.textContent = "🍌 " + r.error;
      else if (!r.started) btn.textContent = `🍌 Done recently, try in ${Math.ceil((r.wait || 60) / 60)} min`;
      else { btn.textContent = "🍌 Collecting… (about 2 min)"; await new Promise(z => setTimeout(z, 120000)); await reload(); btn.textContent = "🍌 Fresh!"; }
    } catch (e) { btn.textContent = "🍌 Couldn't reach the server"; }
    setTimeout(() => { btn.textContent = "🍌 Go Bananas"; btn.disabled = false; }, 8000);
  };
}

window.__city = () => ({ camera, controls, flight, groups });
if (DEMO) window.__demo = { applySkin: id => applySkin(id), focus, setMode, home, fly, keys, look: (y, p) => { yaw = y; pitch = p; applyLook(); }, get mode() { return mode; } };  // DEMO-only hook for scripted walkthrough videos
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (flight) {
    flight.t = Math.min(1, (performance.now() - flight.t0) / 1300); const k = flight.t < .5 ? 4 * flight.t ** 3 : 1 - (-2 * flight.t + 2) ** 3 / 2;
    controls.target.lerpVectors(flight.ft, flight.tt, k); camera.position.lerpVectors(flight.fp, flight.tp, k);
    if (mode !== "orbit") { camera.lookAt(controls.target); syncLook(); }
    if (flight.t >= 1) flight = null;
  } else if (mode !== "orbit") freeMove(dt);
  anim.forEach(f => f(dt, t));
  if (mode === "orbit") controls.update();
  composer.render(); labels.render(scene, camera);
}

function tick() { $("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

const LKEY = "library-pass";  // the Library has its own strong password (it can run anything on the server)
async function api(path, opt = {}) {
  return fetch(API + path, { ...opt, headers: { Authorization: "Bearer " + (get(LKEY) || ""), "Content-Type": "application/json", ...(opt.headers || {}) } });
}
async function services() {
  if (DEMO) { svc = D?.services || null; return null; }
  try { const r = await api("/status"); if (r.ok) { const j = await r.json(); svc = j.services; return j; } } catch (e) {}
  svc = null; return null;
}

let tBusy = false, tRun = 0, tSeen = 0, aiEl = null;
const tlog = () => $("#tlog");
function tAdd(cls, text) { const d = document.createElement("div"); d.className = cls; d.textContent = text; tlog().append(d); tScroll(); return d; }
function tScroll() { const l = tlog(); if (l.scrollHeight - l.scrollTop - l.clientHeight < 160) l.scrollTop = l.scrollHeight; }
function setBusy(b) { tBusy = b; $("#tstop").hidden = !b; $("#tin").placeholder = b ? "Add a message: Claude pauses, reads it, then carries on…" : "Talk to Claude…"; if (!b) document.querySelectorAll("#tlog .cursor").forEach(c => c.remove()); }

async function openTerm() {
  $("#sheet").hidden = true; $("#term").hidden = false;
  if (tlog().childElementCount) return;
  if (!get(LKEY)) return libraryLogin();
  const st = await services();
  if (!st) {
    tAdd("sys", "The Library is closed: the portal on the server isn't switched on yet (it needs the owner's approval in the terminal).");
    tAdd("sys", "Until then you can reach Claude in the Claude app (Code tab) or with /remote-control.");
    $("#tsend").disabled = true; return;
  }
  try {
    const h = await (await api("/history")).json();
    h.rows.forEach(r => r.role === "owner" ? tAdd("me", r.text) : r.role === "claude" ? tAdd("ai", r.text) : tAdd("sys", r.text));
    if (!h.rows.length) tAdd("sys", "Welcome to the Library. Same Claude as the terminal: ask anything, or say \"Go Bananas\".");
    if (h.busy) { tRun = h.run; attach(api("/stream?from=0")); }
  } catch (e) { tAdd("sys", "Couldn't load history."); }
  tlog().scrollTop = 1e9;
}
function closeTerm() { $("#term").hidden = true; }
function libraryLogin(msg) {
  tlog().innerHTML = ""; $("#tsend").disabled = true;
  tAdd("sys", msg || "The Library has its own password (separate from the City one). Enter it once; this device remembers it.");
  const f = document.createElement("form"); f.className = "llogin";
  f.innerHTML = `<input type="password" placeholder="Library password" autocomplete="current-password" required><button>Open the Library</button>`;
  f.onsubmit = async e => {
    e.preventDefault(); const v = f.querySelector("input").value.trim(); set(LKEY, v);
    let r = null; try { r = await api("/status"); } catch (err) {}
    if (r && r.ok) { tlog().innerHTML = ""; $("#tsend").disabled = false; return openTerm(); }
    set(LKEY, null);
    libraryLogin(r && r.status === 429 ? "Too many wrong tries. Wait 15 minutes." : r ? "Wrong password, try again." : "The Library is closed: the server didn't answer.");
  };
  tlog().append(f); f.querySelector("input").focus();
}

let tGen = 0;  // newest attach wins: an older stream that ends (e.g. a run paused for a new message) must not flip the UI to idle
async function attach(req) {
  const my = ++tGen; setBusy(true); aiEl = tAdd("ai", ""); const cur = document.createElement("span"); cur.className = "cursor"; aiEl.after(cur);
  let txt = "", buf = "";
  try {
    const r = await req;
    if (r.status === 409) { tAdd("sys", "Claude is still busy with the previous message."); return setBusy(false); }
    if (!r.ok) { tAdd("sys", "Portal error " + r.status); return setBusy(false); }
    const rd = r.body.getReader(), dec = new TextDecoder();
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
        const e = JSON.parse(line); if (e.n) tSeen = e.n; if (e.run) tRun = e.run;
        if (e.t === "text") { txt += e.d; aiEl.textContent = txt; tScroll(); }
        else if (e.t === "tool") { const d = document.createElement("div"); d.className = "tool"; d.textContent = e.d; aiEl.before(d); tScroll(); }
        else if (e.t === "done") { if (e.paused) tAdd("sys", "⏸ Paused here to read your new message."); if (e.stopped) tAdd("sys", "Stopped."); else if (!e.paused) tAdd("sys", "✓ done"); }
      }
    }
    if (my === tGen) setBusy(false);
  } catch (e) {
    if (my !== tGen) return;  // phone slept or network blipped: re-attach to the same run
    const st = await services();
    if (st && st.busy && st.run === tRun) { aiEl.remove(); document.querySelectorAll("#tlog .cursor").forEach(c => c.remove()); return attach(api(`/stream?from=0`)); }
    setBusy(false); if (!txt) tAdd("sys", "Connection lost. Reopen the Library to see the reply.");
  }
}

$("#tform").addEventListener("submit", e => {
  e.preventDefault(); const msg = $("#tin").value.trim(); if (!msg) return;
  if (tBusy) tAdd("sys", "⏸ Pausing Claude to read this first. It saves what it did and carries on after.");
  tAdd("me", msg); $("#tin").value = ""; $("#tin").style.height = "";
  attach(api("/chat", { method: "POST", body: JSON.stringify({ msg }) }));
});
$("#tin").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !MOBILE) { e.preventDefault(); $("#tform").requestSubmit(); } });
$("#tin").addEventListener("input", e => { e.target.style.height = ""; e.target.style.height = Math.min(180, e.target.scrollHeight) + "px"; });
$("#tx").onclick = closeTerm;
$("#sheetbody").addEventListener("click", e => { const b = e.target.closest("button.ask"); if (b) ask(b.dataset.p); });
$("#tstop").onclick = () => api("/stop", { method: "POST", body: "{}" });
$("#tnew").onclick = async () => { if (tBusy) return; await api("/new", { method: "POST", body: "{}" }); tlog().innerHTML = ""; tAdd("sys", "New conversation. Claude still has its memory notes."); };

function build() {
  M = model(D);
  ground(); vault(); M.B.forEach(building); flowBeam(); moneyBeams(); workBeams(); life(); staffFigures(); hud();
  applySkin(SKIN.id);
}

const SKINS = [
  { id: "neon", name: "Neon Night", price: 0, swatch: ["#0a0420", "#ff2bd6", "#00f0ff"],
    bg: 0x0a0420, fog: 0x1a0b3a, fogD: 0.0042, hemi: [0x9c7bff, 0x10052a, 0.9], sun: [0xc9b8ff, 0.8], bloom: 0.6, exposure: 1.05, weather: { kind: "rain" } },
  { id: "golden", name: "Golden Hour", price: 1, swatch: ["#ff8a3d", "#ffd166", "#7a2e5a"],
    bg: 0xf08a4b, fog: 0xf2a65a, fogD: 0.0018, hemi: [0xffd6a0, 0x5a2a3a, 1.25], sun: [0xffb36b, 1.6], bloom: 0.35, exposure: 1.1,
    tint: { hue: 0.07, hueMix: 0.45, sat: 1.05, light: 1.05 }, weather: { kind: "none" } },
  { id: "arctic", name: "Arctic Snow", price: 1, swatch: ["#cfe6ff", "#ffffff", "#5fb8ff"],
    bg: 0xbcd6f2, fog: 0xd8e8fa, fogD: 0.002, hemi: [0xffffff, 0x8aa6c8, 1.5], sun: [0xffffff, 1.2], bloom: 0.25, exposure: 1.0,
    tint: { hue: 0.57, hueMix: 0.6, sat: 0.55, light: 1.25 }, ground: { asphalt: 0xe9f1fa, grass: 0xf4f8ff }, weather: { kind: "snow", color: 0xffffff, speed: 0.12, len: 0.25, opacity: 0.9 } },
  { id: "matrix", name: "Matrix", price: 1, swatch: ["#000000", "#22ff66", "#0a3d1a"],
    bg: 0x000300, fog: 0x001a06, fogD: 0.0048, hemi: [0x3dff7a, 0x000000, 0.7], sun: [0x7dffa0, 0.5], bloom: 0.85, exposure: 1.0,
    tint: { hue: 0.36, hueMix: 1, sat: 1.1 }, ground: { asphalt: 0x000000, grass: 0x031a08 }, weather: { kind: "rain", color: 0x22ff66, speed: 0.6, len: 2.2, opacity: 0.55 } },
  { id: "vapor", name: "Vaporwave", price: 1, swatch: ["#2b1055", "#ff71ce", "#01cdfe"],
    bg: 0x2b1055, fog: 0x7a2c8f, fogD: 0.0026, hemi: [0xff71ce, 0x01cdfe, 1.0], sun: [0xfffb96, 0.9], bloom: 0.7, exposure: 1.1,
    tint: { hue: 0.88, hue2: 0.52, hueMix: 0.85, sat: 1.15, light: 1.08 }, ground: { asphalt: 0x1a0638, grass: 0x3a1a6a }, weather: { kind: "none" } },
  { id: "day", name: "Sunny Day", price: 1, swatch: ["#7cc8ff", "#ffffff", "#4caf50"],
    bg: 0x8fd0ff, fog: 0xbfe4ff, fogD: 0.0011, hemi: [0xffffff, 0x6b8f5a, 1.6], sun: [0xfff3d6, 2.0], bloom: 0.12, exposure: 1.0,
    tint: { sat: 0.85, light: 1.1 }, ground: { asphalt: 0x3a3f4a, grass: 0x4caf50 }, weather: { kind: "none" } },
];
const OWNED = window.CITY_SKINS_OWNED || null;  // kit buyers: list of unlocked skin ids (null = all, as in our own city and the demo preview)
let SKIN = SKINS.find(k => k.id === get("firm-skin")) || SKINS.find(k => k.id === "day");
const tmpC = new THREE.Color(), hsl = {};
function tintColor(c, t) {
  if (!t) return c;
  c.getHSL(hsl); let h = hsl.h;
  const target = t.hue2 != null && Math.abs(((h - t.hue2 + 1.5) % 1) - 0.5) < Math.abs(((h - t.hue + 1.5) % 1) - 0.5) ? t.hue2 : t.hue;
  if (target != null) { let d = ((target - h + 1.5) % 1) - 0.5; h = (h + d * (t.hueMix ?? 1) + 1) % 1; }
  c.setHSL(h, Math.min(1, hsl.s * (t.sat ?? 1)), Math.min(1, hsl.l * (t.light ?? 1)));
  if (t.gray) c.lerp(tmpC.setScalar(c.getHSL(hsl).l), t.gray);
  return c;
}
function applySkin(id) {
  SKIN = SKINS.find(k => k.id === id) || SKINS[0];
  const k = SKIN, base = SKINS[0];
  scene.background = new THREE.Color(k.bg); scene.fog.color.set(k.fog); scene.fog.density = k.fogD;
  renderer.toneMappingExposure = k.exposure; if (bloom) bloom.strength = k.bloom;
  const seen = new Set();
  scene.traverse(o => {
    if (o.isHemisphereLight) { o.color.set(k.hemi[0]); o.groundColor.set(k.hemi[1]); o.intensity = k.hemi[2]; }
    if (o.isDirectionalLight) { o.color.set(k.sun[0]); o.intensity = k.sun[1]; }
    if (o.userData.weather) {
      const w = k.weather || {}; o.visible = w.kind !== "none";
      o.material.color.set(w.color ?? 0x9fb6ff); o.material.opacity = w.opacity ?? 0.28; return;
    }
    if (o.isInstancedMesh && o.instanceColor) {
      const ic = o.instanceColor; if (!o.userData.ic0) o.userData.ic0 = ic.array.slice();
      for (let i = 0; i < o.count; i++) { tmpC.fromArray(o.userData.ic0, i * 3); tintColor(tmpC, k.tint).toArray(ic.array, i * 3); }
      ic.needsUpdate = true;
    }
    for (const m of [].concat(o.material || [])) {
      if (seen.has(m)) continue; seen.add(m);
      const u = m.userData;
      if (m.color) { u.c0 ??= m.color.getHex(); m.color.setHex(u.c0); }
      if (m.emissive) { u.e0 ??= m.emissive.getHex(); m.emissive.setHex(u.e0); }
      const g = k.ground || {};
      if (u.c0 === 0x0b0716 && g.asphalt != null) { m.color.set(g.asphalt); continue; }
      if (u.c0 === 0x1d6b3c && g.grass != null) { m.color.set(g.grass); if (m.emissive) m.emissive.set(g.grass).multiplyScalar(0.15); continue; }
      if (m.map && m.color && m.color.getHex() === 0xffffff) continue;  // textured screens/billboards keep their own colours
      if (m.color) tintColor(m.color, k.tint);
      if (m.emissive && m.emissive.getHex() !== 0xffffff) tintColor(m.emissive, k.tint);
    }
  });
  set("firm-skin", SKIN.id);
  if (!$("#skins").hidden) skinPicker();
}
function skinPicker() {
  const el = $("#skins"), own = id => !OWNED || OWNED.includes(id) || id === "neon";
  el.innerHTML = `<h4>🎨 City skins</h4><p>${DEMO ? "Preview every skin free. Extra skins are $1 each." : OWNED ? "Locked skins are $1 each on the Side Hustle City page." : "Tap a skin to switch the whole city."}</p>
    <div class="g">${SKINS.map(k => `<button class="sk${k.id === SKIN.id ? " on" : ""}" data-sk="${k.id}"><div class="sw" style="background:linear-gradient(120deg,${k.swatch.join(",")})"></div>
      <span class="nm">${esc(k.name)}<i>${k.price ? (own(k.id) ? (DEMO ? "$1" : "") : "🔒 $1") : "free"}</i></span></button>`).join("")}</div>`;
  el.querySelectorAll("[data-sk]").forEach(b => b.onclick = () => own(b.dataset.sk) ? applySkin(b.dataset.sk)
    : window.CITY_SKIN_SHOP ? window.open(window.CITY_SKIN_SHOP, "_blank") : alert("This skin is $1 on the Side Hustle City page (link in your order email). Then add its id to skins.js."));
}
$("#skinbtn").onclick = () => { const el = $("#skins"); el.hidden = !el.hidden; if (!el.hidden) skinPicker(); };
async function reload() {
  try { D = await decrypt(PW); } catch (e) { return; }
  await services();
  picks.length = 0; anim.length = 0; Object.keys(groups).forEach(k => delete groups[k]);
  labels.domElement.innerHTML = "";
  while (scene.children.length) scene.remove(scene.children[0]);
  scene.add(new THREE.HemisphereLight(0x9c7bff, 0x10052a, 0.9));
  const moon = new THREE.DirectionalLight(0xc9b8ff, 0.8); moon.position.set(-40, 80, 30); scene.add(moon);
  build();
}
async function enter(pw, remember) {
  $("#loading").hidden = false;
  try { D = await decrypt(pw); } catch (e) { $("#loading").hidden = true; $("#err").hidden = false; set(KEY, null); return; }
  PW = pw; if (remember) set(KEY, pw);
  $("#lock").hidden = true;
  await Promise.all([document.fonts.load("800 54px Sora"), document.fonts.load("600 30px Inter"), services()]).catch(() => {});
  initScene(); build();
  $("#loading").hidden = true; $("#hud").hidden = false;
  tick(); setInterval(tick, 15000);
  setTimeout(() => $("#hint").style.opacity = 0, 9000);
  setInterval(reload, 10 * 60 * 1000);
  loop();
}
$("#unlock").addEventListener("submit", e => { e.preventDefault(); enter($("#pw").value, $("#remember").checked); });
const saved = get(KEY); if (DEMO) enter("demo", false); else if (saved) enter(saved, true);
if (!DEMO && "serviceWorker" in navigator) navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {});
