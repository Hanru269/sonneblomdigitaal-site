import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

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
const GKEY = DEMO ? null : new URLSearchParams(location.hash.slice(1)).get("g"), GUEST = !!GKEY;
const GUEST_QA = "" + encodeURIComponent(GKEY || "");
const scrub = t => t;

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decrypt(pw) {
  if (DEMO) {  // sample data; sales marked {ago: minutes} are moved to 'today' so the money beams light up
    const d = await (await fetch("demo.json?t=" + Date.now(), { cache: "no-store" })).json();
    d.snapshot.ts = new Date(Date.now() - 4 * 60000).toISOString();
    return d;
  }
  const enc = await (await fetch((GUEST ? "../data.guest.enc.json" : "../data.enc.json") + "?t=" + Date.now(), { cache: "no-store" })).json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(enc.salt), iterations: enc.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.ct))));
}

function model(D) {
  const s = D.snapshot, f = s.consult || {};
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const co = f.coida || {}, uf = f.ufiling || {}, na = f.nappi || {}, pr = f.payroll || {}, ml = f.mail || {}, bi = f.billing || {},
    dl = f.deadlines || {}, web = f.web || {}, dc = f.docs || {}, ai = f.aistaff || [];
  const rows = xs => (xs || []).map(x => [`${x.client} · ${x.type}`, `${x.status}${x.due ? " · due " + x.due : ""}`]);
  const top = [...ai].sort((a, b) => b.tasks - a.tasks);
  const B = [
    { id: "coida", name: "Compensation Fund", short: "COIDA", icon: "🦺", color: 0xd97706, pos: [-25, 6], w: 14, d: 10, h: 11, kind: "market", status: "ok", today: 0, total: 0,
      tag: [`${co.logs_valid}/${co.clients} good standing`, `${co.claims_open} claims open`],
      board: { title: "COMPENSATION FUND", main: `${co.logs_valid}/${co.clients}`, mainLabel: "clients with a valid Letter of Good Standing",
        rows: [["LOGS expiring (30 days)", co.logs_expiring], ["Injury claims open", co.claims_open], ["Registrations busy", co.registrations], ["ROEs submitted", `${co.roe_done}/${co.clients}`]] },
      sheet: () => sheetHTML("Compensation Fund (COIDA)", "Registrations, Return of Earnings, Letters of Good Standing and injury-on-duty claims on CompEasy", `${co.logs_valid}/${co.clients}`, "clients in good standing",
        [["LOGS expiring in 30 days", co.logs_expiring], ["Injury claims open", co.claims_open], ["New registrations busy", co.registrations], ["ROEs submitted this year", `${co.roe_done}/${co.clients}`], ["Assessments to pay", co.assessments], ["Objections lodged", co.objections]],
        rows(co.items), "On CONNIE's desk", "", "CONNIE checks every client's CompEasy status each morning, renews LOGS before they expire and chases medical reports for open claims.") },
    { id: "ufiling", name: "uFiling · UIF", short: "UFILING", icon: "📮", color: 0x2b6cb0, pos: [25, 6], w: 11, d: 9, h: 9, kind: "market", status: "ok", today: 0, total: 0,
      tag: [`${uf.declared}/${uf.clients} declared`, `${uf.ui19_month} UI-19s`],
      board: { title: "UFILING · UIF", main: `${uf.declared}/${uf.clients}`, mainLabel: `September declarations done · due ${uf.due}`,
        rows: [["UI-19s this month", uf.ui19_month], ["Employees covered", uf.employees], ["Benefit claims open", uf.claims_open], ["Errors to fix", uf.errors]] },
      sheet: () => sheetHTML("uFiling · UIF", "Monthly UIF declarations, UI-19 forms for starters and leavers, and benefit claims for employees", `${uf.declared}/${uf.clients}`, "declarations done this month",
        [["Due by", uf.due], ["UI-19s this month", uf.ui19_month], ["Employees covered", uf.employees], ["Benefit claims open", uf.claims_open], ["Errors to fix", uf.errors], ["Paid on time", uf.on_time + "%"]],
        (uf.latest || []).map(x => [x.client, x.what]), "Latest from UMA", "", "UMA reads each client's payroll, files the declaration and the UI-19s, and flags missing ID numbers before anything is submitted.") },
    { id: "nappi", name: "NAPPI Code Office", short: "NAPPI", icon: "💊", color: 0x7c3aed, pos: [0, 32], w: 9, d: 7, h: 7, kind: "dome", status: "ok", today: 0, total: 0,
      tag: [`${na.issued_month} codes issued`, `${na.open} applications open`],
      board: { title: "NAPPI CODES", main: String(na.issued_month), mainLabel: "NAPPI codes issued this month",
        rows: [["Applications open", na.open], ["With MediKredit", na.submitted], ["Price updates (SEP)", na.price_updates], ["Avg days to issue", na.avg_days]] },
      sheet: () => sheetHTML("NAPPI Code Office", "NAPPI code applications and price updates for medicine, surgical and consumable products, so medical aids can pay claims", na.issued_month, "codes issued this month",
        [["Applications open", na.open], ["Submitted to MediKredit", na.submitted], ["Waiting on client info", na.waiting], ["Price updates (SEP)", na.price_updates], ["Avg days to issue", na.avg_days], ["Supplier clients", na.clients]],
        rows(na.items), "In progress", "", "NIA builds each application from the client's product list, checks it before submission and tells the client the moment a code is issued.") },
    { id: "payroll", name: "Payroll House", short: "PAYROLL", icon: "💵", color: 0x16a34a, pos: [-28, 46], w: 9, d: 8, h: 16, kind: "glass", status: "ok", today: 0, total: 0,
      tag: [`${pr.runs_done}/${pr.clients} payrolls run`, `${num(pr.payslips)} payslips`],
      board: { title: "PAYROLL", main: `${pr.runs_done}/${pr.clients}`, mainLabel: "October payrolls run",
        rows: [["Payslips this month", num(pr.payslips)], ["EMP201 due", pr.emp201_due], ["EMP501 submitted", `${pr.emp501_done}/${pr.clients}`], ["Queries open", pr.queries]] },
      sheet: () => sheetHTML("Payroll House", "Monthly payroll, payslips, EMP201 (PAYE, UIF, SDL) and the EMP501 reconciliation for every client", `${pr.runs_done}/${pr.clients}`, "October payrolls run",
        [["Payslips this month", num(pr.payslips)], ["Employees paid", num(pr.employees)], ["EMP201 due", pr.emp201_due], ["EMP501 (interim) submitted", `${pr.emp501_done}/${pr.clients}`], ["Leave + salary queries", pr.queries], ["Payday", pr.payday]],
        (pr.runs || []).map(x => [x.client, x.status]), "This month's runs", "", "PAM imports hours and changes, runs the payroll and sends payslips. You approve each run before it is final.") },
    { id: "mail", name: "Mail Room · 2 inboxes", short: "MAIL ROOM", icon: "📧", color: 0xec4899, pos: [28, 46], w: 9, d: 7, h: 11, kind: "mail", status: "ok", today: 0, total: 0,
      tag: [`${ml.handled_today} emails handled`, `${ml.drafts} drafts for you`],
      board: { title: "MAIL ROOM", main: String(ml.handled_today), mainLabel: "emails sorted and answered today",
        rows: [[ml.box1.split("@")[0] + "@", `${ml.unread1} unread`], [ml.box2.split("@")[0] + "@", `${ml.unread2} unread`], ["Drafts waiting for you", ml.drafts], ["Avg reply time", ml.reply_min + " min"]] },
      sheet: () => sheetHTML("Mail Room", "megan@ and admin@primepathconsulting.co.za in one place. EMMA reads, sorts by client and service, answers the simple ones and drafts the rest for you.", ml.handled_today, "emails handled today",
        [[ml.box1.split("@")[0] + "@ unread", ml.unread1], [ml.box2.split("@")[0] + "@ unread", ml.unread2], ["Drafts waiting for your OK", ml.drafts], ["Auto-answered today", ml.auto], ["Documents filed from email", ml.attachments], ["Avg reply time", ml.reply_min + " min"]],
        (ml.latest || []).map(x => [`${x.from} · ${x.subject}`, x.action]), "Latest emails", "", "Anything about money, a complaint or a new client always waits for you. EMMA never sends those on her own.") },
    { id: "billing", name: "Billing", short: "BILLING", icon: "🧾", color: 0xeab308, pos: [-28, -36], w: 7, d: 7, h: 14, kind: "coin", status: "ok", today: bi.paid_today || 0, total: bi.paid_month || 0,
      tag: [`R${num(bi.outstanding)} outstanding`, `${bi.overdue} overdue`],
      board: { title: "BILLING", main: "R" + num(bi.invoiced_month), mainLabel: "invoiced this month",
        rows: [["Paid this month", "R" + num(bi.paid_month)], ["Outstanding", "R" + num(bi.outstanding)], ["Overdue 60+ days", bi.overdue], ["Retainer clients", bi.retainers]] },
      sheet: () => sheetHTML("Billing", "Monthly retainers and once-off work (registrations, NAPPI applications, LOGS, claims)", "R" + num(bi.invoiced_month), "invoiced this month",
        [["Paid this month", "R" + num(bi.paid_month)], ["Paid today", "R" + num(bi.paid_today)], ["Outstanding", "R" + num(bi.outstanding)], ["Overdue 60+ days", bi.overdue], ["Invoices sent", bi.invoices], ["Retainer clients", bi.retainers]],
        (bi.debtors || []).map(x => [x.client, `R${num(x.amount)} · ${x.days} days`]), "Still owed", "", "BELLA sends invoices on the 1st and friendly reminders after 30 days. Final demands only go out after you say so.") },
    { id: "deadlines", name: "Deadline Tower", short: "DEADLINES", icon: "⏰", color: 0x0ea5e9, pos: [28, -36], w: 9, d: 7, h: 12, kind: "rnd", status: "ok", today: 0, total: 0,
      tag: [`next: ${(dl.next || [])[0]?.what || "–"}`, `${dl.week} this week`],
      board: { title: "DEADLINE TOWER", main: String(dl.week), mainLabel: "deadlines in the next 7 days",
        rows: (dl.next || []).slice(0, 4).map(x => [x.what, x.when]) },
      sheet: () => sheetHTML("Deadline Tower", "Every client deadline (SARS, UIF, Compensation Fund, payroll) in one calendar. DEE reminds clients and you in time.", dl.week, "deadlines in the next 7 days",
        [["This week", dl.week], ["This month", dl.month], ["Missed this year", dl.missed], ["Reminders sent today", dl.reminders]],
        (dl.next || []).map(x => [x.what, x.when]), "Coming up", "") },
    { id: "web", name: "Website & Leads", short: "WEBSITE", icon: "🌐", color: 0x3b82f6, pos: [-60, -44], w: 10, d: 10, h: 26, kind: "media", status: "ok", today: 0, total: 0,
      tag: [`${num(web.visits)} visits`, `${web.leads} new enquiries`],
      board: { title: "WEBSITE & LEADS", main: String(web.leads), mainLabel: "new client enquiries this month",
        rows: [["Website visits", num(web.visits)], ["Most asked", web.top], ["Google reviews", `${web.reviews} (${web.stars}★)`], ["Quotes sent", web.quotes]] },
      sheet: () => sheetHTML("Website & Leads", "primepathconsulting.co.za contact form, Google Business profile and Facebook. LEXI answers new enquiries within minutes and books calls.", web.leads, "new enquiries this month",
        [["Website visits", num(web.visits)], ["Quotes sent", web.quotes], ["New clients signed", web.signed], ["Most asked for", web.top], ["Google reviews", `${web.reviews} (${web.stars}★)`], ["Calls booked", web.calls]],
        (web.latest || []).map(x => [x.who, x.what]), "Latest enquiries", "") },
    { id: "docs", name: "Document Room", short: "DOCUMENTS", icon: "🗂️", color: 0x14b8a6, pos: [60, 24], w: 12, d: 9, h: 8, kind: "warehouse", status: "ok", today: 0, total: 0, fill: pct(dc.received, dc.requested) / 100,
      tag: [`${dc.requested - dc.received} documents missing`, `${pct(dc.received, dc.requested)}% received`],
      board: { title: "DOCUMENT ROOM", main: pct(dc.received, dc.requested) + "%", mainLabel: "requested documents received",
        rows: [["Requested", dc.requested], ["Received", dc.received], ["Still missing", dc.requested - dc.received], ["Chased today", dc.chased]] },
      sheet: () => sheetHTML("Document Room", "Payroll files, ID copies, medical reports and product lists from clients. DORA files them and chases what's missing.", pct(dc.received, dc.requested) + "%", "documents received",
        [["Requested", dc.requested], ["Received", dc.received], ["Still missing", dc.requested - dc.received], ["Chased today", dc.chased], ["Client files", dc.files]],
        (dc.missing || []).map(x => [x.client, x.what]), "Still missing", "") },
    { id: "staffroom", name: "AI Staff Room", short: "AI STAFF", icon: "🤖", color: 0xf472b6, pos: [60, 48], w: 8, d: 8, h: 14, kind: "git", status: "ok", today: 0, total: 0,
      tag: [`${num(ai.reduce((a, x) => a + x.tasks, 0))} tasks this month`, `${ai.reduce((a, x) => a + x.hours, 0)} h saved`],
      board: { title: "AI STAFF ROOM", main: ai.reduce((a, x) => a + x.hours, 0) + " h", mainLabel: "hours of work saved this month",
        rows: top.slice(0, 4).map(x => [x.name, `${num(x.tasks)} tasks · ${x.right}% right`]) },
      sheet: () => sheetHTML("AI Staff Room", "Your AI employees: what each one did this month and how often you had to fix their work", ai.reduce((a, x) => a + x.hours, 0) + " h", "hours saved this month",
        [["AI employees", ai.length], ["Tasks done", num(ai.reduce((a, x) => a + x.tasks, 0))], ["Sent back by you", ai.reduce((a, x) => a + x.back, 0)], ["Cost per month", "R" + num(f.ai_cost)]],
        top.map(x => [`${x.name} · ${x.job}`, `${num(x.tasks)} tasks · ${x.back} fixed`]), "Ranking", "", "Tap 👥 STAFF at the top to see every AI employee, what they are busy with and their job rules.") },
    { id: "library", name: "The Library", short: "LIBRARY", icon: "📚", color: 0xe8a87c, pos: [0, -66], w: 20, d: 12, h: 12, kind: "library", status: "ok", today: 0, total: 0,
      tag: ["Claude", "tap to talk"],
      board: { title: "THE LIBRARY", main: "CLAUDE", mainLabel: "the manager of your AI staff", rows: [["AI employees", ai.length], ["Data", ago(s.ts)]] },
      sheet: () => sheetHTML("The Library", "Where you talk to Claude, who runs your AI employees", "Claude", "AI assistant",
        [["Model", "Claude"], ["Runs", "24/7"], ["Can", "read your inboxes, run the bots, update the city"]], [], "",
        "In the live version this opens a chat. Ask things like \"Which clients' Letters of Good Standing expire this month?\" or \"Tell PAM to run Mokoena's payroll\" and it gets done.") },
  ];
  const day = bi.paid_today || 0, tot = bi.paid_month || 0;
  return { flow: { clicks: web.leads, views: web.visits, ads: 1 }, working: D.working || [], B, s, tot, day, feeZar: 0, sales: bi.invoices || 0 };
}
const svLabel = n => !svc ? "unknown" : svc[n] === "active" ? "🟢 running" : "🔴 " + (svc[n] || "down");

