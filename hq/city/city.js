// Sonneblom City: the HQ dashboard as a 3D neon city. Each business is a building, stats live on billboards,
// the Vault holds the money, and the Library is where the owner talks to Claude (portal API on the server).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const $ = s => document.querySelector(s);
const KEY = "hq-pass";  // shared with the classic HQ dashboard (same origin)
const API = "https://chat.sonneblomdigitaal.co.za/claude/api";
const MOBILE = matchMedia("(max-width: 700px)").matches || "ontouchstart" in window;
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const usd = n => "$" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const num = n => (n ?? 0).toLocaleString("en-US");
const ago = ts => { const m = Math.round((Date.now() - new Date(ts)) / 60000); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const isToday = ts => new Date(ts).toDateString() === new Date().toDateString();
let PW = null, D = null, M = null, svc = null;

// ---------- data ----------
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decrypt(pw) {
  const enc = await (await fetch("../data.enc.json?t=" + Date.now(), { cache: "no-store" })).json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(enc.salt), iterations: enc.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.ct))));
}

function model(D) {
  const s = D.snapshot, m = D.manual || {};
  const et = s.etsy || {}, gu = s.gumroad || {}, pf = s.printify || {}, ap = s.apify || {}, x4 = s.x402 || {};
  const kr = s.krypto || {}, bo = s.bots || {};
  const pnl = n => (n < 0 ? "-$" : "+$") + Math.abs(n || 0).toFixed(2);
  const botRows = x => [["Lifetime", pnl(x.lifetime)], ["Best trade", pnl(x.best_trade)], ["Best day", pnl(x.best_day)], ["Win rate", x.trades ? Math.round(100 * x.wins / x.trades) + "%" : "–"]];
  const botSheet = x => [["Lifetime profit", pnl(x.lifetime)], ["Trades", num(x.trades)], ["Wins", `${num(x.wins)} (${x.trades ? Math.round(100 * x.wins / x.trades) : 0}%)`],
    ["Highest profit trade", `${pnl(x.best_trade)} · ${x.best_trade_day || ""}`], ["Worst trade", pnl(x.worst_trade)],
    ["Highest profit day", `${pnl(x.best_day)} · ${x.best_day_date || ""}`], ["Worst day", `${pnl(x.worst_day)} · ${x.worst_day_date || ""}`],
    ["Days traded", x.days_traded ?? "–"], ["Last trade", x.last_trade ? ago(x.last_trade) : "–"], ["Bot", x.running ? "🟢 running" : "⚪ stopped"]];
  const ks = bo.kalshi || {}, pm = bo.polymarket || {}, kb = bo.krypto || {};
  const fb = s.facebook || {}, ro = s.rose || {}, ig = s.instagram || {}, rs = s.rose_social || {};
  const L = et.listings || [], G = gu.listings || [];
  const eS = et.sales || [], gS = gu.sales || [];
  const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
  const today = a => a.filter(x => isToday(x.ts));
  const last7 = k => sum((fb.daily?.[k] || []).slice(-7), x => x.value);
  const st = ch => (s[ch]?.stale ? "stale" : "ok");
  const sv = name => svc ? (svc[name] === "active" ? "ok" : "down") : "unknown";
  const worst = (...a) => a.includes("down") ? "down" : a.includes("stale") ? "stale" : a.includes("unknown") ? "unknown" : "ok";
  const adsSpend = (fb.ads?.spend || 0) + (rs.ad_spend || 0);
  const adsActive = (rs.ads_active || 0) + (fb.ads?.status === "ACTIVE" ? 1 : 0);
  const runs = sum(ap.actors || [], a => a.runs), apUsers = sum(ap.actors || [], a => a.users);
  const views = sum(L, x => x.views), favs = sum(L, x => x.favs);
  const eTot = sum(eS, x => x.amount), gTot = sum(gS, x => x.amount);
  const eDay = sum(today(eS), x => x.amount), gDay = sum(today(gS), x => x.amount);
  const roseZar = ro.card_revenue_zar || 0;
  const topViewed = [...L].sort((a, b) => b.views - a.views).slice(0, 6);
  const postsToday = (fb.posts || []).filter(p => isToday(p.ts)).length + (ig.media || []).filter(p => isToday(p.ts)).length;

  const B = [
    { id: "etsy", name: "Etsy Megastore", short: "ETSY", icon: "🛍️", color: 0xff8a3d, pos: [0, -44], w: 13, d: 11, h: 46, kind: "mega",
      status: st("etsy"), today: eDay, total: eTot,
      tag: [`${num(L.length)} listings`, eDay ? usd(eDay) + " today" : `${num(views)} views`],
      board: { title: "ETSY MEGASTORE", main: num(views), mainLabel: "listing views (all time)",
        rows: [["Orders", num(eS.length)], ["Revenue", usd(eTot)], ["Favourites", num(favs)], ["Listings", num(L.length)], ["POD products", num(pf.products)], ["Shop visits", m.etsy_visits ?? "–"]] },
      sheet: () => sheetHTML("Etsy Megastore", "CornerWorkStudio · physical gifts (Printify) + digital", eTot, "revenue all time",
        [["Orders", eS.length], ["Today", usd(eDay)], ["Listing views", num(views)], ["Favourites", num(favs)], ["Listings", L.length],
         ["Printify products", pf.products ?? "–"], ["Printify orders", pf.orders ?? 0], ["Shop visits", m.etsy_visits ?? "–"], ["Ads clicks", m.etsy_ads_clicks ?? "–"]],
        topViewed.map(x => [x.title, `${x.views} views`]), "Most viewed listings", "https://www.etsy.com/your/shops/me/dashboard") },

    { id: "fb", name: "Facebook Media HQ", short: "MEDIA HQ", icon: "📡", color: 0x3b82f6, pos: [-36, -14], w: 10, d: 10, h: 30, kind: "media",
      status: worst(st("facebook"), st("instagram"), st("rose_social")), today: 0, total: 0,
      tag: [`${num(last7("page_media_view") + (rs.fb_post_views || 0))} views`, `${num(ig.followers)} IG followers`],
      board: { title: "MEDIA HQ", main: num(ig.views_24h ?? 0), mainLabel: "Instagram views (24h)",
        rows: [["IG followers", num(ig.followers)], ["IG views", num(ig.views)], ["Rose FB views", num(rs.fb_post_views)], ["Sonneblom 7d views", num(last7("page_media_view"))], ["Ad spend", "R" + num(Math.round(adsSpend))], ["Ads live", adsActive]] },
      sheet: () => sheetHTML("Facebook Media HQ", "Rose + Sonneblom pages, Instagram, ads", ig.views_24h ?? 0, "Instagram views today",
        [["IG followers", ig.followers], ["IG posts", ig.posts], ["IG views", num(ig.views)], ["IG likes", ig.likes], ["IG comments", ig.comments],
         ["Rose FB followers", rs.fb_followers], ["Rose FB views", num(rs.fb_post_views)], ["Sonneblom followers", fb.followers],
         ["Sonneblom 7d views", num(last7("page_media_view"))], ["Posts today", postsToday], ["Ad spend", "R" + num(Math.round(adsSpend))], ["Ad clicks", num((rs.ad_clicks || 0) + (fb.ads?.clicks || 0))], ["Ads live", adsActive]],
        (ig.media || []).slice(0, 6).map(x => [x.text || x.type, `${x.views} views`]), "Latest Instagram posts", "https://business.facebook.com/latest/home") },

    { id: "rose", name: "Rose Tower", short: "ROSE", icon: "🌹", color: 0xff3d9a, pos: [36, -14], w: 8, d: 8, h: 36, kind: "spire",
      status: worst(st("rose"), sv("companion"), sv("rose-web")), today: 0, total: 0, zar: roseZar,
      tag: [`${num(ro.web_visits_24h)} visits`, `${num(ro.chatters_24h)} chatters`],
      board: { title: "ROSE COMPANION", main: num(ro.web_visits_24h), mainLabel: "website visits (24h)",
        rows: [["Chatters 24h", num(ro.chatters_24h)], ["Messages 24h", num(ro.messages_24h)], ["Checkouts", num(ro.checkouts)], ["Card revenue", "R" + num(roseZar)], ["Telegram users", num(ro.users)], ["Paying", num(ro.paying)]] },
      sheet: () => sheetHTML("Rose Tower", "rosecompanion.github.io · web chat + Telegram bot", ro.web_visits_24h, "website visits (24h)",
        [["Chatters 24h", ro.chatters_24h], ["Messages 24h", ro.messages_24h], ["New 24h", ro.new_24h], ["Checkouts", ro.checkouts], ["Card payments", ro.card_paid],
         ["Card revenue", "R" + num(roseZar)], ["Telegram users", ro.users], ["Stars payments", ro.payments], ["Paying members", ro.paying],
         ["Bot", svLabel("companion")], ["Web chat", svLabel("rose-web")]], [], "", "https://rosecompanion.github.io/chat.html") },

    { id: "gumroad", name: "Gumroad Arcade", short: "GUMROAD", icon: "🎨", color: 0x2ee6c5, pos: [-27, 30], w: 9, d: 8, h: 18, kind: "shop",
      status: st("gumroad"), today: gDay, total: gTot,
      tag: [`${num(gS.length)} sale${gS.length === 1 ? "" : "s"}`, usd(gTot)],
      board: { title: "GUMROAD ARCADE", main: usd(gTot), mainLabel: "revenue (all time)",
        rows: [["Sales", num(gS.length)], ["Today", usd(gDay)], ["Products", num(G.length)], ["Page views", m.gumroad_views ?? "–"]] },
      sheet: () => sheetHTML("Gumroad Arcade", "Digital downloads + Blender add-ons", gTot, "revenue all time",
        [["Sales", gS.length], ["Today", usd(gDay)], ["Products", G.length], ["Live", G.filter(x => x.published).length], ["Page views", m.gumroad_views ?? "–"]],
        gS.slice(-6).reverse().map(x => [x.product, `${usd(x.amount)} · ${ago(x.ts)}`]), "Sales", "https://gumroad.com/dashboard") },

    { id: "kdp", name: "Amazon KDP Books", short: "KDP", icon: "📦", color: 0xffb020, pos: [27, 30], w: 6, d: 6, h: 10, kind: "small",
      status: "ok", today: 0, total: m.kdp_royalty || 0,
      tag: [`${m.kdp_books ?? 0} books live`, `${m.kdp_drafts ?? 0} drafts`],
      board: { title: "AMAZON KDP", main: String(m.kdp_books ?? 0), mainLabel: "paperbacks published",
        rows: [["Drafts", m.kdp_drafts ?? 0], ["Sales", m.kdp_sales ?? 0], ["Royalties", usd(m.kdp_royalty || 0)]] },
      sheet: () => sheetHTML("Amazon KDP Books", "New small business · paperbacks under pen names", m.kdp_books ?? 0, "books published",
        [["Drafts", m.kdp_drafts ?? 0], ["Sales", m.kdp_sales ?? 0], ["Royalties", usd(m.kdp_royalty || 0)], ["Print-ready on disk", 25]], [],
        "", "https://kdp.amazon.com/en_US/bookshelf", `KDP has no API, so these numbers are entered by hand (${esc(m.kdp_at || "")}). Tell Claude in the Library when they change.`) },

    { id: "lab", name: "API Lab", short: "LAB", icon: "🧪", color: 0xa78bfa, pos: [-45, 10], w: 6, d: 6, h: 12, kind: "dome",
      status: worst(st("apify"), st("x402"), sv("x402-agentedge")), today: 0, total: 0,
      tag: [`${num(runs)} runs`, `${(ap.actors || []).length} actors`],
      board: { title: "API LAB", main: num(runs), mainLabel: "Apify runs (all time)",
        rows: [["Actors", (ap.actors || []).length], ["Users", num(apUsers)], ["x402 USDC", "$" + (x4.balance_usdc ?? 0)], ["x402 paid calls", x4.external_tx_since_oct2 ?? 0]] },
      sheet: () => sheetHTML("API Lab", "Apify actors + x402 AgentEdge API", runs, "Apify runs",
        [["Actors", (ap.actors || []).length], ["Users", apUsers], ["x402 balance", "$" + (x4.balance_usdc ?? 0)], ["x402 paid calls", x4.external_tx_since_oct2 ?? 0], ["x402 server", svLabel("x402-agentedge")]],
        [...(ap.actors || [])].sort((a, b) => b.runs - a.runs).slice(0, 6).map(a => [a.title, `${a.runs} runs`]), "Busiest actors", "https://console.apify.com/actors") },

    { id: "krypto", name: "Krypto Mint", short: "KRYPTO", icon: "🪙", color: 0x9945ff, pos: [0, 44], w: 6, d: 6, h: 16, kind: "coin",
      status: st("krypto"), today: 0, total: 0,
      tag: [usd(kr.usd || 0) + " wallet", kr.armed_scripts?.length ? "bot trading" : "bot off"],
      board: { title: "KRYPTO MINT", main: usd(kr.usd || 0), mainLabel: "Phantom wallet (SOL + tokens)",
        rows: [["SOL", (kr.sol ?? 0).toFixed(4)], ["Rand", "R" + num(Math.round(kr.zar || 0))], ["Bot lifetime", pnl(kb.lifetime)], ["Trading", kr.armed_scripts?.length ? kr.armed_scripts.join(", ") : "off"]] },
      sheet: () => sheetHTML("Krypto Mint", "Phantom / Krypto Bot wallet on Solana (read-only)", usd(kr.usd || 0), "wallet value",
        [["SOL", (kr.sol ?? 0).toFixed(4)], ["Tokens (open)", usd(kr.tokens_usd || 0)], ["Rand", "R" + num(Math.round(kr.zar || 0))], ["Trading script", kr.armed_scripts?.length ? kr.armed_scripts.join(", ") : "off"], ["Bot app", kr.app_running ? "🟢 running" : "🔴 stopped"], ...botSheet(kb).slice(0, 9)],
        (kr.tokens || []).map(t => [t.symbol, usd(t.usd)]), "Open tokens", kr.address ? "https://solscan.io/account/" + kr.address : "", "Balance read from the public Solana chain on every HQ refresh.") },

    { id: "kalshi", name: "Kalshi Casino", short: "KALSHI", icon: "🎲", color: 0x00d395, pos: [20, 46], w: 5, d: 5, h: 13, kind: "coin",
      status: st("bots"), today: 0, total: 0,
      tag: [pnl(ks.lifetime) + " lifetime", ks.running ? "bot running" : "bot stopped"],
      board: { title: "KALSHI BOT", main: pnl(ks.lifetime), mainLabel: "lifetime profit", rows: botRows(ks) },
      sheet: () => sheetHTML("Kalshi Casino", "BTC/ETH 15-minute contracts · numbers from Kalshi's own settlements", pnl(ks.lifetime), "lifetime profit",
        botSheet(ks).concat([["Balance", usd(ks.balance || 0)]]), [], "", "https://kalshi.com/portfolio", "Read-only: the bot itself is switched off.") },

    { id: "poly", name: "Polymarket Exchange", short: "POLYMARKET", icon: "📈", color: 0x2e5cff, pos: [-20, 46], w: 5, d: 5, h: 15, kind: "coin",
      status: st("bots"), today: 0, total: 0,
      tag: [pnl(pm.lifetime) + " lifetime", pm.running ? "bot running" : "bot stopped"],
      board: { title: "POLYMARKET BOT", main: pnl(pm.lifetime), mainLabel: "lifetime profit", rows: botRows(pm) },
      sheet: () => sheetHTML("Polymarket Exchange", "Crypto Up/Down 5-minute markets · numbers from Polymarket's public data", pnl(pm.lifetime), "lifetime profit",
        botSheet(pm).concat([["Unredeemed positions", pnl(pm.open_pnl)],
          ["Paper bot", pm.paper ? `${pm.paper.running ? "🟢" : "⚪"} $${pm.paper.cash} cash (started $${pm.paper.start}), ${pm.paper.open} open` : "not started"]]), [], "", "https://polymarket.com/portfolio", "Read-only: the bot itself is switched off.") },

    { id: "library", name: "The Library", short: "LIBRARY", icon: "📚", color: 0xe8a87c, pos: [45, 10], w: 9, d: 7, h: 9, kind: "library",
      status: sv("hq-portal"), today: 0, total: 0,
      tag: ["Claude", "tap to talk"],
      board: { title: "THE LIBRARY", main: "CLAUDE", mainLabel: "tap the Library to talk",
        rows: [["Bot services", svc ? Object.values(svc).filter(v => v === "active").length + "/" + Object.keys(svc).length + " up" : "–"], ["Data", ago(s.ts)]] } },
  ];
  const tot = eTot + gTot, day = eDay + gDay;
  return { B, s, tot, day, roseZar, sales: eS.length + gS.length + (ro.card_paid || 0) };
}
const svLabel = n => !svc ? "unknown" : svc[n] === "active" ? "🟢 running" : "🔴 " + (svc[n] || "down");