const LINKS = {};
const ACTIONS = {};
const actionsHTML = id => DEMO || GUEST || !ACTIONS[id] ? "" : `<div class="links acts2"><div class="lt">Quick actions · Claude does it in the Library</div>${ACTIONS[id](M.s).map(([t, p]) => `<button class="ask" data-p="${esc(p)}">${esc(t)}</button>`).join("")}</div>`;
async function ask(msg) {
  await openTerm();
  $("#tin").value = msg; $("#tin").dispatchEvent(new Event("input"));
  if ($("#tsend").disabled || !get(LKEY)) return;  // Library login first: the task waits in the box
  $("#tform").requestSubmit();
}
const linksHTML = id => !DEMO && !GUEST && (LINKS[id] || []).length ? `<div class="links"><div class="lt">Quick links</div>${LINKS[id].map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join("")}</div>` : "";

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

function shelfHTML(title, items) {
  if (!items.length) return "";
  return `<div class="shelf"><div class="lt">${esc(title)} · ${items.length}</div><div class="boxes">${items.map(x =>
    `<a class="box" ${DEMO ? "" : `href="${esc(x.url || "#")}" target="_blank" rel="noopener"`}>${x.img ? `<img loading="lazy" src="${esc(x.img)}" alt="">` : `<i>📦</i>`}<span>${esc((x.title || "").slice(0, 46))}</span><b>${usd(x.price)}</b></a>`).join("")}</div></div>`;
}

function armyHTML(a) {
  const cr = a.credits || {}, A = a.avatars || [], P = a.phases || [];
  const col = { live: "#3dffa8", building: "#ffd166", next: "#00e5ff", planned: "#7d74a8", paused: "#ff4d6d" };
  const spent = A.reduce((t, x) => t + (x.spent || 0), 0), budget = A.reduce((t, x) => t + (x.credits || 0), 0);
  const bar = (v, max, c) => `<div style="height:6px;border-radius:3px;background:#2a1c5c;margin-top:4px"><div style="height:6px;border-radius:3px;width:${Math.min(100, max ? 100 * v / max : 0)}%;background:${c}"></div></div>`;
  const roster = A.map(x => `<div class="note" style="border-left:3px solid ${col[x.status] || "#7d74a8"};padding-left:8px">
      <b>${x.emoji} ${esc(x.name)}</b> <span style="color:${col[x.status] || "#ccc"};font-weight:700">· ${esc(x.status.toUpperCase())}</span><br>${esc(x.niche)}<br>
      💰 ${esc(x.money)} · 🎯 ${esc(x.goal)}${x.ig ? ` · 📸 ${esc(x.ig)}${x.followers != null ? " (" + num(x.followers) + ")" : ""}` : ""}<br>
      ⚡ ${num(x.spent || 0)} / ${num(x.credits)} credits · starts ${esc(x.start || "–")}${bar(x.spent || 0, x.credits, col[x.status] || "#7d74a8")}</div>`).join("");
  const plan = P.map(p => { const d = (p.steps || []).filter(t => t.done).length;
    return `<div class="list"><div style="color:var(--dim);font-size:12px"><span>🗓️ ${esc(p.name)}</span><span>${d}/${(p.steps || []).length} · ⚡${num(p.credits)}</span></div>${(p.steps || []).map(t =>
      `<div><span>${t.done ? "✅" : t.who === "you" ? "🙋" : "🤖"} ${esc(t.t)}</span><span>${t.cr ? "⚡" + t.cr : ""}</span></div>`).join("")}</div>`; }).join("");
  const costs = (a.costs || []).map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("");
  return `<h2>AI Influencer Army</h2><div class="sub">${esc(a.headline || "Five AI influencers, one at a time, built in Higgsfield")} · updated ${esc((a.updated || "").slice(0, 16).replace("T", " "))}</div>
    ${M.s.influencers?.accounts ? `<div class="links"><button class="infopen" onclick="openInf()">📊 Open the influencer overview (followers, views, best posts)</button></div>` : ""}
    <div class="big">${num(cr.left)}<small>Higgsfield credits left · ${esc(cr.plan || "plan ?")}${cr.renews ? " · renews " + esc(cr.renews) : ""}</small></div>
    <div class="grid"><div class="kv"><b>${num(budget)}</b><span>credits budgeted</span></div><div class="kv"><b>${num(spent)}</b><span>credits used</span></div>
      <div class="kv"><b>${A.filter(x => x.status === "live").length}/${A.length}</b><span>avatars live</span></div><div class="kv"><b>${num(cr.monthly)}</b><span>credits / month</span></div></div>
    ${(a.unlimited || []).length ? `<div class="note">♾️ Free on this plan: ${a.unlimited.map(esc).join(" · ")}</div>` : ""}
    <div class="lt" style="margin-top:14px">The army</div>${roster}
    <div class="lt" style="margin-top:14px">Game plan · 🤖 Claude · 🙋 you</div>${plan}
    ${costs ? `<div class="list"><div style="color:var(--dim);font-size:12px"><span>What things cost</span></div>${costs}</div>` : ""}
    ${(a.rules || []).length ? `<div class="note">📏 ${a.rules.map(esc).join("<br>📏 ")}</div>` : ""}`;
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
const PLAZA = [-22, 22, -6, 20];       // paved square round the Vault in the city park
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
  return [{ color: 0xff4fa3, status: "ok", board: { title: "PRIMEPATH CONSULTING", main: usd(M.day), mainLabel: "fees collected today", rows: [["This month", usd(M.tot)], ["Invoices", num(M.sales)], ["AI staff", ((M.s.staff || {}).staff || []).length - 1], ["Buildings", M.B.length]] } },
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
  if (b.face) return new THREE.Vector3(b.face[0], 0, b.face[1]);
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
  if (WLD) { g.remove(plinth); top = worldModel(g, b); }
  else if (b.kind === "mega") {  // stepped skyscraper with a crown
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
  } else if (b.kind === "warehouse") {  // warehouse: long shed, saw-tooth roof, 3 lit roll-up doors, crates + pallets out front
    const f = faceDir(b), m = new THREE.Group(); m.rotation.y = Math.atan2(f.x, f.z); g.add(m);
    m.add(tower(b.w, b.h, b.d, c, 91, lit * 0.5));
    const tooth = new THREE.MeshStandardMaterial({ color: 0x2a2244, emissive: c, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {  // saw-tooth roof: sloped plates with a lit glazing strip on each step
      const x = -b.w / 2 + b.w / 8 + i * b.w / 4;
      const pl = new THREE.Mesh(new THREE.BoxGeometry(b.w / 4 * 0.98, 0.2, b.d * 1.04), tooth); pl.rotation.x = 0.28; pl.position.set(x, b.h + 1.4, 0); m.add(pl);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(b.w / 4 * 0.9, 2.8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      gl.position.set(x, b.h + 1.4, -b.d / 2 - 0.05); m.add(gl);
    }
    for (let i = -1; i <= 1; i++) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(b.w / 4.2, b.h * 0.6), new THREE.MeshStandardMaterial({ color: 0x1a1a2a, emissive: c, emissiveIntensity: 0.25 }));
      door.position.set(i * b.w / 3.2, b.h * 0.3, b.d / 2 + 0.05); m.add(door);
      for (let y = 0.6; y < b.h * 0.6; y += 0.7) { const l = new THREE.Mesh(new THREE.PlaneGeometry(b.w / 4.2, 0.06), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); l.position.set(i * b.w / 3.2, y, b.d / 2 + 0.07); m.add(l); }
    }
    const crate = new THREE.MeshStandardMaterial({ color: 0xc8924a, emissive: 0x553311, emissiveIntensity: 0.3, roughness: 0.8 });
    [[-b.w / 2 + 1, 0], [-b.w / 2 + 2.4, 0], [-b.w / 2 + 1.7, 1.2], [b.w / 2 - 1.2, 0], [b.w / 2 - 1.2, 1.2]].forEach(([x, y]) => {
      const cr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), crate); cr.position.set(x, 0.6 + y, b.d / 2 + 1.6); m.add(cr); });
    top = b.h + 2.2;
  } else if (b.kind === "army") {  // AI Influencer Army: tall studio tower, 5 hologram influencers on a turning roof stage (lit = live/being built)
    g.add(tower(b.w, b.h, b.d, c, 55, lit));
    const stage = new THREE.Group(); stage.position.y = b.h + 0.2;
    stage.add(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.35, 40), new THREE.MeshBasicMaterial({ color: 0x2a0a40 })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.12, 8, 64), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.2; stage.add(rim);
    const cols = [0xff9ad5, 0x00e5ff, 0xffd166, 0x9945ff, 0x3dffa8], crew = b.crew || [];
    const figs = cols.map((fc, i) => { const on = ["live", "building", "next"].includes(crew[i]), f = new THREE.Group(), a = i / 5 * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({ color: fc, toneMapped: false, transparent: true, opacity: on ? 0.95 : 0.25 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 1.8, 12), mat); body.position.y = 1.1; f.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), mat); head.position.y = 2.4; f.add(head);
      f.position.set(Math.cos(a) * 2.7, 0.2, Math.sin(a) * 2.7); f.userData.on = on; stage.add(f); return f; });
    g.add(stage); anim.push((dt, t) => { stage.rotation.y += dt * 0.35; figs.forEach((f, i) => { f.position.y = 0.2 + (f.userData.on ? 0.25 * Math.sin(t * 2 + i) : 0); }); });
    top = b.h + 4;
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
  if (b.kind === "library" || WLD) { board.children.slice(-2).forEach(p => p.visible = false); board.position.set(0, top + bh / 2 + 0.6, 0); top += bh + 1; if (WLD) beacon.position.y = top + 0.8; }
  else board.position.set(toward.x * off, postH + bh / 2, toward.z * off);
  if (b.kind === "market" && !WLD) { board.position.y += b.h * 0.55; board.children.slice(-2).forEach(p => { p.scale.y = (postH + b.h * 0.55) / postH; p.position.y = -bh / 2 - (postH + b.h * 0.55) / 2; }); }
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
  const A = groups.web, Z = groups.billing; if (!A || !Z) return;
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