// quick links shown at the bottom of every building's panel
const LINKS = {
  vault: [["Etsy finances", "https://www.etsy.com/your/account/payments"], ["Gumroad payouts", "https://gumroad.com/payouts"], ["Yoco portal", "https://portal.yoco.com"], ["Shop hub", "https://sonneblomdigitaal.co.za"]],
  etsy: [["Shop Manager", "https://www.etsy.com/your/shops/me/dashboard"], ["Orders", "https://www.etsy.com/your/orders/sold"], ["Messages", "https://www.etsy.com/messages"], ["Stats", "https://www.etsy.com/your/shops/me/stats"], ["Etsy Ads", "https://www.etsy.com/your/shops/me/advertising"], ["Printify", "https://printify.com/app/stores"], ["Pinterest", "https://za.pinterest.com/SonneblomDigitaal/"], ["Shop hub", "https://sonneblomdigitaal.co.za"]],
  fb: [["Inbox: Rose", "https://business.facebook.com/latest/inbox/all?asset_id=1336610982875262"], ["Inbox: Sonneblom", "https://business.facebook.com/latest/inbox/all?asset_id=1296018053605465"], ["Ads Manager", "https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=770255640007326"], ["Planner", "https://business.facebook.com/latest/planner"], ["Sonneblom Page", "https://www.facebook.com/profile.php?id=1296018053605465"], ["Rose Page", "https://www.facebook.com/rose.companion"], ["Instagram", "https://www.instagram.com/rose.companion/"]],
  rose: [["Website", "https://rosecompanion.github.io/"], ["Web chat", "https://rosecompanion.github.io/chat.html"], ["Telegram bot", "https://t.me/EveningCompany_bot"], ["Instagram", "https://www.instagram.com/rose.companion/"], ["Facebook", "https://www.facebook.com/rose.companion"], ["Yoco payments", "https://portal.yoco.com"]],
  gumroad: [["Dashboard", "https://gumroad.com/dashboard"], ["Products", "https://gumroad.com/products"], ["Sales", "https://gumroad.com/customers"], ["Superhive", "https://superhivemarket.com"], ["BlenderArtists", "https://blenderartists.org"], ["BlenderNation", "https://www.blendernation.com"]],
  kdp: [["Bookshelf", "https://kdp.amazon.com/en_US/bookshelf"], ["Reports", "https://kdpreports.amazon.com/dashboard"]],
  lab: [["Apify console", "https://console.apify.com/actors"], ["Apify Store", "https://apify.com/store"], ["Contra", "https://contra.com/opportunities"]],
  krypto: [["Phantom", "https://phantom.com"], ["DexScreener", "https://dexscreener.com/solana"]],
  kalshi: [["Kalshi portfolio", "https://kalshi.com/portfolio"]],
  poly: [["Polymarket portfolio", "https://polymarket.com/portfolio"]],
};
const linksHTML = id => (LINKS[id] || []).length ? `<div class="links"><div class="lt">Quick links</div>${LINKS[id].map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join("")}</div>` : "";

function sheetHTML(title, sub, big, bigLabel, kvs, list, listTitle, link, note) {
  return `<h2>${esc(title)}</h2><div class="sub">${esc(sub)}</div>
    <div class="big">${typeof big === "number" && bigLabel.includes("revenue") ? usd(big) : esc(typeof big === "number" ? num(big) : big)}<small>${esc(bigLabel)}</small></div>
    <div class="grid">${kvs.map(([k, v]) => `<div class="kv"><b>${esc(v ?? "–")}</b><span>${esc(k)}</span></div>`).join("")}</div>
    ${list.length ? `<div class="list"><div style="color:var(--dim);font-size:12px"><span>${esc(listTitle)}</span></div>${list.map(([a, b]) => `<div><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join("")}</div>` : ""}
    ${note ? `<div class="note">${note}</div>` : ""}
    ${link ? `<a class="go" href="${link}" target="_blank" rel="noopener">Open ↗</a>` : ""}`;
}

// ---------- textures ----------
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
  const W = 1024, H = 600, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), col = hex(b.color);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#160a3c"); grd.addColorStop(1, "#07031a");
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.strokeStyle = col; g.lineWidth = 10; g.shadowColor = col; g.shadowBlur = 30; g.strokeRect(12, 12, W - 24, H - 24); g.shadowBlur = 0;
  g.fillStyle = col; g.font = "800 54px Orbitron"; g.fillText(b.board.title, 48, 92);
  const dot = { ok: "#3dffa8", down: "#ff4d6d", stale: "#ffd166", unknown: "#7d74a8" }[b.status];
  g.fillStyle = dot; g.beginPath(); g.arc(W - 70, 74, 18, 0, 7); g.fill();
  g.fillStyle = "#3dffa8"; g.font = "800 132px Orbitron"; g.shadowColor = "#3dffa8"; g.shadowBlur = 24;
  let main = String(b.board.main); g.fillText(main, 48, 250, W - 96); g.shadowBlur = 0;
  g.fillStyle = "#a99cd6"; g.font = "600 34px Inter"; g.fillText(b.board.mainLabel, 52, 300);
  const rows = b.board.rows.slice(0, 6);
  rows.forEach(([k, v], i) => {
    const x = 48 + (i % 2) * 480, y = 380 + Math.floor(i / 2) * 76;
    g.fillStyle = "#a99cd6"; g.font = "600 30px Inter"; g.fillText(k, x, y);
    g.fillStyle = "#ffffff"; g.font = "800 40px Orbitron"; g.fillText(String(v), x + 230, y, 220);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- scene ----------
let renderer, scene, camera, controls, labels, composer, clock = new THREE.Clock();
const picks = [], anim = [], groups = {};
let flight = null;

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.6 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.body.prepend(renderer.domElement);
  labels = new CSS2DRenderer(); labels.setSize(innerWidth, innerHeight);
  Object.assign(labels.domElement.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: 5 });
  document.body.append(labels.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12062e);
  scene.fog = new THREE.FogExp2(0x1a0a40, 0.0062);
  camera = new THREE.PerspectiveCamera(MOBILE ? 58 : 48, innerWidth / innerHeight, 0.5, 900);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 6, maxDistance: 260, maxPolarAngle: 1.47,
    screenSpacePanning: false, zoomSpeed: 1.1, rotateSpeed: 0.7 });
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  home(true);

  scene.add(new THREE.HemisphereLight(0x9c7bff, 0x10052a, 0.9));
  const moon = new THREE.DirectionalLight(0xc9b8ff, 0.8); moon.position.set(-40, 80, 30); scene.add(moon);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.45, 0.82);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  addrEventListeners();
}

function ground() {
  const g = new THREE.Mesh(new THREE.CircleGeometry(260, 64), new THREE.MeshStandardMaterial({ color: 0x1b0c52, roughness: 0.85 }));
  g.rotation.x = -Math.PI / 2; scene.add(g);
  const grid = new THREE.GridHelper(400, 100, 0x4c2bb0, 0x2a1670); grid.position.y = 0.02;
  grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
  const ringMat = r => new THREE.MeshBasicMaterial({ color: r, side: THREE.DoubleSide });
  for (const [r, w, c] of [[62, 1.2, 0xd8c8ff], [65, 0.25, 0x8b5cf6], [10, 0.5, 0xffd166], [13, 0.18, 0x8b5cf6]]) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r, r + w, 128), ringMat(c)); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; scene.add(m);
  }
  const road = new THREE.Mesh(new THREE.RingGeometry(56, 62, 128), new THREE.MeshStandardMaterial({ color: 0x0e0630, roughness: 0.5 }));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.03; scene.add(road);
  // cars: light streaks orbiting the ring road
  const N = 60, car = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.35, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  const cs = [], dummy = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < N; i++) { cs.push({ a: Math.random() * 6.28, r: i % 2 ? 57.5 : 60.5, v: (i % 2 ? 1 : -1) * (0.06 + Math.random() * 0.05) });
    car.setColorAt(i, col.set(i % 2 ? 0xff5a7a : 0xfff1c1)); }
  scene.add(car);
  anim.push(dt => { cs.forEach((c, i) => { c.a += c.v * dt; dummy.position.set(Math.cos(c.a) * c.r, 0.3, Math.sin(c.a) * c.r);
    dummy.rotation.y = -c.a; dummy.updateMatrix(); car.setMatrixAt(i, dummy.matrix); }); car.instanceMatrix.needsUpdate = true; });
  // background skyline
  const n = MOBILE ? 230 : 380, box = new THREE.BoxGeometry(1, 1, 1), sd = new THREE.Object3D();
  const mats = [0, 1, 2].map(i => { const t = windowTex(["#c084fc", "#60a5fa", "#f472b6"][i], 0.45, i + 3);
    return new THREE.MeshStandardMaterial({ color: 0x1a0f44, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7, roughness: 0.6 }); });
  mats.forEach((mat, k) => {
    const inst = new THREE.InstancedMesh(box, mat, Math.ceil(n / 3));
    for (let i = 0; i < inst.count; i++) {
      const a = Math.random() * 6.28, r = 72 + Math.pow(Math.random(), 0.7) * 130, h = 4 + Math.random() * (r < 110 ? 26 : 46);
      const w = 3 + Math.random() * 5;
      sd.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); sd.rotation.set(0, Math.random() * 3, 0); sd.scale.set(w, h, w);
      sd.updateMatrix(); inst.setMatrixAt(i, sd.matrix);
    }
    scene.add(inst);
  });
  // stars
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 + 0.1, R = 420;
    sp.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd8ccff, size: 1.3, fog: false })));
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
  } else if (b.kind === "media") {  // HQ block with a spinning dish
    g.add(tower(b.w, b.h, b.d, c, 21, lit));
    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, 6.28, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xbcd4ff, emissive: c, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI * 0.65; const piv = new THREE.Group(); piv.position.y = b.h + 1.2; piv.add(dish); g.add(piv);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7), new THREE.MeshBasicMaterial({ color: c })); mast.position.set(2.5, b.h + 3.5, 2.5); g.add(mast);
    anim.push(dt => piv.rotation.y += dt * 0.6); top = b.h + 7;
  } else if (b.kind === "spire") {  // slim pink tower with a glowing rose
    g.add(tower(b.w, b.h, b.d, c, 31, lit));
    const sp = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.42, 9, 4), new THREE.MeshStandardMaterial({ color: 0x2a0f3d, emissive: c, emissiveIntensity: 0.8 }));
    sp.position.y = b.h + 4.5; sp.rotation.y = Math.PI / 4; g.add(sp);
    const rose = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), new THREE.MeshBasicMaterial({ color: 0xff7ab8 })); rose.position.y = b.h + 10; g.add(rose);
    anim.push((dt, t) => { rose.rotation.y += dt; rose.scale.setScalar(1 + Math.sin(t * 2) * 0.12); }); top = b.h + 11;
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
  } else if (b.kind === "library") {  // classical library: columns, pediment, warm glow
    const base = new THREE.Mesh(new THREE.BoxGeometry(b.w, 1, b.d), new THREE.MeshStandardMaterial({ color: 0xe8dcc8, emissive: c, emissiveIntensity: 0.15 })); base.position.y = 1; g.add(base);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.8, b.h - 2, b.d * 0.7), new THREE.MeshStandardMaterial({ color: 0x3a2412, emissive: 0xffb36b, emissiveIntensity: 0.55 }));
    hall.position.y = 1.5 + (b.h - 2) / 2; g.add(hall);
    for (let i = 0; i < 6; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, b.h - 2, 12), new THREE.MeshStandardMaterial({ color: 0xf5ecdc, emissive: 0xffe0b8, emissiveIntensity: 0.35 }));
      col.position.set(-b.w / 2 + 0.9 + i * (b.w - 1.8) / 5, 1.5 + (b.h - 2) / 2, b.d / 2 - 0.5); g.add(col); }
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.1, b.w * 0.62, 2.6, 3, 1), new THREE.MeshStandardMaterial({ color: 0xf5ecdc, emissive: c, emissiveIntensity: 0.4 }));
    ped.rotation.set(0, 0, 0); ped.scale.set(1, 1, 0.55); ped.position.y = b.h + 0.8; ped.rotation.y = Math.PI / 2 * 0; g.add(ped);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffc58f })); orb.position.y = b.h + 3.2; g.add(orb);
    anim.push((dt, t) => orb.position.y = b.h + 3.2 + Math.sin(t * 1.5) * 0.4); top = b.h + 4;
  }
  // status beacon on the roof
  const bc = { ok: 0x3dffa8, down: 0xff2d55, stale: 0xffd166, unknown: 0x8a80b8 }[b.status];
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: bc }));
  beacon.position.y = top + 0.8; g.add(beacon);
  anim.push((dt, t) => beacon.scale.setScalar(b.status === "down" ? (Math.sin(t * 8) > 0 ? 1.4 : 0.6) : 1 + Math.sin(t * 3) * 0.15));
  // money beam: only for buildings that earned money today
  if (b.today > 0) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 240, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc56b, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = top + 120; g.add(beam);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.12, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    halo.rotation.x = Math.PI / 2; halo.position.y = top + 2; g.add(halo);
    anim.push((dt, t) => { beam.material.opacity = 0.4 + Math.sin(t * 3) * 0.15; halo.position.y = top + 2 + ((t * 3) % 6); halo.material.opacity = 1; });
  }
  // billboard: double-sided, on posts beside the building, facing the plaza
  const tex = boardTex(b), bw = b.kind === "mega" ? 16 : 11, bh = bw * 600 / 1024;
  const board = new THREE.Group();
  [0, Math.PI].forEach(r => { const p = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    p.rotation.y = r; p.position.z = r ? -0.06 : 0.06; board.add(p); });
  board.add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, bh + 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0x05020f })));
  const postH = b.kind === "mega" ? 10 : b.h < 14 ? 3.5 : 6;
  [-bw / 3, bw / 3].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, postH), new THREE.MeshBasicMaterial({ color: 0x2a1670 })); p.position.set(x, -bh / 2 - postH / 2, 0); board.add(p); });
  const toward = new THREE.Vector3(-b.pos[0], 0, -b.pos[1]).normalize();
  const off = Math.max(b.w, b.d) * (b.kind === "mega" ? 0.75 : 0.95) + 2;
  board.position.set(toward.x * off, postH + bh / 2, toward.z * off);
  board.lookAt(new THREE.Vector3(toward.x * 100, postH + bh / 2, toward.z * 100));
  g.add(board); g.userData.board = board;
  // floating tag
  const el = document.createElement("div"); el.className = "tag"; el.style.setProperty("--c", hex(c));
  el.innerHTML = `<b>${b.icon} ${esc(b.short)}</b><span class="${b.today > 0 ? "v" : "z"}">${esc(b.tag[0])}</span> · <span class="z">${esc(b.tag[1])}</span>`;
  el.onclick = () => focus(b.id);
  const lab = new CSS2DObject(el); lab.position.y = top + 3.5; g.add(lab);
  g.traverse(o => { if (o.isMesh) { o.userData.bid = b.id; picks.push(o); } });
  groups[b.id] = g; scene.add(g);
  // coins flow down the spoke to the vault when the building earned today
  if (b.today > 0) {
    const coins = [...Array(5)].map((_, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      m.rotation.z = Math.PI / 2; scene.add(m); return { m, k: i / 5 }; });
    const from = new THREE.Vector3(b.pos[0], 0.8, b.pos[1]).multiplyScalar(0.8), to = new THREE.Vector3(b.pos[0], 0.8, b.pos[1]).setLength(10);
    anim.push(dt => coins.forEach(c => { c.k = (c.k + dt * 0.15) % 1; c.m.position.lerpVectors(from, to, c.k); c.m.rotation.y += dt * 4; }));
  }
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
  groups.vault = g; scene.add(g);
}

// ---------- living city: avenues, parks, trees, people, dogs, lamps, birds ----------
const EYE = 1.8;
let mode = "orbit", yaw = 0, pitch = 0, vert = 0, wheelV = 0;
const keys = {}, joy = { x: 0, y: 0 }, solids = [];

function life() {
  solids.length = 0; solids.push({ x: 0, z: 0, r: 9.8, h: 13 });
  const avenues = [];
  const asph = new THREE.MeshStandardMaterial({ color: 0x0d0630, roughness: 0.6 });
  const walk = new THREE.MeshStandardMaterial({ color: 0x2a1866, roughness: 0.8 });
  M.B.forEach(b => {
    const R = Math.hypot(b.pos[0], b.pos[1]), u = new THREE.Vector2(b.pos[0] / R, b.pos[1] / R);
    const size = b.kind === "mega" ? b.w * 1.45 : Math.max(b.w, b.d) * 0.8;
    solids.push({ x: b.pos[0], z: b.pos[1], r: size + 0.6, h: b.h + 12 });
    // avenue in two parts: plaza -> building, building -> ring road
    for (const [a, z] of [[10, R - size], [R + size, 56]]) {
      if (z - a < 2) continue;
      const len = z - a, mid = u.clone().multiplyScalar(a + len / 2), rot = Math.atan2(-u.x, -u.y);
      const add = (w, mat, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(mid.x, y, mid.y); scene.add(m); };
      add(5.6, walk, 0.035); add(3.2, asph, 0.04); add(0.18, new THREE.MeshBasicMaterial({ color: b.color, transparent: true, opacity: 0.75 }), 0.05);
    }
    avenues.push({ u, end: R - size, b });
  });
  const nearAvenue = (x, z, pad) => avenues.some(a => { const t = x * a.u.x + z * a.u.y; return t > 0 && Math.abs(-x * a.u.y + z * a.u.x) < pad; });
  const nearSolid = (x, z, pad) => solids.some(s => Math.hypot(x - s.x, z - s.z) < s.r + pad);

  // trees: neon-tipped low-poly cones in parks and along the avenues
  const spots = [];
  avenues.forEach(a => { for (let t = 14; t < 55; t += 5.5) for (const side of [-4.2, 4.2]) {
    const x = a.u.x * t - a.u.y * side, z = a.u.y * t + a.u.x * side; if (!nearSolid(x, z, 1.2)) spots.push([x, z, 0.9]); } });
  for (let i = 0, n = MOBILE ? 70 : 120; spots.length < n + 120 && i < 4000; i++) {
    const r = i % 5 ? 14 + Math.random() * 40 : 64 + Math.random() * 7, a = Math.random() * 6.28, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!nearSolid(x, z, 2.5) && !nearAvenue(x, z, 3.6)) spots.push([x, z, 0.8 + Math.random() * 0.7]);
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x4a2c5a }), spots.length);
  const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 2.8, 7), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0c2a2a, roughness: 0.6 }), spots.length);
  const d = new THREE.Object3D(), col = new THREE.Color(), palette = [0x2dd4bf, 0x34d399, 0x5eead4, 0xf472b6, 0x22c55e, 0x67e8f9];
  spots.forEach(([x, z, s], i) => {
    d.position.set(x, 0.6 * s, z); d.scale.setScalar(s); d.rotation.set(0, 0, 0); d.updateMatrix(); trunk.setMatrixAt(i, d.matrix);
    d.position.y = (1.2 + 1.4) * s; d.updateMatrix(); leaf.setMatrixAt(i, d.matrix);
    leaf.setColorAt(i, col.set(palette[i % palette.length]).multiplyScalar(0.55 + Math.random() * 0.3));
  });
  scene.add(trunk, leaf);

  // street lamps around the ring road
  const lamps = []; for (let a = 0; a < 360; a += 9) for (const r of [55, 63]) lamps.push([Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r]);
  const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x3b2a7a }), lamps.length);
  const bulb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), lamps.length);
  lamps.forEach(([x, z], i) => { d.scale.setScalar(1); d.position.set(x, 1.7, z); d.updateMatrix(); post.setMatrixAt(i, d.matrix);
    d.position.y = 3.5; d.updateMatrix(); bulb.setMatrixAt(i, d.matrix); });
  scene.add(post, bulb);

  // people strolling on the avenue sidewalks; some walk dogs
  const NP = MOBILE ? 55 : 90, people = [];
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.26, 0.75, 3, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x150a30 }), NP);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }), NP);
  const shirts = [0xff6b9a, 0x60a5fa, 0xfacc15, 0x34d399, 0xf97316, 0xc084fc, 0xffffff, 0x22d3ee], skins = [0xf1c27d, 0x8d5524, 0xc68642, 0xffdbac, 0x6b4226];
  for (let i = 0; i < NP; i++) {
    const a = avenues[i % avenues.length], lo = 12, hi = Math.max(lo + 4, a.end - 1.5);
    people.push({ a, s: lo + Math.random() * (hi - lo), lo, hi, side: (Math.random() < 0.5 ? -1 : 1) * (2.0 + Math.random() * 0.5), v: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 0.8), ph: Math.random() * 6 });
    body.setColorAt(i, col.set(shirts[i % shirts.length])); head.setColorAt(i, col.set(skins[i % skins.length]));
  }
  scene.add(body, head);
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
      const u = p.a.u, x = u.x * p.s - u.y * p.side, z = u.y * p.s + u.x * p.side, bob = Math.abs(Math.sin(t * 7 + p.ph)) * 0.06;
      p.x = x; p.z = z; p.h = Math.atan2(u.x * Math.sign(p.v), u.y * Math.sign(p.v));
      d.scale.setScalar(1); d.rotation.set(0, p.h, 0);
      d.position.set(x, 0.65 + bob, z); d.updateMatrix(); body.setMatrixAt(i, d.matrix);
      d.position.y = 1.43 + bob; d.updateMatrix(); head.setMatrixAt(i, d.matrix);
    });
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
    dogs.forEach((o, i) => {
      const p = o.p, u = p.a.u, s = p.s + Math.sign(p.v) * 0.9, side = p.side - Math.sign(p.side) * 0.7;
      o.g.position.set(u.x * s - u.y * side, Math.abs(Math.sin(t * 11 + i)) * 0.05, u.y * s + u.x * side);
      o.g.rotation.y = p.h; o.tail.rotation.y = Math.sin(t * 14 + i) * 0.7;
    });
  });

  // birds circling above the towers
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

// ---------- free movement: bird (fly) and street (walk) ----------
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
      if (r > 52) { p.x *= 52 / r; p.z *= 52 / r; }
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
  // virtual joystick
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

// ---------- UI ----------
function hud() {
  const { B, tot, day, roseZar, sales, s } = M;
  groups.vault.userData.el.innerHTML = `<b>THE VAULT · TODAY</b><span style="font:800 18px Orbitron;color:${day ? "#3dffa8" : "#fff"}">${usd(day)}</span><br><span class="z">${usd(tot)} all time${roseZar ? ` + R${num(roseZar)}` : ""} · ${sales} sales</span>`;
  const dc = { ok: "#3dffa8", down: "#ff4d6d", stale: "#ffd166", unknown: "#7d74a8" };
  $("#chips").innerHTML = [`<button class="chip" data-id="vault" style="border-color:#ffd166"><b style="color:#ffd166">💰 VAULT</b>${usd(day)} today · <span class="s">${usd(tot)} total</span></button>`]
    .concat(B.map(b => `<button class="chip" data-id="${b.id}" style="border-color:${hex(b.color)}88"><b style="color:${hex(b.color)}"><span class="dot" style="background:${dc[b.status]}"></span>${b.icon} ${esc(b.short)}</b>${esc(b.tag[0])} · <span class="s">${esc(b.tag[1])}</span></button>`)).join("");
  $("#dock").innerHTML = [`<button data-id="vault"><i>💰</i>Vault</button>`].concat(B.map(b => `<button data-id="${b.id}"><i>${b.icon}</i>${esc(b.name.replace("The ", ""))}</button>`)).join("");
  document.querySelectorAll("[data-id]").forEach(x => x.onclick = () => focus(x.dataset.id));
  $("#updated").textContent = `data ${ago(s.ts)} · refreshes every 30 min`;
  const rows = B.filter(b => b.id !== "library").map(b => {
    const earned = b.id === "rose" ? (b.zar ? "R" + num(b.zar) : "R0") : usd(b.today);
    const total = b.id === "rose" ? "R" + num(b.zar || 0) : usd(b.total);
    return `<tr><td>${b.icon} ${esc(b.short)}</td><td><span class="dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dc[b.status]}"></span></td><td>${earned}</td><td>${total}</td></tr>`; });
  $("#payroll").innerHTML = `<h4>PAYROLL · TODAY</h4><table><tr><th>Worker</th><th>On</th><th>Today</th><th>All time</th></tr>${rows.join("")}</table>
    <p>Gold beams + coins rolling to the Vault = money made today. Roof lights: green running, yellow stale data, red down, grey unknown (Library closed).</p>`;
}

function vaultSheet() {
  const { B, tot, day, roseZar, sales } = M, s = M.s;
  const all = [...(s.etsy?.sales || []).map(x => ({ ...x, channel: "Etsy" })), ...(s.gumroad?.sales || [])].sort((a, b) => b.ts.localeCompare(a.ts));
  return sheetHTML("The Vault", "All money in, across every shop", tot, "revenue all time (USD)",
    [["Today", usd(day)], ["Sales", sales], ["Rose (card)", "R" + num(roseZar)], ...B.filter(b => b.total && b.id !== "rose").map(b => [b.short, usd(b.total)])],
    all.slice(0, 8).map(x => [`${x.channel} · ${x.product || x.title || ""}`, `${usd(x.amount)} · ${ago(x.ts)}`]), "Latest sales", "../", "Classic HQ dashboard (all tabs) is under Open.");
}

function focus(id) {
  $("#hint").style.opacity = 0; $("#payroll").hidden = true;
  const g = groups[id]; if (!g) return;
  const b = M.B.find(x => x.id === id);
  const portrait = innerWidth < innerHeight;
  if (id === "vault") {
    fly(new THREE.Vector3(0, 6, 0), mode === "walk" ? new THREE.Vector3(0, EYE, 24) : new THREE.Vector3(0, 16, portrait ? 34 : 26));
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
  if (id === "library") return openTerm();
  closeTerm();
  const sheet = $("#sheet"); sheet.style.setProperty("--c", id === "vault" ? "#ffd166" : hex(b.color));
  $("#sheetbody").innerHTML = (id === "vault" ? vaultSheet() : b.sheet()) + linksHTML(id);
  sheet.hidden = false; sheet.scrollTop = 0;
}

function fly(target, pos) {
  flight = { t0: performance.now(), t: 0, ft: controls.target.clone(), fp: camera.position.clone(), tt: target, tp: pos };
}
function home(instant) {
  const t = new THREE.Vector3(0, 8, 0), p = MOBILE && innerWidth < innerHeight ? new THREE.Vector3(0, 135, 175) : new THREE.Vector3(0, 85, 128);
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
  $("#payrollbtn").onclick = () => $("#payroll").hidden = !$("#payroll").hidden;
  $("#lockbtn").onclick = () => { set(KEY, null); location.reload(); };
  $("#refresh").onclick = () => reload();
}

window.__city = () => ({ camera, controls, flight, groups });
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

// ---------- portal (Library) ----------
async function api(path, opt = {}) {
  return fetch(API + path, { ...opt, headers: { Authorization: "Bearer " + PW, "Content-Type": "application/json", ...(opt.headers || {}) } });
}
async function services() {
  try { const r = await api("/status"); if (r.ok) { const j = await r.json(); svc = j.services; return j; } } catch (e) {}
  svc = null; return null;
}

let tBusy = false, tRun = 0, tSeen = 0, aiEl = null;
const tlog = () => $("#tlog");
function tAdd(cls, text) { const d = document.createElement("div"); d.className = cls; d.textContent = text; tlog().append(d); tScroll(); return d; }
function tScroll() { const l = tlog(); if (l.scrollHeight - l.scrollTop - l.clientHeight < 160) l.scrollTop = l.scrollHeight; }
function setBusy(b) { tBusy = b; $("#tsend").disabled = b; $("#tstop").hidden = !b; if (!b) document.querySelectorAll("#tlog .cursor").forEach(c => c.remove()); }

async function openTerm() {
  $("#sheet").hidden = true; $("#term").hidden = false;
  if (tlog().childElementCount) return;
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

async function attach(req) {
  setBusy(true); aiEl = tAdd("ai", ""); const cur = document.createElement("span"); cur.className = "cursor"; aiEl.after(cur);
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
        else if (e.t === "done") { if (e.stopped) tAdd("sys", "Stopped."); if (e.cost) tAdd("sys", `done · $${e.cost.toFixed(3)}`); }
      }
    }
    setBusy(false);
  } catch (e) {  // phone slept or network blipped: re-attach to the same run
    const st = await services();
    if (st && st.busy && st.run === tRun) { aiEl.remove(); document.querySelectorAll("#tlog .cursor").forEach(c => c.remove()); return attach(api(`/stream?from=0`)); }
    setBusy(false); if (!txt) tAdd("sys", "Connection lost. Reopen the Library to see the reply.");
  }
}