const MONEY = ["billing", "coida", "ufiling", "nappi", "payroll"];
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
    const el = document.createElement("div"); el.className = "tag work"; el.innerHTML = "<b>🤖 AI at work</b>";
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
  seg(-PARK + 2, -48, -14, -48, 4, 0x9945ff); seg(14, -48, PARK - 2, -48, 4, 0x9945ff);                    // Bot Row walk
  seg(-PARK + 2, 70, PARK - 2, 70, 7, 0xff8a3d);                                             // Shop Street
  M.B.forEach(b => {
    const size = Math.max(b.w, b.d) * 0.8;
    solids.push({ x: b.pos[0], z: b.pos[1], r: size + 0.6, h: b.h + 12 });
    if (b.face && b.face[0]) { const sx = Math.sign(b.pos[0]); seg(sx * BX, b.pos[1], b.pos[0] - sx * (size + 0.5), b.pos[1], 3.4, b.color); }  // media/warehouse spur from the boulevard to the door
    else if (b.face && b.pos[1] > 40) seg(b.pos[0], b.pos[1] + size + 0.5, b.pos[0], 70, 3.4, b.color);   // Shop Street: door to the street
    else if (b.face && b.pos[1] < -40) seg(b.pos[0], b.pos[1] + size + 0.5, b.pos[0], -48, 3.4, b.color);  // Bot Row: door to the bot walk
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
const staffHTML = id => !staffOf(id).length ? "" : `<div class="staffbox"><div class="lt">🤖 AI staff here</div>${staffOf(id).map(staffRow).join("")}</div>`;
function assign(eid) {
  if (GUEST) return;
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
    <b>NEVER</b><ul>${(x.profile.never || []).map(m => `<li>${esc(m)}</li>`).join("")}</ul>${(x.profile.warnings || []).length ? `<b style="color:#ff5a5a">⚠️ WARNINGS (${x.profile.warnings.length})</b><ul>${x.profile.warnings.map(w => `<li>${esc(w.date)}: ${esc(w.text)}</li>`).join("")}</ul>` : ""}<i>Runs: ${esc(x.profile.cron || "")}</i></details>`;
  const rep = x => !x.report ? "" : `<div class="rep">📨 ${esc(x.report.ts.slice(11, 16))} · ${esc(x.report.title)}${(x.report.lines || []).length ? `<br>${x.report.lines.slice(0, 4).map(l => esc(l.slice(0, 140))).join("<br>")}` : ""}</div>`;
  const card = x => `<div class="mgr"><div class="emp"><span class="av big" style="border-color:${STC[x.status] || "#7d74a8"}">${x.emoji}</span>
    <span class="ej"><b>${esc(x.name)}</b> <i style="color:${STC[x.status] || "#7d74a8"}">● ${esc(x.status)}</i><br><span class="ttl">${esc(x.title || x.job)}</span> · <span class="dn" data-id="${esc(x.bld)}">${esc(bn(x.bld))}</span></span>
    <button class="assign" data-emp="${esc(x.id)}">Assign</button></div>${rep(x)}${prof(x)}
    <div class="team"></div></div>`;  // owner 7 Oct: managers only, no employee rows under them
  const ceo = all.find(x => x.role === "ceo"), mgrs = all.filter(x => x.role === "manager");
  el.innerHTML = `<h4>🤖 YOUR AI TEAM · ${all.length - 1} EMPLOYEES</h4><p class="sub2">They all report to you. Open a job profile to see what each one must and may never do.</p>` +
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
  el.innerHTML = `<h4><span>📝 ${esc(t.title || "TODAY")} · ${done}/${t.items.length}</span><button id="todomin">${min ? "show" : "hide"}</button></h4>` +
    t.items.map(x => { const d = x.done || ticks[x.id];
      return `<label class="${d ? "done" : ""}"><input type="checkbox" data-t="${esc(x.id)}" ${d ? "checked" : ""} ${x.done ? "disabled" : ""}><span>${esc(x.text)}<span class="who">${who[x.who] || ""}</span></span></label>`; }).join("");
  $("#todomin").onclick = () => { try { localStorage.setItem("todo-min", min ? "0" : "1"); } catch (e) {} todoNote(t); };
  el.querySelectorAll("input[data-t]").forEach(i => i.onchange = () => {
    ticks[i.dataset.t] = i.checked; try { localStorage.setItem("todo-ticks", JSON.stringify(ticks)); } catch (e) {} todoSync(ticks); todoNote(t); });
  if (!todoNote.sent) { todoNote.sent = 1; todoSync(ticks); }
}
function todoSync(ticks) {
  if (DEMO || GUEST || !PW) return;
  fetch("", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pw: PW, ticks }) }).catch(() => {});
}
$("#askbar").onclick = () => DEMO ? focus("library") : openTerm();

function creditsBubble() { $("#credits").hidden = true; }
function openInf() {}

function liveStrip(p) {
  const el = $("#livestats"), st = (M.s.consult || {}).live;
  if (!st) return (el.hidden = true);
  el.hidden = false;
  el.innerHTML = `<span class="lv">● TODAY</span>` +
    `<button data-id="mail">📧 Emails <b>${num(st.emails)}</b></button>` +
    `<button data-id="ufiling">📮 UI-19s <b>${num(st.ui19)}</b></button>` +
    `<button data-id="nappi">💊 NAPPI <b>${num(st.nappi)}</b></button>` +
    `<button data-id="payroll">💵 Payslips <b>${num(st.payslips)}</b></button>`;
}

function hud() {
  const { B, tot, day, feeZar, sales, s } = M;
  groups.vault.userData.el.innerHTML = `<b>FEES · TODAY</b><span style="font:800 18px Sora;color:${day ? "#3dffa8" : "#fff"}">${usd(day)}</span><br><span class="z">${usd(tot)} this month · ${sales} invoices</span>`;
  const dc = { ok: "#3dffa8", down: "#ff4d6d", stale: "#ffd166", unknown: "#7d74a8" };
  const att = (s.pulse || {}).attention || {};
  const why = b => [...(att[b.id] || []), ...(b.status === "down" ? ["Something here is down"] : [])];
  const chip = (id, label, color, w) => `<button class="chip${w.length ? " need" : ""}" data-id="${id}" title="${esc(w.join(" · "))}" style="border-color:${color}88;color:${color}">${w.length ? `<i class="blip"></i>` : ""}${esc(label)}</button>`;
const names = { vault: "Fees", coida: "COIDA", ufiling: "uFiling", nappi: "NAPPI", payroll: "Payroll", mail: "Mail Room", billing: "Billing", deadlines: "Deadlines", web: "Website", docs: "Documents", staffroom: "AI Staff", library: "Library" };
  const list = [chip("vault", "Fees", "#ffd166", att.vault || [])].concat(B.map(b => chip(b.id, names[b.id] || b.short, hex(b.color), why(b))));
  $("#chips").innerHTML = list.join("");
  M.need = id => id === "vault" ? att.vault || [] : why(B.find(x => x.id === id) || {});
  liveStrip(s.pulse);
  creditsBubble(s.credits); if ($("#infbtn")) $("#infbtn").onclick = openInf;
  staffPanel();
  todoNote(s.todo);
  document.querySelectorAll("[data-id]").forEach(x => x.onclick = () => focus(x.dataset.id));
  $("#updated").textContent = `data ${ago(s.ts)} · refreshes every 30 min`;
  const rows = B.filter(b => b.id !== "library").map(b => {
    const earned = b.id === "_none" ? (b.zar ? "R" + num(b.zar) : "R0") : usd(b.today);
    const total = b.id === "_none" ? "R" + num(b.zar || 0) : usd(b.total);
    return `<tr><td>${b.icon} ${esc(b.short)}</td><td><span class="dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dc[b.status]}"></span></td><td>${earned}</td><td>${total}</td></tr>`; });
  $("#payroll").innerHTML = `<h4>FEES · TODAY</h4><table><tr><th>Building</th><th>On</th><th>Today</th><th>Month</th></tr>${rows.join("")}</table>
    <p>Thin arcs into the Fees vault = paid work (bright when a client paid today). The arc from the Website to Billing = new enquiries turning into invoices. A cyan beam into the sky = an AI employee is busy there right now.</p>`;
}

function vaultSheet() {
  const bi = (M.s.consult || {}).billing || {};
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
  if (GUEST) return void window.open(GUEST_QA, "_blank");  // guests get the ask-only Q&A page, never the real Library
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

const OFFICE_API = "";
let oTimer = null, oLive = null;
async function officeCall(body = {}) {
  try { const r = await fetch(OFFICE_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pw: PW, ...body }) }); return r.ok ? r.json() : null; }
  catch (e) { return null; }
}
function officeHTML(live) {
  const s = M.s, av = s.avatars || {}, A = av.avatars || [], P = av.phases || [], bd = (live && live.board) || s.board || {}, T = (live && live.tasks) || s.tasks || [];
  const sc = { live: "#16a34a", building: "#d97706", next: "#0284c7", planned: "#64748b", paused: "#dc2626" };
  const ink = ["#1d4ed8", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];
  const army = A.map((x, i) => `<div class="pc" style="--r:${[-2, 1.5, -1, 2, -1.5][i % 5]}deg;background:${["#fff8a8", "#ffd6e7", "#c8f7ff", "#e4d4ff", "#d6ffd0"][i % 5]}">
      <h5>${x.emoji} ${esc(x.name)}</h5><span class="st" style="background:${sc[x.status] || "#64748b"}">${esc((x.status || "").toUpperCase())}</span><br>
      ${esc(x.niche)}<br>💰 ${esc(x.money)}<br>🎯 ${esc(x.goal)}<br>⚡ ${num(x.credits)} credits · ${esc(x.start || "")}</div>`).join("");
  const phases = P.map((p, i) => { const d = (p.steps || []).filter(t => t.done).length;
    return `<div style="color:${ink[i % 5]}"><b>${esc(p.name)}</b> · ${d}/${(p.steps || []).length} · ⚡${num(p.credits)}<br>${(p.steps || []).slice(0, 6).map(t => `${t.done ? "☑" : "☐"} ${esc(t.t)}`).join("<br>")}</div>`; }).join("");
  const extra = (bd.sections || []).map((x, i) => `<div class="mk" style="color:${x.color || ink[(i + 2) % 5]}">${esc(x.title)}</div>
      <div class="cards">${(x.cards || []).map((c, j) => `<div class="pc" style="--r:${j % 2 ? 1 : -1}deg"><h5>${esc(c.h)}</h5>${(c.lines || []).map(esc).join("<br>")}</div>`).join("")}</div>`).join("");
  const all = (s.staff || {}).staff || [], dot = { working: "#16a34a", "on duty": "#22c55e", "on call": "#0ea5e9", late: "#f59e0b", off: "#94a3b8" };
  const bosses = all.filter(x => !x.boss || x.boss === "claude");
  const team = b => all.filter(x => x.boss === b.id);
  const pp = x => `<span class="pp" title="${esc(x.job)}"><i class="dot" style="background:${dot[x.status] || "#94a3b8"}"></i>${x.emoji || "🙂"} <b>${esc(x.name)}</b> ${esc((x.job || "").split(":")[0].slice(0, 28))}</span>`;
  const staff = bosses.map(b => `<div class="team"><b>${b.emoji || ""} ${esc(b.name)} · ${esc((b.job || "").split(":")[0])}</b><div class="ppl">${team(b).map(pp).join("") || '<span class="pp">no team yet</span>'}</div></div>`).join("");
  const on = all.filter(x => ["working", "on duty"].includes(x.status)).length;
  const ic = { running: "⏳", done: "✅", failed: "❌", stopped: "⚪" };
  const jobs = T.length ? T.map(t => `<div class="job">${ic[t.state] || "•"} <i>${esc(t.title)}</i><small>${esc(t.state)} · started ${esc((t.started || "").slice(5, 16).replace("T", " "))}${t.state !== "running" ? " · ended " + esc((t.updated || "").slice(11, 16)) : ""}${t.note ? " · " + esc(t.note.slice(0, 140)) : ""}</small></div>`).join("")
    : '<div class="job">No background jobs yet.</div>';
  return `<div class="otop"><h2>🏢 Head Office</h2><button id="oclose">✕ Back to the city</button></div>
  <div class="wb"><div class="wcols">
    <div><div class="wbt">✍️ My notes & planning</div><textarea id="onotes" placeholder="Type anything: ideas, plans, lists… it saves by itself.">${esc(bd.notes || "")}</textarea>
      <div class="saved" id="osaved">${bd.notes_at ? "saved " + esc(bd.notes_at.slice(5, 16).replace("T", " ")) : "not saved yet"}</div></div>
    <div><div class="wbt">🤖 AI Influencer Army ${av.credits?.left != null ? `<span style="font:20px Caveat;color:#475569">· ${num(av.credits.left)} Higgsfield credits left</span>` : ""}</div>
      <div class="cards">${army || "<i>Plan coming…</i>"}</div>
      ${phases ? `<div class="mk" style="color:#dc2626">Game plan</div><div class="ph">${phases}</div>` : ""}${extra}</div>
  </div></div>
  <div class="floor">
    <div class="desk"><h3>👥 Staff floor · ${on}/${all.length} at work</h3>${staff}</div>
    <div class="mon"><h3>🖥️ Background jobs</h3>${jobs}${rtkHTML(s.rtk)}</div>
  </div>`;
}
function rtkHTML(r) {
  if (!r || !r.sim) return "";
  const k = n => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(n || 0);
  const mx = Math.max(1, ...(r.days || []).map(d => d[1]));
  return `<h3 style="margin-top:14px">🪙 RTK token saver</h3>
    <div class="job">If RTK had been on from day one: <i>${k(r.sim.tokens_saved)} tokens</i> less output read, plus <i>${k(r.sim.cache_rereads_saved)}</i> cached re-reads<br>
    = <b style="color:#fde047;font-size:16px">$${r.sim.usd.toFixed(2)}</b> <small>(${r.sim.rtk_would_shrink} of ${num(r.sim.commands)} commands shrunk · $${r.sim.usd_fresh} fresh + $${r.sim.usd_cache} cache · ${esc(r.model)} API prices)</small></div>
    <div class="job">Real since ${esc(r.real.since)}: <i>${k(r.real.tokens_saved)} tokens</i> saved on ${num(r.real.commands)} commands (${r.real.pct}%) = <b style="color:#fde047">$${r.real.usd.toFixed(2)}</b></div>
    <div style="display:flex;align-items:flex-end;gap:3px;height:46px;margin-top:6px">${(r.days || []).map(([d, v]) => `<div title="${esc(d)}: ${k(v)} tokens" style="flex:1;background:#4ade80;height:${Math.max(2, 46 * v / mx)}px;border-radius:2px"></div>`).join("")}</div>
    <small style="color:#94a3b8">Tokens RTK would have saved per day (last 14). On the subscription this means more work per usage limit, not cash back.</small>`;
}
async function openOffice() {
  const el = $("#office"); el.hidden = false; el.innerHTML = officeHTML(oLive);
  const wire = () => {
    $("#oclose").onclick = () => { el.hidden = true; clearInterval(oTimer); };
    $("#onotes").oninput = e => { $("#osaved").textContent = "typing…"; clearTimeout(wire.t);
      wire.t = setTimeout(async () => { const r = await officeCall({ notes: e.target.value }); $("#osaved").textContent = r ? "saved ✓ " + new Date().toTimeString().slice(0, 5) : "⚠️ not saved (offline?)"; if (r) oLive = r; }, 1200); };
  };
  wire();
  const refresh = async () => { const r = await officeCall(); if (!r || el.hidden) return; oLive = r;
    if (document.activeElement === $("#onotes")) return;  // never redraw under the owner's fingers
    el.innerHTML = officeHTML(r);
    wire(); };
  refresh(); clearInterval(oTimer); oTimer = setInterval(refresh, 30000);
}
$("#officebtn").onclick = openOffice;

function districts() {
  const D_ = [["CITY PARK", 0x22ff88, 0, 20, null]];
  D_.forEach(([t, c, x, z, r]) => {
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 160; const g = cv.getContext("2d");
    g.font = "800 92px Sora, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#" + c.toString(16).padStart(6, "0"); g.shadowBlur = 28; g.fillStyle = "#fff"; g.fillText(t, 512, 84);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    sp.scale.set(26, 4.1, 1); sp.position.set(x, t === "CITY PARK" ? 3 : 15, z); scene.add(sp);
    if (r) { const [x0, x1, z0, z1] = r, e = neonEdges(new THREE.BoxGeometry(x1 - x0, 0.01, z1 - z0), c); e.position.set((x0 + x1) / 2, 0.34, (z0 + z1) / 2); scene.add(e); }
  });
}

let THEME = get("consult-theme") || "neon";
const THEMES = [{ id: "neon", name: "Classic city", swatch: ["#ffb3d9", "#ff4fa3", "#ffffff"] },
  { id: "bratz", name: "Bratz Fashion Mall", swatch: ["#ff3fa4", "#b06cff", "#ffc93a"] }];