$("#tform").addEventListener("submit", e => {
  e.preventDefault(); const msg = $("#tin").value.trim(); if (!msg || tBusy) return;
  tAdd("me", msg); $("#tin").value = ""; $("#tin").style.height = "";
  attach(api("/chat", { method: "POST", body: JSON.stringify({ msg }) }));
});
$("#tin").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !MOBILE) { e.preventDefault(); $("#tform").requestSubmit(); } });
$("#tin").addEventListener("input", e => { e.target.style.height = ""; e.target.style.height = Math.min(140, e.target.scrollHeight) + "px"; });
$("#tx").onclick = closeTerm;
$("#tstop").onclick = () => api("/stop", { method: "POST", body: "{}" });
$("#tnew").onclick = async () => { if (tBusy) return; await api("/new", { method: "POST", body: "{}" }); tlog().innerHTML = ""; tAdd("sys", "New conversation. Claude still has its memory notes."); };

// ---------- boot ----------
function build() {
  M = model(D);
  ground(); vault(); M.B.forEach(building); life(); hud();
}
async function reload() {
  try { D = await decrypt(PW); } catch (e) { return; }
  await services();
  // rebuild the city with fresh numbers
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
  await Promise.all([document.fonts.load("800 54px Orbitron"), document.fonts.load("600 30px Inter"), services()]).catch(() => {});
  initScene(); build();
  $("#loading").hidden = true; $("#hud").hidden = false;
  tick(); setInterval(tick, 15000);
  setTimeout(() => $("#hint").style.opacity = 0, 9000);
  setInterval(reload, 10 * 60 * 1000);
  loop();
}
$("#unlock").addEventListener("submit", e => { e.preventDefault(); enter($("#pw").value, $("#remember").checked); });
const saved = get(KEY); if (saved) enter(saved, true);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {});