let WLD = null, WS = null, WGEN = 0, ENV = null;   // active world definition, its runtime state (roads, lots, decor)
const SEG = MOBILE ? 2 : 3, MATS = new Map(), TEX = new Map();
const hx = c => typeof c === "number" ? c : new THREE.Color(c).getHex();
const css = c => "#" + new THREE.Color(c).getHexString();
const tone = (c, l) => "#" + new THREE.Color(c).offsetHSL(0, 0, l).getHexString();
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let TOONG = null;
function wm(c, o) {  // shared material per colour + options (flat toon shading in worlds that ask for it, e.g. Cartoon Network)
  const toonW = !!(WLD && WLD.toon), k = (toonW ? "t" : "") + hx(c) + (o ? JSON.stringify(o, (key, v) => v && v.isTexture ? v.uuid : v) : "");
  let m = MATS.get(k); if (m) return m;
  if (toonW) {
    if (!TOONG) { TOONG = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
      TOONG.minFilter = TOONG.magFilter = THREE.NearestFilter; TOONG.needsUpdate = true; }
    const p = { color: hx(c), gradientMap: TOONG }; for (const x of ["map", "side", "transparent", "opacity", "depthWrite", "emissive", "emissiveIntensity", "emissiveMap"]) if (o && o[x] !== undefined) p[x] = o[x];
    m = new THREE.MeshToonMaterial(p);
  } else m = new THREE.MeshStandardMaterial({ color: hx(c), roughness: 0.7, metalness: 0, envMapIntensity: 0.55, ...o });
  MATS.set(k, m); return m;
}
const GLASS = () => wm(0x86a9c2, { roughness: 0.1, metalness: 0.4, envMapIntensity: 1.3 });
function ctex(key, w, h, draw, rep = [1, 1]) {
  let t = TEX.get(key); if (t) return t;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h);
  t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8;
  TEX.set(key, t); return t;
}
const noiseTex = (c, n, rep) => ctex(`nz${c}${n}${rep}`, 128, 128, (g, w, h) => { g.fillStyle = css(c); g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 5; i++) { g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${n})` : `rgba(0,0,0,${n})`; g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 2, 2); } }, [rep, rep]);
const brickTex = c => ctex("br" + c, 256, 256, (g, w, h) => { g.fillStyle = "#d4c9b6"; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let k = -1; k < 8; k++) { g.fillStyle = tone(c, (Math.random() - 0.5) * 0.09); g.fillRect(k * 32 + (r % 2) * 16 + 1.5, r * 16 + 1.5, 29, 13); } }, [2, 2]);
const chk = (n, m = n) => ctex(`ck${n}_${m}`, 64, 64, g => { g.fillStyle = "#f6f6f6"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#141414"; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, [n, m]);
const stripeTex = (c, n, c2 = "#fbf7ef") => ctex(`st${c}${n}${c2}`, 8, 64, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : css(c); g.fillRect(0, i * 8, 8, 8); } }, [1, n]);
const brick = c => wm(0xffffff, { map: brickTex(c), roughness: 0.85 });

function put(p, geo, c, x = 0, y = 0, z = 0, o) {
  const m = new THREE.Mesh(geo, c && c.isMaterial ? c : wm(c, o)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m;
}
const rbox = (p, w, h, d, c, x = 0, y = 0, z = 0, r = 0.3, o) => { const rr = Math.max(0.02, Math.min(r, w / 2.05, h / 2.05, d / 2.05));
  return put(p, new RoundedBoxGeometry(w, h, d, rr >= 0.25 ? SEG : 1, rr), c, x, y + h / 2, z, o); };
const cyl = (p, r1, r2, h, c, x = 0, y = 0, z = 0, n = 24, o) => put(p, new THREE.CylinderGeometry(r1, r2, h, n), c, x, y + h / 2, z, o);
const ball = (p, r, c, x = 0, y = 0, z = 0, o) => put(p, new THREE.SphereGeometry(r, 24, 16), c, x, y, z, o);
const dome = (p, r, c, x = 0, y = 0, z = 0, o) => put(p, new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), c, x, y, z, o);
const lathe = (p, pts, c, x = 0, y = 0, z = 0, o, n = 32) => put(p, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), n), c, x, y, z, o);
const dyn = m => (m.userData.dyn = true, m);
function groof(p, w, d, h, c, y, x = 0, z = 0, ov = 0.6) {  // gable roof with soft bevelled edges, ridge along x
  const s = new THREE.Shape(); s.moveTo(-d / 2 - ov, 0); s.lineTo(0, h); s.lineTo(d / 2 + ov, 0); s.lineTo(-d / 2 - ov, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: w + ov * 2, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 2 });
  geo.translate(0, 0, -(w + ov * 2) / 2); geo.rotateY(Math.PI / 2); return put(p, geo, c, x, y, z);
}
function hroof(p, w, d, h, c, y, x = 0, z = 0) {  // hip roof
  const m = put(p, new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0), c, x, y, z); m.scale.set(w + 1, h, d + 1); return m;
}
function win(p, x, y, z, w = 1.2, h = 1.5, fr = 0xffffff, sh) {  // y = bottom of the glass
  rbox(p, w + 0.3, h + 0.3, 0.14, fr, x, y - 0.15, z, 0.07); rbox(p, w, h, 0.2, GLASS(), x, y, z + 0.01, 0.05);
  rbox(p, w + 0.5, 0.14, 0.34, fr, x, y - 0.24, z + 0.1, 0.05);
  if (sh != null) for (const s of [-1, 1]) rbox(p, w * 0.42, h + 0.2, 0.12, sh, x + s * (w / 2 + w * 0.3), y - 0.1, z, 0.05);
}
const wrow = (p, W, z, n, y, w, h, fr, sh) => { for (let i = 0; i < n; i++) win(p, -W / 2 + W / n * (i + 0.5), y, z, w, h, fr, sh); };
function sign(p, text, w, h, bg, fg, x, y, z, o = {}) {  // painted sign on a rounded backing board; y = centre
  const cw = 512, ch = Math.max(48, Math.round(512 * h / w));
  const t = ctex(["sg", text, w, h, bg, fg, o.font, o.fam, o.glow, o.bd].join("|"), cw, ch, g => {
    if (bg !== "none") { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, cw, ch, ch * 0.18); g.fill(); }
    if (o.bd) { g.strokeStyle = o.bd; g.lineWidth = ch * 0.06; g.beginPath(); g.roundRect(ch * 0.08, ch * 0.08, cw - ch * 0.16, ch - ch * 0.16, ch * 0.12); g.stroke(); }
    let fs = ch * 0.6; const F = () => `${o.font || 800} ${fs}px ${o.fam || "Sora, Arial, sans-serif"}`; g.font = F();
    while (g.measureText(text).width > cw * 0.86 && fs > 8) { fs -= 2; g.font = F(); }
    g.textAlign = "center"; g.textBaseline = "middle";
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = fs * 0.4; }
    g.fillStyle = fg; g.fillText(text, cw / 2, ch / 2 + fs * 0.06);
  });
  t.repeat.set(1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, transparent: bg === "none", envMapIntensity: 0.4, ...(o.glow ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85 } : {}) });
  if (bg !== "none") rbox(p, w + 0.25, h + 0.25, 0.3, o.back ?? hx(bg), x, y - h / 2 - 0.125, z - 0.17, 0.1);
  const m = put(p, new THREE.PlaneGeometry(w, h), mat, x, y, z); m.castShadow = false; return m;
}
function awning(p, w, x, y, z, c, r = 1.3) {  // striped quarter-round canvas awning hanging from y
  const geo = new THREE.CylinderGeometry(r, r, w, 14, 1, true, 0, Math.PI / 2).rotateZ(Math.PI / 2);
  return put(p, geo, wm(0xffffff, { map: stripeTex(c, Math.max(2, Math.round(w / 0.9))), side: THREE.DoubleSide, roughness: 0.85 }), x, y - r, z);
}
function store(p, o) {  // storefront: rounded walls, cornice, glass shopfront with mullions, door, awning, false-front sign
  const { w, d, h } = o, tr = o.trim ?? 0xf3eee4, sf = Math.min(3.2, h * 0.5), fw = o.fw ?? w * 0.78;
  rbox(p, w, h, d, o.brick ? brick(o.brick) : o.wall, 0, 0, 0, o.r ?? 0.35);
  rbox(p, w + 0.5, 0.55, d + 0.5, tr, 0, h - 0.25, 0, 0.22);
  rbox(p, w + 0.2, 0.4, d + 0.2, o.base ?? 0x8d877d, 0, 0, 0, 0.14);
  rbox(p, fw + 0.4, sf + 0.4, 0.22, tr, 0, 0.3, d / 2, 0.1); rbox(p, fw, sf, 0.26, GLASS(), 0, 0.5, d / 2 + 0.02, 0.06);
  const nm = Math.max(2, Math.round(fw / 2.4)); for (let i = 1; i < nm; i++) rbox(p, 0.14, sf, 0.32, tr, -fw / 2 + i * fw / nm, 0.5, d / 2 + 0.02, 0.05);
  rbox(p, 1.4, 2.5, 0.36, o.door ?? 0x5b3a26, o.dx ?? 0, 0.4, d / 2 + 0.04, 0.08);
  if (h > 7.4) wrow(p, w * 0.8, d / 2, Math.max(2, Math.round(w / 3.4)), sf + 2.3, 1.15, Math.min(1.7, h - sf - 3.6), tr, o.sh);
  if (o.awn) awning(p, fw + 0.5, 0, sf + 1.0, d / 2 + 0.14, o.awn);
  if (!o.sign) return h;
  const sh = Math.max(1.2, Math.min(2.2, w * 0.16)), sw = Math.min(w * 0.94, 13.5);
  sign(p, o.sign, sw, sh, o.sbg ?? "#ffffff", o.sfg ?? "#222222", 0, h + 0.3 + sh / 2, d / 2 - 0.1, o.so || {});
  return h + sh + 0.5;
}
function house(p, o) {  // family house: walls, gable roof, windows with shutters, door + stoop, chimney, optional garage + porch
  const w = o.w ?? 9, d = o.d ?? 7.5, st = o.st ?? 2, H = st * 3, x0 = o.x ?? 0, rh = o.rh ?? 3, tr = o.trim ?? 0xffffff, fz = d / 2;
  rbox(p, w, H, d, o.wall, x0, 0, 0, o.r ?? 0.25); rbox(p, w + 0.3, 0.45, d + 0.3, o.base ?? 0x8e8a82, x0, 0, 0, 0.12);
  groof(p, w, d, rh, o.roof, H - 0.05, x0);
  const dx = x0 + (o.dx ?? w * 0.2);
  rbox(p, 1.25, 2.3, 0.3, o.door ?? 0x7a4a2a, dx, 0.35, fz + 0.03, 0.08); rbox(p, 2.6, 0.32, 1.6, 0xd6d0c4, dx, 0, fz + 0.8, 0.1);
  if (o.porch) { rbox(p, 3.6, 0.2, 2.2, tr, dx, 2.9, fz + 1.1, 0.06); for (const s of [-1, 1]) cyl(p, 0.11, 0.11, 2.9, tr, dx + s * 1.6, 0, fz + 2, 10); }
  const n = Math.max(2, Math.round(w / 3)), xs = [...Array(n)].map((_, i) => x0 - w / 2 + w / n * (i + 0.5));
  for (let f = 0; f < st; f++) xs.forEach(x => { if (f === 0 && Math.abs(x - dx) < 1.7) return; win(p, x, f * 3 + 1.0, fz, 1.1, 1.35, tr, o.sh); });
  if (o.chim !== false) rbox(p, 1, rh + 1.3, 1, o.chimC ?? 0xa45a44, x0 + w * 0.3, H - 0.2, -d * 0.15, 0.12);
  if (o.garage) { const gx = x0 - w / 2 - 2.7; rbox(p, 5.2, 3.1, d - 0.6, o.wall, gx, 0, 0.3, 0.25); groof(p, 5.2, d - 0.6, 1.5, o.roof, 3.05, gx, 0.3, 0.35);
    rbox(p, 4.2, 2.5, 0.22, 0xf3f0ea, gx, 0.1, fz + 0.02, 0.08); }
  return H + rh;
}
function car(p, x, z, ry, color, S) {  // a parked car (static, baked with its parent)
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  rbox(g, S.w, S.h, S.l, wm(color, { roughness: 0.3, metalness: 0.35, envMapIntensity: 1.1 }), 0, 0.36, 0, S.r);
  rbox(g, S.w * 0.86, S.ch, S.cl, GLASS(), 0, 0.3 + S.h, -S.l * 0.06, S.cr);
  rbox(g, S.w * 0.84, 0.14, S.cl * 0.92, wm(color, { roughness: 0.3, metalness: 0.35, envMapIntensity: 1.1 }), 0, 0.3 + S.h + S.ch - 0.08, -S.l * 0.06, 0.06);
  if (S.wood) for (const s of [-1, 1]) rbox(g, 0.08, S.h * 0.45, S.l * 0.78, 0x8a5a2b, s * (S.w / 2 + 0.02), 0.5 + S.h * 0.2, -0.1, 0.03);
  if (S.chrome) for (const s of [-1, 1]) rbox(g, S.w + 0.1, 0.22, 0.25, wm(0xdfe3e6, { metalness: 0.9, roughness: 0.2 }), 0, 0.42, s * (S.l / 2 + 0.05), 0.08);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) put(g, new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16).rotateZ(Math.PI / 2), 0x1d1d1f, sx * (S.w / 2 - 0.08), 0.38, sz * S.l * 0.32);
  return g;
}
function bus(p, x, z, ry, c = 0xf5b915) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  rbox(g, 2.5, 2.4, 9, c, 0, 0.45, 0, 0.45); rbox(g, 2.56, 0.9, 7.4, GLASS(), 0, 1.75, -0.5, 0.12); rbox(g, 2.58, 0.18, 8.6, 0x222222, 0, 1.2, 0, 0.06);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) put(g, new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16).rotateZ(Math.PI / 2), 0x1d1d1f, sx * 1.15, 0.5, sz * 2.9);
}
function flag(p, x, z, h = 10, c = 0xd8342b) {
  cyl(p, 0.09, 0.12, h, 0xe6e6e6, x, 0, z, 10); ball(p, 0.2, 0xd4af37, x, h + 0.1, z);
  const t = ctex("flag", 64, 40, g => { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#c8323c"; g.fillRect(0, i * 40 / 7, 64, 40 / 7 + 1); } g.fillStyle = "#2b3f86"; g.fillRect(0, 0, 28, 22); });
  put(p, new THREE.PlaneGeometry(2.4, 1.5), wm(0xffffff, { map: t, side: THREE.DoubleSide }), x + 1.25, h - 0.9, z);
}
function bake(root) {  // merge every static mesh under root into one mesh per material (draw calls: hundreds -> a handful)
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), by = new Map(), dead = [], rel = new THREE.Matrix4();
  const walk = o => {
    if (o.userData.dyn) return;
    if (o.isMesh && !o.isInstancedMesh) {
      const g = o.geometry; rel.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(rel);
      for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      g.clearGroups(); (by.get(o.material) || by.set(o.material, []).get(o.material)).push(g); dead.push(o);
    }
    o.children.forEach(walk);
  };
  root.children.forEach(walk);
  dead.forEach(o => o.parent.remove(o));
  by.forEach((gs, mat) => { const geo = mergeGeometries(gs); if (!geo) return; const m = new THREE.Mesh(geo, mat);
    m.castShadow = !mat.transparent; m.receiveShadow = true; root.add(m); gs.forEach(g => g.dispose()); });
}

function prepRoad(r) {
  const c = new THREE.CatmullRomCurve3(r.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), !!r.closed, "centripetal");
  const L = c.getLength(), n = Math.ceil(L / 1.5), A = () => new Float32Array(n + 1);
  const R = { w: 9, sw: 2.6, ...r, L, n, X: A(), Z: A(), TX: A(), TZ: A(), lift: A() }, p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let k = 0; k <= n; k++) { c.getPointAt(k / n, p); c.getTangentAt(k / n, t); t.y = 0; t.normalize(); R.X[k] = p.x; R.Z[k] = p.z; R.TX[k] = t.x; R.TZ[k] = t.z; }
  return R;
}
const edge = R => R.w / 2 + (R.sw || 0);
function nearest(R, x, z) { let bi = 0, bd = 1e9; for (let k = 0; k <= R.n; k++) { const d = (R.X[k] - x) ** 2 + (R.Z[k] - z) ** 2; if (d < bd) { bd = d; bi = k; } } return [bi, Math.sqrt(bd)]; }
const roadGap = (x, z, skip) => WS.R.reduce((m, R) => R === skip ? m : Math.min(m, nearest(R, x, z)[1] - edge(R)), 1e9);
const waterGap = (x, z) => WS.water.reduce((m, R) => Math.min(m, nearest(R, x, z)[1] - R.w / 2 - 3), 1e9);
const occFree = (x, z, r) => WS.occ.every(o => Math.hypot(x - o.x, z - o.z) > o.r + r);
const free = (x, z, r) => Math.abs(x) < 116 && Math.abs(z) < 116 && hgt(x, z) < 0.3 && roadGap(x, z) > r * 0.8 && waterGap(x, z) > r * 0.8 && occFree(x, z, r);
function lotAt(R, k, side, d, sb) {  // a lot beside the road at sample k: centre + the direction its front faces (the road)
  k = Math.max(0, Math.min(R.n, k)); const nx = -R.TZ[k] * side, nz = R.TX[k] * side, o = edge(R) + 1.2 + sb + d / 2;
  return { x: R.X[k] + nx * o, z: R.Z[k] + nz * o, face: [-nx, -nz], k, side };
}
function snapLot(ri, x, z, d, sb) {
  const R = WS.R[ri], [k] = nearest(R, x, z), side = Math.sign((x - R.X[k]) * -R.TZ[k] + (z - R.Z[k]) * R.TX[k]) || 1;
  return lotAt(R, k, side, d, sb);
}
function hgt(x, z) {  // terrain: a flat town, rolling hills past ~116 (squarish so the corners stay flat), plus named hills
  const e = Math.pow(Math.abs(x) ** 6 + Math.abs(z) ** 6, 1 / 6), k = smooth(114, 205, e);
  let h = k * (30 + 12 * Math.sin(x * 0.031 + 1.3) * Math.cos(z * 0.027) + 7 * Math.sin((x + z) * 0.05));
  const kb = smooth(100, 122, e);
  if (kb > 0) for (const [bx, bz, bh, rx, rz] of WLD.bumps || []) h += kb * bh * Math.exp(-((x - bx) ** 2) / (rx * rx) - ((z - bz) ** 2) / (rz * rz));
  return h;
}
function ribbon(R, o0, o1, y, mat, keep, uvL = 4) {  // flat strip between lateral offsets o0 < o1 (right of travel = +)
  const pos = [], uv = [], nor = [], idx = [];
  for (let k = 0; k <= R.n; k++) {
    const nx = -R.TZ[k], nz = R.TX[k], yy = y + R.lift[k], s = k * R.L / R.n / uvL;
    pos.push(R.X[k] + nx * o0, yy, R.Z[k] + nz * o0, R.X[k] + nx * o1, yy, R.Z[k] + nz * o1); uv.push(s, 0, s, 1); nor.push(0, 1, 0, 0, 1, 0);
    if (k < R.n && (!keep || (keep[k] && keep[k + 1]))) { const a = 2 * k; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
}
function wallR(R, off, y0, y1, mat, keep) {  // vertical strip (kerb face, bridge parapet)
  const pos = [], idx = [];
  for (let k = 0; k <= R.n; k++) { const x = R.X[k] - R.TZ[k] * off, z = R.Z[k] + R.TX[k] * off, l = R.lift[k];
    pos.push(x, y0 + l, z, x, y1 + l, z); if (k < R.n && (!keep || (keep[k] && keep[k + 1]))) { const a = 2 * k; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
function drawRoad(R, i) {
  const st = WLD.style, others = WS.R.filter(o => o !== R), y0 = 0.08 + i * 0.006, d = new THREE.Object3D();
  const inOther = (k, off, pad) => { const x = R.X[k] - R.TZ[k] * off, z = R.Z[k] + R.TX[k] * off; return others.some(o => nearest(o, x, z)[1] < o.w / 2 + pad); };
  const keepArr = (off, pad) => Array.from({ length: R.n + 1 }, (_, k) => !inOther(k, off, pad));
  if (R.rail) {  // railway: ballast bed, sleepers, two steel rails
    ribbon(R, -2.3, 2.3, 0.1, wm(0xffffff, { map: noiseTex(0x8a8178, 0.18, 1), roughness: 1 }), null, 3);
    const sl = new THREE.InstancedMesh(new RoundedBoxGeometry(3, 0.18, 0.5, 1, 0.05), wm(0x5a4232, { roughness: 0.9 }), R.n + 1);
    for (let k = 0; k <= R.n; k++) { d.position.set(R.X[k], 0.2, R.Z[k]); d.rotation.set(0, Math.atan2(R.TX[k], R.TZ[k]), 0); d.updateMatrix(); sl.setMatrixAt(k, d.matrix); }
    sl.receiveShadow = true; scene.add(sl);
    for (const s of [-0.75, 0.75]) { ribbon(R, s - 0.08, s + 0.08, 0.4, wm(0xb8bcc0, { metalness: 0.85, roughness: 0.3 })); wallR(R, s, 0.28, 0.4, wm(0x6d6a66, { metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide })); }
    return;
  }
  ribbon(R, -R.w / 2, R.w / 2, y0, wm(0xffffff, { map: noiseTex(st.asphalt, 0.07, 1), roughness: 0.93 }), null, 6);
  const walk = st.walk === "chk" ? wm(0xffffff, { map: chk(1, 2), roughness: 0.8 }) : wm(0xffffff, { map: noiseTex(st.walk ?? 0xc9c4ba, 0.06, 1), roughness: 0.9 });
  for (const s of [-1, 1]) {
    const keep = keepArr(s * (R.w / 2 + R.sw / 2), 0.4);
    ribbon(R, s < 0 ? -edge(R) : R.w / 2, s < 0 ? -R.w / 2 : edge(R), 0.24 + i * 0.006, walk, keep, st.walk === "chk" ? R.sw * 2 : 3);
    wallR(R, s * R.w / 2, y0, 0.24 + i * 0.006, wm(st.kerb ?? 0xd9d5cc, { side: THREE.DoubleSide, roughness: 0.8 }), keep);
    wallR(R, s * edge(R), 0, 0.24 + i * 0.006, wm(st.kerb ?? 0xd9d5cc, { side: THREE.DoubleSide, roughness: 0.8 }), keep);
  }
  const keepD = keepArr(0, 1.2), dash = [];
  for (let k = 0; k <= R.n; k += 3) if (keepD[k]) dash.push(k);
  const dm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 2.2).rotateX(-Math.PI / 2), wm(st.dash ?? 0xffd23a, { roughness: 0.6 }), dash.length);
  dash.forEach((k, j) => { d.position.set(R.X[k], y0 + 0.012 + R.lift[k], R.Z[k]); d.rotation.set(0, Math.atan2(R.TX[k], R.TZ[k]), 0); d.updateMatrix(); dm.setMatrixAt(j, d.matrix); });
  dm.receiveShadow = true; scene.add(dm);
  if (R.bulb) {  // cul-de-sac turning circle at the end
    const k = R.n, cx = R.X[k] + R.TX[k] * 6, cz = R.Z[k] + R.TZ[k] * 6, rr = R.w / 2 + 6;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(rr, 40).rotateX(-Math.PI / 2), wm(0xffffff, { map: noiseTex(st.asphalt, 0.07, 1), roughness: 0.93 }));
    disc.position.set(cx, y0, cz); disc.receiveShadow = true; scene.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(rr, rr + R.sw, 40).rotateX(-Math.PI / 2), walk); ring.position.set(cx, 0.24 + i * 0.006, cz); ring.receiveShadow = true; scene.add(ring);
    WS.occ.push({ x: cx, z: cz, r: rr + R.sw }); R.bulbAt = [cx, cz, rr];
  }
}
function drawWater(R) {
  ribbon(R, -R.w / 2 - 3.2, R.w / 2 + 3.2, 0.04, wm(WLD.style.bank ?? 0xb9a77f, { roughness: 1 }), null, 6);
  const w = ribbon(R, -R.w / 2, R.w / 2, 0.07, wm(WLD.style.water ?? 0x3f8fd0, { roughness: 0.08, metalness: 0.15, envMapIntensity: 1.6 }), null, 8);
  w.castShadow = false;
}
function bridges() {  // roads hump over rivers; parapets + piers where they cross
  WS.R.forEach(R => {
    if (R.rail) return; let on = [];
    for (let k = 0; k <= R.n; k++) { const g = WS.water.reduce((m, W) => Math.min(m, nearest(W, R.X[k], R.Z[k])[1] - W.w / 2), 1e9);
      R.lift[k] = 1.5 * (1 - smooth(-1, 10, g)); if (g < 3.5) on.push(k); }
    if (!on.length) return;
    const keep = Array.from({ length: R.n + 1 }, (_, k) => on.includes(k));
    for (const s of [-1, 1]) { wallR(R, s * (edge(R) + 0.05), -0.9, 1.1, wm(0xd8d2c6, { roughness: 0.8, side: THREE.DoubleSide }), keep);
      ribbon(R, s < 0 ? -edge(R) - 0.4 : edge(R) - 0.05, s < 0 ? -edge(R) + 0.05 : edge(R) + 0.4, 1.12, wm(0xeeeae2), keep); }
    ribbon(R, -edge(R), edge(R), -0.9, wm(0xb8b2a6, { side: THREE.DoubleSide }), keep);
    const mid = on[on.length >> 1];
    for (const s of [-1, 1]) { const k = on[Math.max(0, Math.min(on.length - 1, (on.length >> 1) + s * Math.round(on.length / 4)))];
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2, 16), wm(0xcfc9bd)); m.position.set(R.X[k], -0.2, R.Z[k]); m.castShadow = true; scene.add(m); }
    WS.occ.push({ x: R.X[mid], z: R.Z[mid], r: 4 });
  });
}
function skyTex(top, hor, low) {
  const t = ctex(`sky${top}${hor}${low}`, 4, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, css(top)); gr.addColorStop(0.42, css(hor)); gr.addColorStop(0.5, css(hor)); gr.addColorStop(0.56, css(low)); gr.addColorStop(1, css(low)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); });
  t.mapping = THREE.EquirectangularReflectionMapping; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

function worldLayout() {  // right after M = model(D): move every building onto its lot, the Vault onto its own
  WS = { R: WLD.roads.map(prepRoad), water: (WLD.rivers || []).map(prepRoad), occ: [], solids: [], gen: ++WGEN, houses: [] };
  const spare = [...(WLD.spare || [])];
  M.B.forEach(b => {
    const L = WLD.lots[b.id] || spare.shift() || [0, 0, 60, 0], [w, d] = WLD.size[b.id] || [10, 8], sb = L[3] || 0;
    const p = snapLot(L[0], L[1], L[2], d, sb);
    b.pos = [p.x, p.z]; b.face = p.face; b.w = w; b.d = d; b.sb = 1.2 + sb; b.lot = p;
    WS.occ.push({ x: p.x, z: p.z, r: Math.hypot(w, d) / 2 * 0.92 });
  });
  const v = WLD.vault, p = v.at || snapLot(v.lot[0], v.lot[1], v.lot[2], v.d, v.lot[3] || 0);
  VAULT[0] = p.x; VAULT[1] = p.z; WS.vface = p.face || [0, 1]; WS.occ.push({ x: p.x, z: p.z, r: v.r });
}
function worldEnv() {
  const S = WLD.sky; filmGrain(false);
  scene.background = skyTex(S.top, S.hor, S.low); scene.fog = new THREE.FogExp2(S.hor, S.fog ?? 0.0012);
  if (!ENV) ENV = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = ENV;
  scene.children.filter(o => o.isLight).forEach(o => scene.remove(o));
  scene.add(new THREE.HemisphereLight(S.hemi[0], S.hemi[1], S.hemi[2]));
  const sun = new THREE.DirectionalLight(S.sun[0], S.sun[1]); sun.position.set(...S.sunPos); sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -140; sc.right = sc.top = 140; sc.near = 1; sc.far = 700;
  const ms = MOBILE ? 1024 : 2048; sun.shadow.mapSize.set(ms, ms); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMappingExposure = S.exp ?? 1; renderer.domElement.style.filter = S.filter || ""; if (bloom) bloom.enabled = false;
  const nseg = MOBILE ? 110 : 160, T = new THREE.PlaneGeometry(800, 800, nseg, nseg).rotateX(-Math.PI / 2), pa = T.attributes.position, cols = [];
  const c = new THREE.Color(), g0 = new THREE.Color(S.grass), g1 = new THREE.Color(S.hill ?? S.grass);
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), y = hgt(x, z); pa.setY(i, y);
    c.copy(g0).lerp(g1, Math.min(1, y / 28)); if (WLD.tint) WLD.tint(x, z, c); c.multiplyScalar(0.94 + Math.random() * 0.1); cols.push(c.r, c.g, c.b); }
  T.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); T.computeVertexNormals();
  const ground = new THREE.Mesh(T, new THREE.MeshStandardMaterial({ vertexColors: true, map: noiseTex(0xe8e8e8, 0.12, 90), roughness: 0.96, envMapIntensity: 0.3 }));
  ground.receiveShadow = true; scene.add(ground);
  bridges(); WS.water.forEach(drawWater); WS.R.forEach(drawRoad);
}
function worldModel(g, b) {  // building(): this world's version of building b (front faces +z locally, i.e. the road)
  const f = faceDir(b), m = new THREE.Group(); m.rotation.y = Math.atan2(f.x, f.z); g.add(m);
  const top = (WLD.models[b.id] || WLD.models._)(m, b);
  if (!b.noFore) rbox(m, Math.min(b.w, 14), 0.14, b.sb + 0.3, wm(0xffffff, { map: noiseTex(WLD.style.walk === "chk" ? 0xd9d4ca : WLD.style.walk ?? 0xc9c4ba, 0.06, 2), roughness: 0.9 }), 0, 0.02, b.d / 2 + b.sb / 2, 0.05);
  bake(m); if (WLD.ink) ink(m, WLD.ink); return top;
}
let INKM = null;
function ink(root, wdt) {  // cartoon outline: an inverted hull pushed out along the normals, drawn black on its back faces
  if (!INKM) INKM = new THREE.MeshBasicMaterial({ color: 0x141414, side: THREE.BackSide });
  root.children.slice().forEach(o => {
    if (!o.isMesh || o.isInstancedMesh || o.material.transparent || o.material.map) return;
    const g = o.geometry.clone(), p = g.attributes.position, n = g.attributes.normal; if (!n) return;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * wdt, p.getY(i) + n.getY(i) * wdt, p.getZ(i) + n.getZ(i) * wdt);
    const h = new THREE.Mesh(g, INKM); h.position.copy(o.position); h.rotation.copy(o.rotation); h.scale.copy(o.scale); h.raycast = () => {}; root.add(h);
  });
}
function worldVault() {
  const g = new THREE.Group(); g.userData.b = { id: "vault" };
  const m = new THREE.Group(); g.add(m); WLD.vault.model(m); bake(m); if (WLD.ink) ink(m, WLD.ink);
  const el = document.createElement("div"); el.className = "tag vaultTag"; el.style.setProperty("--c", "#ffd166"); el.onclick = () => focus("vault");
  const lab = new CSS2DObject(el); lab.position.y = WLD.vault.tag ?? 22; g.add(lab); g.userData.el = el;
  g.traverse(o => { if (o.isMesh) { o.userData.bid = "vault"; picks.push(o); } });
  g.position.set(VAULT[0], 0, VAULT[1]); g.rotation.y = Math.atan2(WS.vface[0], WS.vface[1]); groups.vault = g; scene.add(g);
}
function lineRoad(ri, o) {
  const R = WS.R[ri], step = o.step ?? 17, made = [];
  for (let s = o.s0 ?? 8; s < R.L - (o.s1 ?? 6); s += step) for (const side of o.sides ?? [-1, 1]) {
    const lot = lotAt(R, Math.round(s / R.L * R.n), side, o.d ?? 8, o.sb ?? 5);
    if (!free(lot.x, lot.z, o.r ?? 6.2)) continue;
    const g = new THREE.Group(); g.position.set(lot.x, 0, lot.z); g.rotation.y = Math.atan2(lot.face[0], lot.face[1]); WS.dec.add(g);
    const info = o.make(g, made.length, lot); made.push(lot);
    WS.occ.push({ x: lot.x, z: lot.z, r: o.r ?? 6.2 }); WS.solids.push({ x: lot.x, z: lot.z, r: (o.r ?? 6.2) * 0.8, h: 10 });
    if (o.yard) yard(g, (o.d ?? 8) / 2, (o.sb ?? 5) + 1.2, info?.dx ?? 1.8, o.yard);
  }
  return made;
}
function yard(g, fz, depth, dx, y) {  // front path, picket fence with a gate, mailbox
  rbox(g, 1.4, 0.1, depth, wm(0xffffff, { map: noiseTex(0xcfc8bb, 0.06, 2) }), dx, 0.02, fz + depth / 2, 0.04);
  if (y.fence) { const zf = fz + depth - 0.6, fc = y.fence;
    for (let x = -6; x <= 6; x += 0.55) { if (Math.abs(x - dx) < 1) continue; rbox(g, 0.13, 0.95, 0.07, fc, x, 0, zf, 0.03); }
    for (const yy of [0.3, 0.7]) for (const [a, b] of [[-6.1, dx - 0.9], [dx + 0.9, 6.1]]) rbox(g, b - a, 0.09, 0.05, fc, (a + b) / 2, yy, zf - 0.06, 0.02); }
  const mx = dx + 1.4, mz = fz + depth - 0.3; cyl(g, 0.06, 0.06, 1.05, 0x6b4f35, mx, 0, mz, 8);
  rbox(g, 0.4, 0.42, 0.7, y.box ?? 0x5a6b7a, mx, 1.0, mz, 0.18); rbox(g, 0.04, 0.35, 0.1, 0xd8342b, mx + 0.24, 1.25, mz - 0.15, 0.02);
}

function worldLife() {
  const st = WLD.style, d = new THREE.Object3D(), col = new THREE.Color();
  M.B.forEach(b => solids.push({ x: b.pos[0], z: b.pos[1], r: Math.max(b.w, b.d) * 0.58 + 0.4, h: (groups[b.id]?.userData.top || 12) + 4 }));
  solids.push({ x: VAULT[0], z: VAULT[1], r: WLD.vault.r * 0.8, h: 30 }); WS.solids.forEach(s => solids.push(s));
  const drive = WS.R.filter(R => !R.rail);
  const at = (R, s, off) => { const f = Math.max(0, Math.min(R.n - 0.001, s / R.L * R.n)), k = f | 0, u = f - k;
    const x = R.X[k] + (R.X[k + 1] - R.X[k]) * u, z = R.Z[k] + (R.Z[k + 1] - R.Z[k]) * u, tx = R.TX[k], tz = R.TZ[k];
    return [x - tz * off, R.lift[k] + (R.lift[k + 1] - R.lift[k]) * u, z + tx * off, tx, tz]; };
  const mk = (geo, mat, n, shadow = true) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };

  const spots = [];
  drive.forEach(R => { for (let s = 6; s < R.L; s += R.treeStep ?? 13) for (const side of [-1, 1]) {
    const [x, , z] = at(R, s + side * 3, side * (edge(R) + 1.6)); if (free(x, z, 1.6)) { spots.push([x, z, rnd(0.85, 1.2), 0]); WS.occ.push({ x, z, r: 1.6 }); } } });
  for (let i = 0, n = MOBILE ? 70 : 120, got = 0; got < n && i < 3000; i++) { const x = rnd(-112, 112), z = rnd(-112, 112);
    if (free(x, z, 2.4)) { spots.push([x, z, rnd(0.8, 1.35), 0]); WS.occ.push({ x, z, r: 2.4 }); got++; } }
  for (let i = 0, n = MOBILE ? 160 : 300, got = 0; got < n && i < 4000; i++) { const a = rnd(0, 6.283), r = rnd(124, 230), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (WLD.forestOk && !WLD.forestOk(x, z)) continue; if (roadGap(x, z) < 3 || waterGap(x, z) < 2) continue; spots.push([x, z, rnd(1, 1.6), 1]); got++; }
  const tr = mk(new THREE.CylinderGeometry(0.2, 0.3, 2.6, 7).translate(0, 1.3, 0), wm(0x6b4a33, { roughness: 0.9 }), spots.length);
  const leaves = mk(new THREE.IcosahedronGeometry(1, 2), wm(0xffffff, { roughness: 0.85 }), spots.length * 3);
  const blobs = [[0, 3.6, 0, 1.9], [0.95, 2.9, 0.45, 1.4], [-0.85, 3.0, -0.5, 1.5]];
  spots.forEach(([x, z, s, hill], i) => { const y = hgt(x, z) - 0.1;
    d.rotation.set(0, rnd(0, 6.28), 0); d.scale.setScalar(s); d.position.set(x, y, z); d.updateMatrix(); tr.setMatrixAt(i, d.matrix);
    const c0 = pick(hill ? (st.hillLeaves ?? st.leaves) : st.leaves);
    blobs.forEach(([bx, by, bz, bs], j) => { d.position.set(x + bx * s, y + by * s, z + bz * s); d.scale.setScalar(bs * s * (hill ? 1.25 : 1)); d.updateMatrix();
      leaves.setMatrixAt(i * 3 + j, d.matrix); leaves.setColorAt(i * 3 + j, col.set(c0).multiplyScalar(0.85 + j * 0.1)); }); });

  const lamps = [];
  drive.filter(R => R.lamps).forEach(R => { for (let s = 8, j = 0; s < R.L; s += 19, j++) { const side = j % 2 ? 1 : -1, [x, y, z, tx, tz] = at(R, s, side * (edge(R) - 0.5));
    if (roadGap(x, z, R) > 1 && Math.abs(x) < 125 && Math.abs(z) < 125) lamps.push([x, y + 0.24, z, Math.atan2(-tz * side, tx * side)]); } });
  if (lamps.length) {
    const L = st.lamp ?? "cobra", pole = mk(new THREE.CylinderGeometry(0.08, 0.13, 5.6, 8).translate(0, 2.8, 0), wm(L === "globe" ? 0x2b2b2b : 0x8b9096, { metalness: 0.5, roughness: 0.4 }), lamps.length);
    const headGeo = L === "globe" ? new THREE.SphereGeometry(0.42, 16, 12).translate(0, 5.9, 0) : L === "lolly" ? new THREE.SphereGeometry(0.7, 16, 12).translate(0, 6.1, 0)
      : new RoundedBoxGeometry(0.5, 0.22, 1.4, 1, 0.1).translate(0, 5.6, -1.0);
    const head = mk(headGeo, wm(0xffffff, { emissive: 0xfff2c8, emissiveIntensity: L === "cobra" ? 0.15 : 0.5, roughness: 0.4 }), lamps.length);
    lamps.forEach(([x, y, z, r], i) => { d.position.set(x, y, z); d.rotation.set(0, r, 0); d.scale.setScalar(1); d.updateMatrix(); pole.setMatrixAt(i, d.matrix); head.setMatrixAt(i, d.matrix);
      if (L === "lolly") head.setColorAt(i, col.set(pick(st.shirts))); });
  }
  const poles = [], wires = [];
  drive.filter(R => R.poles).forEach(R => { let prev = null; const side = R.poles;
    for (let s = 4; s < R.L; s += 16) { const [x, , z, tx, tz] = at(R, s, side * (edge(R) + 1.0));
      if (roadGap(x, z, R) < 1 || Math.abs(x) > 128 || Math.abs(z) > 128) { prev = null; continue; }
      const nx = -tz, nz = tx, tops = [-1.1, 0, 1.1].map(o => [x + nx * o, 8.25, z + nz * o]); poles.push([x, z, Math.atan2(nx, nz)]);
      if (prev) prev.forEach((a, j) => { const b = tops[j]; for (let q = 0; q < 8; q++) { const f0 = q / 8, f1 = (q + 1) / 8, sg = f => 0.9 * 4 * f * (1 - f);
        wires.push(a[0] + (b[0] - a[0]) * f0, a[1] - sg(f0), a[2] + (b[2] - a[2]) * f0, a[0] + (b[0] - a[0]) * f1, a[1] - sg(f1), a[2] + (b[2] - a[2]) * f1); } });
      prev = tops; } });
  if (poles.length) {
    const pm = mk(new THREE.CylinderGeometry(0.15, 0.2, 9, 8).translate(0, 4.5, 0), wm(0x6b4f35, { roughness: 0.95 }), poles.length);
    const arm = mk(new RoundedBoxGeometry(0.2, 0.2, 2.8, 1, 0.05).translate(0, 8.15, 0), wm(0x5d4430, { roughness: 0.95 }), poles.length);
    poles.forEach(([x, z, r], i) => { d.position.set(x, 0, z); d.rotation.set(0, r, 0); d.scale.setScalar(1); d.updateMatrix(); pm.setMatrixAt(i, d.matrix); arm.setMatrixAt(i, d.matrix); });
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wires, 3));
    scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x2c2a28 })));
  }

  const S = st.car, cars = [];
  drive.forEach(R => { const n = Math.round((R.cars || 0) * (MOBILE ? 0.75 : 1)); for (let i = 0; i < n; i++) cars.push({ R, s: rnd(0, R.L), dir: i % 2 ? 1 : -1, v: rnd(6.5, 10.5) }); });
  if (cars.length) {
    const N = cars.length, paint = wm(0xffffff, { roughness: 0.28, metalness: 0.35, envMapIntensity: 1.2 });
    const body = mk(new RoundedBoxGeometry(S.w, S.h, S.l, 2, S.r), paint, N), cab = mk(new RoundedBoxGeometry(S.w * 0.86, S.ch, S.cl, 2, S.cr), GLASS(), N);
    const roof = mk(new RoundedBoxGeometry(S.w * 0.84, 0.14, S.cl * 0.92, 1, 0.06), paint, N);
    const wheel = mk(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14).rotateZ(Math.PI / 2), wm(0x1d1d1f, { roughness: 0.9 }), N * 4);
    const wood = S.wood ? mk(new RoundedBoxGeometry(S.w + 0.06, S.h * 0.45, S.l * 0.78, 1, 0.03), wm(0x8a5a2b, { roughness: 0.8 }), N) : null;
    const bump = S.chrome ? mk(new RoundedBoxGeometry(S.w + 0.1, 0.22, 0.25, 1, 0.08), wm(0xdfe3e6, { metalness: 0.9, roughness: 0.2 }), N * 2) : null;
    cars.forEach((c, i) => { body.setColorAt(i, col.set(st.carCols[i % st.carCols.length])); roof.setColorAt(i, col); });
    const loc = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
    const P = { body: loc(0, 0.36 + S.h / 2, 0), cab: loc(0, 0.3 + S.h + S.ch / 2, -S.l * 0.06), roof: loc(0, 0.3 + S.h + S.ch - 0.01, -S.l * 0.06),
      w: [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => loc(sx * (S.w / 2 - 0.08), 0.38, sz * S.l * 0.32)), b: [-1, 1].map(s => loc(0, 0.53, s * (S.l / 2 + 0.05))), wood: loc(0, 0.5 + S.h * 0.42, -0.1), none: new THREE.Matrix4().makeScale(0, 0, 0) };
    const m4 = new THREE.Matrix4(), tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const setI = (inst, i, l) => inst.setMatrixAt(i, tmp.multiplyMatrices(m4, l));
    anim.push(dt => {
      cars.forEach((c, i) => {
        const R = c.R; c.s += c.v * c.dir * dt;
        if (R.bulb) { if (c.s > R.L) { c.s = R.L; c.dir = -1; } else if (c.s < 0) { c.s = 0; c.dir = 1; } }
        else c.s = (c.s + R.L) % R.L;
        const [x, y, z, tx, tz] = at(R, c.s, c.dir * R.w / 4);
        pos.set(x, y + 0.08, z); q.setFromAxisAngle(up, Math.atan2(tx * c.dir, tz * c.dir)); m4.compose(pos, q, one);
        setI(body, i, P.body); setI(cab, i, P.cab); setI(roof, i, P.roof); P.w.forEach((w, k) => setI(wheel, i * 4 + k, w)); if (bump) P.b.forEach((b, k) => setI(bump, i * 2 + k, b)); if (wood) setI(wood, i, i % 3 ? P.none : P.wood);
      });
      for (const x of [body, cab, roof, wheel, bump, wood]) if (x) x.instanceMatrix.needsUpdate = true;
    });
  }

  const walkers = drive.filter(R => R.sw > 0), NP = MOBILE ? 46 : 80, people = [];
  if (walkers.length) {
    const torso = mk(new THREE.CapsuleGeometry(0.27, 0.62, 4, 10), wm(0xffffff, { roughness: 0.8 }), NP);
    const head = mk(new THREE.SphereGeometry(0.23, 14, 10), wm(0xffffff, { roughness: 0.6 }), NP);
    const legs = mk(new THREE.CapsuleGeometry(0.11, 0.6, 3, 8).translate(0, -0.4, 0), wm(0xffffff, { roughness: 0.9 }), NP * 2);
    for (let i = 0; i < NP; i++) {
      const R = walkers[i % walkers.length], side = Math.random() < 0.5 ? -1 : 1;
      people.push({ R, s: rnd(0, R.L), off: side * (R.w / 2 + R.sw * rnd(0.3, 0.7)), v: (Math.random() < 0.5 ? -1 : 1) * rnd(0.9, 1.5), ph: rnd(0, 6) });
      torso.setColorAt(i, col.set(st.shirts[i % st.shirts.length])); head.setColorAt(i, col.set(st.skin[i % st.skin.length]));
      for (const j of [0, 1]) legs.setColorAt(i * 2 + j, col.set(st.pants[i % st.pants.length]));
    }
    const dogs = [...Array(MOBILE ? 7 : 12)].map((_, i) => ({ p: people[(i * 5) % NP] }));
    const dbody = mk(new RoundedBoxGeometry(0.32, 0.3, 0.75, 1, 0.12), wm(0xffffff, { roughness: 0.9 }), dogs.length), dhead = mk(new RoundedBoxGeometry(0.26, 0.26, 0.32, 1, 0.1), wm(0xffffff, { roughness: 0.9 }), dogs.length);
    dogs.forEach((o, i) => { col.set([0x8b5a2b, 0xf2efe6, 0x2a2a2a, 0xd2a36c][i % 4]); dbody.setColorAt(i, col); dhead.setColorAt(i, col); });
    anim.push((dt, t) => {
      people.forEach((p, i) => {
        const R = p.R; p.s += p.v * dt; if (p.s > R.L - 1 || p.s < 1) { p.v *= -1; p.s = Math.max(1, Math.min(R.L - 1, p.s)); }
        const [x, y, z, tx, tz] = at(R, p.s, p.off), sv = Math.sign(p.v), h = Math.atan2(tx * sv, tz * sv), bob = Math.abs(Math.sin(t * 7 + p.ph)) * 0.05, yy = y + 0.24;
        p.x = x; p.z = z; p.y = yy; p.h = h;
        d.scale.setScalar(1); d.rotation.set(0, h, 0); d.position.set(x, yy + 1.15 + bob, z); d.updateMatrix(); torso.setMatrixAt(i, d.matrix);
        d.position.y = yy + 1.86 + bob; d.updateMatrix(); head.setMatrixAt(i, d.matrix);
        for (const j of [0, 1]) { d.position.set(x + Math.cos(h) * (j ? 0.12 : -0.12), yy + 0.78, z - Math.sin(h) * (j ? 0.12 : -0.12)); d.rotation.set(Math.sin(t * 7 + p.ph + j * Math.PI) * 0.45, h, 0, "YXZ"); d.updateMatrix(); legs.setMatrixAt(i * 2 + j, d.matrix); }
      });
      dogs.forEach((o, i) => { const p = o.p, sv = Math.sign(p.v); d.rotation.set(0, p.h, 0, "XYZ");
        d.position.set(p.x + Math.sin(p.h) * 1.0 + Math.cos(p.h) * 0.6, p.y + 0.42 + Math.abs(Math.sin(t * 11 + i)) * 0.05, p.z + Math.cos(p.h) * 1.0 - Math.sin(p.h) * 0.6); d.updateMatrix(); dbody.setMatrixAt(i, d.matrix);
        d.position.set(d.position.x + Math.sin(p.h) * 0.45, d.position.y + 0.2, d.position.z + Math.cos(p.h) * 0.45); d.updateMatrix(); dhead.setMatrixAt(i, d.matrix); });
      for (const x of [torso, head, legs, dbody, dhead]) x.instanceMatrix.needsUpdate = true;
    });
  }

  const cg = new THREE.Group(), cm = wm(0xffffff, { roughness: 1, emissive: st.cloudGlow ?? 0x8a96a8, emissiveIntensity: 0.35 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + rnd(-0.2, 0.2), r = rnd(250, 340), c = new THREE.Group(); c.position.set(Math.cos(a) * r, rnd(70, 115), Math.sin(a) * r); c.lookAt(0, c.position.y, 0);
    for (let k = 0; k < 6; k++) { const s = rnd(7, 13); const p = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), cm); p.position.set(rnd(-22, 22), rnd(-2, 5) + (k < 3 ? 0 : 5), rnd(-4, 4)); p.scale.y = 0.75; c.add(p); }
    cg.add(c); }
  bake(cg); cg.children.forEach(m => m.castShadow = false); scene.add(cg); anim.push(dt => cg.rotation.y += dt * 0.004);
}
function world3DText(text, opts, place) {  // 3D letters (font loads async; skipped if the city was rebuilt meanwhile)
  const gen = WS.gen;
  new FontLoader().load("https://cdn.jsdelivr.net/npm/three@0.161.0/examples/fonts/helvetiker_bold.typeface.json", font => {
    if (!WS || gen !== WS.gen) return;
    [...text].forEach((ch, i) => { if (ch === " ") return;
      const geo = new TextGeometry(ch, { font, size: opts.size, height: opts.depth, depth: opts.depth, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25, bevelSegments: 3 });
      geo.computeBoundingBox(); const bb = geo.boundingBox; geo.translate(-(bb.max.x + bb.min.x) / 2, 0, -opts.depth / 2);
      const m = new THREE.Mesh(geo, wm(opts.color ?? 0xffffff, { roughness: 0.45 })); m.castShadow = m.receiveShadow = true; place(m, i, bb); scene.add(m); });
  });
}
function build() {
  M = model(D); VAULT[0] = 0; VAULT[1] = 6; solids.length = 0; WLD = WORLDS[THEME] || null;
  if (WLD) { worldLayout(); worldEnv(); WS.dec = new THREE.Group(); scene.add(WS.dec); worldVault(); }
  else { scene.environment = null; renderer.shadowMap.enabled = false; if (bloom) bloom.enabled = true; filmGrain(false); ground(); vault(); }
  M.B.forEach(building);
  if (WLD) { WLD.decor(); bake(WS.dec); if (WLD.ink) ink(WS.dec, WLD.ink * 0.8); }
  else districts();
  flowBeam(); moneyBeams(); workBeams(); WLD ? worldLife() : life(); staffFigures(); hud();
  if (!WLD) applySkin(SKIN.id);
  window.__lots = () => M.B.map(b => ({ id: b.id, x: +b.pos[0].toFixed(1), z: +b.pos[1].toFixed(1), w: b.w, d: b.d }));
}

const WORLDS = {};

function filmGrain(on) {  // warm film grain over the canvas (1970s only)
  let el = document.getElementById("grain");
  if (!on) { el?.remove(); return; }
  if (el) return;
  const cv = document.createElement("canvas"); cv.width = cv.height = 160; const g = cv.getContext("2d"), im = g.createImageData(160, 160);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = v; im.data[i + 1] = v * 0.92; im.data[i + 2] = v * 0.8; im.data[i + 3] = 34; }
  g.putImageData(im, 0, 0);
  el = document.createElement("div"); el.id = "grain";
  Object.assign(el.style, { position: "fixed", inset: "-20px", pointerEvents: "none", zIndex: 4, backgroundImage: `url(${cv.toDataURL()})`, mixBlendMode: "overlay",
    boxShadow: "inset 0 0 160px 40px rgba(60,30,0,0.35)", animation: "grain7 0.5s steps(4) infinite" });
  if (!document.getElementById("grain7css")) { const st = document.createElement("style"); st.id = "grain7css";
    st.textContent = "@keyframes grain7{0%{transform:translate(0,0)}25%{transform:translate(-9px,6px)}50%{transform:translate(7px,-8px)}75%{transform:translate(-5px,-4px)}100%{transform:translate(0,0)}}"; document.head.append(st); }
  document.body.append(el);
}

const BZ = { pink: 0xff3fa4, hot: 0xff1f8e, lilac: 0xb06cff, purple: 0x6a2fc8, teal: 0x2fd3ff, gold: 0xffc93a, white: 0xffffff, blush: 0xffd1ec, black: 0x1a1020 };
const BZ_FONT = { font: "italic 900", fam: "'Arial Black', Sora, Arial, sans-serif" };
const BZ_CAR = { w: 2.0, h: 0.72, l: 4.3, r: 0.36, ch: 0.5, cl: 1.9, cr: 0.24, chrome: true };
function bzHeart(p, s, c, x, y, z) {  // puffy 3D heart
  const h = new THREE.Shape(); h.moveTo(0, -1); h.bezierCurveTo(-1.6, 0.1, -1.1, 1.5, 0, 0.75); h.bezierCurveTo(1.1, 1.5, 1.6, 0.1, 0, -1);
  const geo = new THREE.ExtrudeGeometry(h, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.22, bevelSegments: 4 }); geo.translate(0, 0, -0.25); geo.scale(s, s, s);
  return put(p, geo, wm(c, { roughness: 0.25, metalness: 0.2, emissive: c, emissiveIntensity: 0.25 }), x, y, z);
}
function bzStar(p, s, c, x, y, z) {
  const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ExtrudeGeometry(st, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 }); geo.translate(0, 0, -0.15); geo.scale(s, s, s);
  return put(p, geo, wm(c, { roughness: 0.2, metalness: 0.5, emissive: c, emissiveIntensity: 0.35 }), x, y, z);
}
function bzBoutique(m, b, i, o = {}) {  // glam boutique: pastel walls, striped awning, script sign, a heart or star on the roof
  const walls = [BZ.blush, 0xe9d4ff, 0xc9f4ff, 0xfff0b3, 0xffc2e2, 0xd9ffe6], aw = [BZ.pink, BZ.lilac, BZ.teal, BZ.gold, BZ.hot, BZ.purple];
  const w = Math.min(b.w, 13), d = Math.min(b.d, 9.5), h = o.h ?? 6.5 + (i % 3) * 1.5;
  const top = store(m, { w, d, h, wall: walls[i % walls.length], trim: BZ.white, awn: aw[i % aw.length], door: aw[(i + 2) % aw.length], r: 0.6,
    sign: o.sign ?? b.short, sbg: "#ffffff", sfg: css(aw[i % aw.length]), so: { ...BZ_FONT, bd: css(aw[(i + 1) % aw.length]) }, base: 0xffffff });
  (i % 2 ? bzStar : bzHeart)(m, 1.3, aw[(i + 1) % aw.length], 0, top + 1.6, 0); return top + 3;
}
function bzHouse(g, i) {  // pastel dream house with a pink convertible in the drive
  const r = (i * 7919 + 17) % 97, x = 2.2, w = 9;
  house(g, { w, d: 7.5, st: r % 3 ? 2 : 1, x, wall: [0xffd1ec, 0xe9d4ff, 0xc9f4ff, 0xffffff, 0xfff0b3][r % 5], roof: [BZ.pink, BZ.purple, BZ.hot, BZ.lilac][r % 4], r: 0.5, rh: 3.2,
    door: [BZ.pink, BZ.teal, BZ.gold, BZ.purple][r % 4], sh: [BZ.white, BZ.pink, BZ.lilac][r % 3], porch: r % 2 === 0, chimC: 0xffffff, dx: x + w * 0.2, trim: BZ.white, base: 0xffffff });
  if (r % 2) car(g, x - w / 2 - 2.4, 3.2, 0, [BZ.pink, BZ.lilac, BZ.white, BZ.teal][r % 4], BZ_CAR);
  return { dx: x + w * 0.2 };
}
WORLDS.bratz = {
  sky: { top: 0xa86bff, hor: 0xffc2ea, low: 0xffd8f0, fog: 0.0016, hemi: [0xfff0fa, 0xc06bd0, 1.25], sun: [0xfff2f8, 2.7], sunPos: [80, 160, 110], grass: 0x8fe08a, hill: 0x5fc86e, exp: 1.06,
    filter: "saturate(1.22) contrast(1.03)" },
  style: { asphalt: 0x4a2a62, walk: 0xffd6ee, dash: 0xff3fa4, kerb: 0xffffff, leaves: [0xff8fd0, 0xffb3e0, 0x7ee07a, 0x4fd06a, 0xffd1ec], hillLeaves: [0x4fd06a, 0x3fb85a, 0xff9fd6],
    skin: [0xffd9b8, 0xf1c27d, 0x8d5524, 0xffe0bd, 0xc68642], shirts: [BZ.pink, BZ.lilac, BZ.teal, BZ.gold, BZ.black, BZ.white, BZ.hot, BZ.purple], pants: [0x111111, 0x3a2a8a, 0xffffff, BZ.pink, BZ.purple],
    carCols: [BZ.pink, BZ.lilac, BZ.teal, BZ.gold, BZ.white, BZ.black, BZ.hot], car: BZ_CAR, lamp: "lolly", cloudGlow: 0xffc2ea },
  roads: [
    { pts: [[-150, -6], [-100, -12], [-50, -3], [0, 6], [50, -1], [100, -12], [150, -6]], w: 12, sw: 3.2, cars: 12, lamps: true },  // 0 Runway Boulevard
    { pts: [[0, 6], [-3, -30], [4, -62], [0, -96], [3, -150]], w: 9, sw: 2.6, cars: 4, lamps: true },                                // 1 Glitter Lane (north)
    { pts: [[-42, -3], [-46, 30], [-32, 58], [-42, 84]], w: 8, sw: 2.4, cars: 3, bulb: true, lamps: true },                            // 2 Dream House Close (south)
    { pts: [[62, -2], [68, 34], [86, 62], [98, 96], [104, 150]], w: 8, sw: 2.2, cars: 3, lamps: true },                                // 3 Diamond Drive (south-east)
    { pts: [[-72, -7], [-82, -45], [-64, -80], [-78, -150]], w: 8, sw: 2.2, cars: 3, lamps: true }],                                   // 4 Lipgloss Lane (north-west)
  lots: { library: [0, 0, 40, 14], coida: [0, -24, 30], ufiling: [0, 25, 30], billing: [0, -26, -30], deadlines: [0, 27, -30], payroll: [0, -52, -30], mail: [0, 52, -30],
    nappi: [1, -12, -48], docs: [1, 14, -52], web: [4, -90, -55], staffroom: [3, 80, 48] },
  spare: [[2, -60, 30, 0], [3, 50, 30, 0], [4, -55, -100, 0]],
  size: { library: [26, 16], coida: [13, 9.5], ufiling: [12, 9], billing: [11, 9], deadlines: [11, 9], payroll: [11, 9], mail: [11, 9], nappi: [11, 10], docs: [14, 10], web: [11, 11], staffroom: [11, 9] },
  vault: { lot: [1, 16, -100, 3], d: 24, r: 13, tag: 30, model(g) {  // the giant perfume bottle = Fees vault
    cyl(g, 11, 12, 1.2, BZ.white, 0, 0, 0, 48); cyl(g, 9.5, 10.5, 0.8, BZ.pink, 0, 1.2, 0, 48);
    lathe(g, [[0, 0], [6.4, 0], [7.2, 1.2], [7.4, 7], [6.6, 11], [3.2, 13.2], [2.2, 13.6], [0, 13.6]], wm(0xff7ac8, { roughness: 0.08, metalness: 0.25, envMapIntensity: 1.8, emissive: 0xff3fa4, emissiveIntensity: 0.18 }), 0, 2, 0, undefined, 48);
    cyl(g, 2.3, 2.3, 2.2, wm(BZ.gold, { metalness: 0.9, roughness: 0.2 }), 0, 15.4, 0, 32); ball(g, 2.4, wm(BZ.gold, { metalness: 0.9, roughness: 0.2 }), 0, 19.6, 0);
    const tube = cyl(g, 0.35, 0.35, 4, BZ.gold, 3.2, 17, 0, 12); tube.rotation.z = -1.1; ball(g, 1.1, BZ.pink, 5.5, 17.2, 0);
    bzHeart(g, 2.2, BZ.white, 0, 9, 7.6); sign(g, "FEES", 6, 1.5, "#ffffff", "#ff1f8e", 0, 3.6, 7.9, { ...BZ_FONT, bd: "#ffc93a" });
  } },
  models: {
    library(m, b) {  // the Fashion Mall on its plaza: pink arcade, glass atrium, glitter dome, a giant heart on the roof
      b.noFore = true;
      rbox(m, 24, 9, 12, BZ.pink, 0, 0, -2, 1.2); rbox(m, 24.6, 0.8, 12.6, BZ.white, 0, 8.6, -2, 0.35); rbox(m, 24.4, 0.6, 12.4, BZ.gold, 0, 0, -2, 0.2);
      put(m, new THREE.CylinderGeometry(5.4, 5.4, 8, 32, 1, false, -Math.PI / 2, Math.PI), wm(0xd6c2ff, { roughness: 0.05, metalness: 0.4, envMapIntensity: 1.6 }), 0, 4.4, 4);
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI; cyl(m, 0.14, 0.14, 8, BZ.white, Math.sin(a) * 5.45, 0.4, 4 + Math.cos(a) * 5.45, 8); }
      for (const s of [-1, 1]) { for (const y of [1.6, 5]) win(m, s * 8.6, y, 4.05, 1.6, 2, BZ.white, BZ.lilac); awning(m, 6, s * 8.6, 4.6, 4.2, BZ.lilac); }
      dome(m, 6, wm(BZ.lilac, { roughness: 0.15, metalness: 0.5, emissive: BZ.purple, emissiveIntensity: 0.2 }), 0, 9.3, -2); bzHeart(m, 3.2, BZ.hot, 0, 18.5, -2);
      sign(m, "FASHION MALL", 13, 1.9, "#ffffff", "#ff1f8e", 0, 10.6, 4.6, { ...BZ_FONT, bd: "#b06cff", glow: "#ff8fd0" });
      rbox(m, 26, 0.16, b.sb, wm(0xffffff, { map: chk(13, Math.max(2, Math.round(b.sb / 2))) }), 0, 0.02, 6.5 + b.sb / 2, 0.06);  // runway plaza
      cyl(m, 2.6, 3, 0.8, BZ.white, 0, 0, 6.5 + b.sb / 2, 32); bzStar(m, 1.6, BZ.gold, 0, 3, 6.5 + b.sb / 2); return 22;
    },
    nappi(m, b) {  // beauty spa: glass dome with a lipstick tower
      rbox(m, b.w, 4, b.d, BZ.blush, 0, 0, 0, 0.8); dome(m, Math.min(b.w, b.d) / 2 - 0.3, wm(0xffb3e0, { roughness: 0.05, metalness: 0.3, envMapIntensity: 1.6 }), 0, 4, 0);
      cyl(m, 1, 1, 4, wm(BZ.gold, { metalness: 0.9, roughness: 0.2 }), b.w / 2 - 1.2, 0, -b.d / 2 + 1.2, 20); lathe(m, [[0.9, 0], [0.9, 2.2], [0.4, 3.2], [0, 3.3]], BZ.hot, b.w / 2 - 1.2, 4, -b.d / 2 + 1.2);
      sign(m, b.short, 6, 1.3, "#ffffff", "#ff1f8e", 0, 2.4, b.d / 2 + 0.25, { ...BZ_FONT, bd: "#b06cff" }); return 9.5;
    },
    web(m, b) {  // glam magazine tower with a cover billboard
      rbox(m, b.w, 22, b.d, BZ.black, 0, 0, 0, 0.6);
      for (let y = 2; y < 21; y += 3) rbox(m, b.w + 0.2, 0.35, b.d + 0.2, y % 2 ? BZ.pink : BZ.lilac, 0, y, 0, 0.15);
      wrow(m, b.w * 0.8, b.d / 2, 3, 3, 1.4, 1.8, BZ.pink); wrow(m, b.w * 0.8, b.d / 2, 3, 9, 1.4, 1.8, BZ.pink); wrow(m, b.w * 0.8, b.d / 2, 3, 15, 1.4, 1.8, BZ.pink);
      sign(m, "GLAM MAG", b.w * 0.9, 2, "#ff1f8e", "#ffffff", 0, 23.4, 0.2, { ...BZ_FONT, glow: "#ffffff" }); bzStar(m, 1.6, BZ.gold, 0, 26, 0); return 28;
    },
    docs(m, b) {  // wardrobe warehouse: wide shed, pink roller doors, hanger sign
      rbox(m, b.w, 6, b.d, 0xe9d4ff, 0, 0, 0, 1.4); rbox(m, b.w + 0.2, 0.7, b.d + 0.2, BZ.pink, 0, 5.4, 0, 0.3);
      for (const s of [-1, 1]) rbox(m, 3.4, 4, 0.4, BZ.pink, s * 3.4, 0, b.d / 2 + 0.05, 0.3);
      sign(m, "WARDROBE · " + b.short, Math.min(12, b.w * 0.9), 1.4, "#ffffff", "#6a2fc8", 0, 7.2, b.d / 2 - 0.2, { ...BZ_FONT, bd: "#ff3fa4" }); return 9;
    },
    staffroom(m, b) { const t = bzHouse(m, 5); yard(m, 3.75, b.sb, t.dx, { fence: 0xffffff, box: BZ.pink }); sign(m, "SALON", 3.6, 0.9, "#ff3fa4", "#ffffff", 2.2 + 2, 2.7, 3.95, BZ_FONT); return 11; },
    _: (m, b) => bzBoutique(m, b, M.B.indexOf(b)),
  },
  decor() {
    lineRoad(2, { make: bzHouse, yard: { fence: 0xffffff, box: BZ.pink }, step: 14 });
    lineRoad(3, { make: bzHouse, yard: { fence: 0xffffff, box: BZ.lilac }, s0: 26, step: 15 });
    lineRoad(4, { make: bzHouse, yard: { fence: 0xffffff, box: BZ.teal }, s0: 20, step: 15 });
    const shops = ["BOUTIQUE", "SHOES", "LIPGLOSS", "NAILS", "DENIM", "BAGS", "SUNNIES", "SMOOTHIES", "PERFUME", "GLITTER"];
    lineRoad(0, { make: (g, i) => (bzBoutique(g, { w: 10, d: 8, short: shops[i % shops.length] }, i + 3, { h: 6 + (i % 3) }), { dx: 0 }), step: 15, sb: 0, d: 8, r: 6, s0: 6 });
    lineRoad(1, { make: (g, i) => (bzBoutique(g, { w: 9, d: 8, short: shops[(i + 4) % shops.length] }, i + 1, { h: 6 }), { dx: 0 }), step: 15, sb: 0, d: 8, r: 5.6, s0: 70 });
    world3DText("GLAM", { size: 13, depth: 3, color: BZ.pink }, (m, i) => { const x = -30 + i * 20, z = -132; m.position.set(x, hgt(x, z) + 1, z); });
  },
};

let PB = null;
const PBF = (dt, t) => { if (PB && PB.parent) PB.children.forEach((p, i) => { p.rotation.y += dt * 1.6; p.position.y = p.userData.y + Math.sin(t * 2 + i) * 0.5; }); };
function plumbobs(on) {
  if (PB && PB.parent) PB.parent.remove(PB); PB = null;
  if (!on) return;
  PB = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3fe04a, emissive: 0x22c03a, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 });
  const geo = new THREE.OctahedronGeometry(3, 0); geo.scale(0.75, 1.6, 0.75);
  Object.values(groups).forEach(g => { if (!g.userData || g.userData.top == null) return;
    const p = new THREE.Mesh(geo, mat); p.userData.y = g.userData.top + 7; p.position.set(g.position.x, p.userData.y, g.position.z); PB.add(p); });
  scene.add(PB); if (!anim.includes(PBF)) anim.push(PBF);
}

function themePicker() {
  const el = $("#skins");
  el.innerHTML = `<h4>🎨 City look</h4><p>Rebuilds the whole city as a different town: new streets, new buildings, same live numbers. Saved on this device.</p>
    <div class="g">${THEMES.map(k => `<button class="sk${k.id === THEME ? " on" : ""}" data-th="${k.id}"><div class="sw" style="background:linear-gradient(120deg,${k.swatch.join(",")})"></div>
      <span class="nm">${esc(k.name)}</span></button>`).join("")}</div>`;
  el.querySelectorAll("[data-th]").forEach(b => b.onclick = () => { THEME = b.dataset.th; set("consult-theme", THEME); el.hidden = true; reload(); });
  if (THEME !== "neon") return;  // colour skins (owner wants them back, 2026-10-08) re-tint the classic neon city
  el.insertAdjacentHTML("beforeend", `<h4>🌈 Colour skins</h4><div class="g">${SKINS.map(k => `<button class="sk${k.id === SKIN.id ? " on" : ""}" data-sk="${k.id}"><div class="sw" style="background:linear-gradient(120deg,${k.swatch.join(",")})"></div>
      <span class="nm">${esc(k.name)}</span></button>`).join("")}</div>`);
  el.querySelectorAll("[data-sk]").forEach(b => b.onclick = () => { set("consult-skin", b.dataset.sk); applySkin(b.dataset.sk); themePicker(); });
}

const SKINS = [
  { id: "barbie", name: "Barbie Dream", price: 0, swatch: ["#ff4fa3", "#ffc2e2", "#ffffff"],
    bg: 0xffb3d9, fog: 0xffc6e4, fogD: 0.0015, hemi: [0xffffff, 0xff5fa8, 1.5], sun: [0xfff0f7, 1.7], bloom: 0.3, exposure: 1.05,
    tint: { hue: 0.92, hueMix: 0.65, sat: 1.15, light: 1.12 }, ground: { asphalt: 0xc94785, grass: 0xff9fd0 }, weather: { kind: "snow", color: 0xffffff, speed: 0.08, len: 0.15, opacity: 0.75 } },
  { id: "boho", name: "Terracotta Boho", price: 0, swatch: ["#c2603e", "#e9c9a8", "#8f9a6a"],
    bg: 0xe8c4a0, fog: 0xe6be98, fogD: 0.0015, hemi: [0xfff1dc, 0x8a4a2a, 1.45], sun: [0xffd9a8, 1.8], bloom: 0.12, exposure: 1.0,
    tint: { hue: 0.04, hue2: 0.2, hueMix: 0.7, sat: 0.7, light: 1.02 }, ground: { asphalt: 0x7a4a35, grass: 0x8f9a6a }, weather: { kind: "none" } },
  { id: "sims", name: "The Sims", price: 0, swatch: ["#3fd04a", "#8fd3ff", "#ffffff"], plumbob: true,
    bg: 0x8fd3ff, fog: 0xbfe6ff, fogD: 0.0014, hemi: [0xffffff, 0x6fbf5a, 1.55], sun: [0xfff6e0, 1.9], bloom: 0.15, exposure: 1.05,
    tint: { hue: 0.33, hue2: 0.58, hueMix: 0.45, sat: 1.05, light: 1.12 }, ground: { asphalt: 0x6b6f78, grass: 0x6fcf4a }, weather: { kind: "none" } },
];
const OWNED = window.CITY_SKINS_OWNED || null;  // kit buyers: list of unlocked skin ids (null = all, as in our own city and the demo preview)
let SKIN = SKINS.find(k => k.id === get("consult-skin")) || SKINS[0];
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
  SKIN = SKINS.find(k => k.id === id) || SKINS[0]; plumbobs(!!SKIN.plumbob && !WLD);
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
      if (m.isLineBasicMaterial && k.edges != null) { m.color.set(k.edges); continue; }  // cartoon ink outlines
      if (u.c0 === 0x0b0716 && g.asphalt != null) { m.color.set(g.asphalt); continue; }
      if (u.c0 === 0x1d6b3c && g.grass != null) { m.color.set(g.grass); if (m.emissive) m.emissive.set(g.grass).multiplyScalar(0.15); continue; }
      if (m.map && m.color && m.color.getHex() === 0xffffff) continue;  // textured screens/billboards keep their own colours
      if (m.color) tintColor(m.color, k.tint);
      if (m.emissive && m.emissive.getHex() !== 0xffffff) tintColor(m.emissive, k.tint);
    }
  });
  renderer.domElement.style.filter = k.filter || ""; document.body.dataset.skin = k.id;
  set("consult-skin", SKIN.id);
  if (!$("#skins").hidden) themePicker();
}
function skinPicker() {
  const el = $("#skins"), own = id => !OWNED || OWNED.includes(id) || id === "neon";
  el.innerHTML = `<h4>🎨 City skins</h4><p>${DEMO ? "Pick your look. Saved on this device." : OWNED ? "Locked skins are $1 each on the Side Hustle City page." : "Tap a skin to switch the whole city."}</p>
    <div class="g">${SKINS.map(k => `<button class="sk${k.id === SKIN.id ? " on" : ""}" data-sk="${k.id}"><div class="sw" style="background:linear-gradient(120deg,${k.swatch.join(",")})"></div>
      <span class="nm">${esc(k.name)}<i>${k.price ? (own(k.id) ? (DEMO ? "$1" : "") : "🔒 $1") : ""}</i></span></button>`).join("")}</div>`;
  el.querySelectorAll("[data-sk]").forEach(b => b.onclick = () => own(b.dataset.sk) ? applySkin(b.dataset.sk)
    : window.CITY_SKIN_SHOP ? window.open(window.CITY_SKIN_SHOP, "_blank") : alert("This skin is $1 on the Side Hustle City page (link in your order email). Then add its id to skins.js."));
}
$("#skinbtn").onclick = () => { const el = $("#skins"); el.hidden = !el.hidden; if (!el.hidden) themePicker(); };
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
  try { D = await decrypt(pw); } catch (e) { $("#loading").hidden = true; $("#err").hidden = false; if (GUEST) $("#err").textContent = "This guest link has expired or is not valid."; else set(KEY, null); return; }
  PW = pw; if (remember) set(KEY, pw);
  $("#lock").hidden = true;
  if (DEMO || GUEST) $("#officebtn").hidden = true;
  if (GUEST) { $("#bananas").hidden = true; $("#lockbtn").hidden = true; document.querySelectorAll("#askbar .ph").forEach(e => e.textContent = "Ask Claude how this was built…"); }
  await Promise.all([document.fonts.load("800 54px Sora"), document.fonts.load("600 30px Inter"), services()]).catch(() => {});
  initScene(); build();
  $("#loading").hidden = true; $("#hud").hidden = false;
  tick(); setInterval(tick, 15000);
  setTimeout(() => $("#hint").style.opacity = 0, 9000);
  setInterval(reload, 10 * 60 * 1000);
  loop();
}
$("#unlock").addEventListener("submit", e => { e.preventDefault(); enter($("#pw").value, $("#remember").checked); });
const saved = get(KEY); if (DEMO) enter("demo", false); else if (GUEST) enter(GKEY, false); else if (saved) enter(saved, true);
if (!DEMO && "serviceWorker" in navigator) navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {});

function draggable(el, key, handleSel) {
  if (!el) return;
  const K = "pos-" + key, place = p => {
    const w = el.offsetWidth || 200, h = el.offsetHeight || 60;
    const x = Math.max(4, Math.min(innerWidth - w - 4, p.x)), y = Math.max(4, Math.min(innerHeight - Math.min(h, 80) - 4, p.y));
    Object.assign(el.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto", transform: "none", position: "fixed" });
  };
  const restore = () => { try { const p = JSON.parse(localStorage.getItem(K) || "null"); if (p) place(p); } catch (e) {} };
  restore(); addEventListener("resize", restore);
  let st = null, moved = false;
  el.addEventListener("pointerdown", e => {
    const h = handleSel ? e.target.closest(handleSel) : el;
    if (!h || e.target.closest("input,textarea,label,#todo h4 button,.tacts")) return;
    const r = el.getBoundingClientRect(); st = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY }; moved = false;
  });
  addEventListener("pointermove", e => {
    if (!st) return;
    if (!moved && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 6) return;
    moved = true; e.preventDefault(); place({ x: e.clientX - st.dx, y: e.clientY - st.dy });
  }, { passive: false });
  addEventListener("pointerup", () => {
    if (st && moved) { const r = el.getBoundingClientRect(); try { localStorage.setItem(K, JSON.stringify({ x: r.left, y: r.top })); } catch (e) {} }
    st = null;
  });
  el.addEventListener("click", e => { if (moved) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; } }, true);
  el.addEventListener("dblclick", e => {
    if (handleSel && !e.target.closest(handleSel)) return;
    try { localStorage.removeItem(K); } catch (x) {} el.removeAttribute("style");
  });
}
draggable($("#todo"), "todo", "h4");
draggable($("#askbar"), "askbar");
if (innerWidth > 640) draggable($("#term"), "term", ".termbar");
