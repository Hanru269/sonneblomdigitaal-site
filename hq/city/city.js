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
const KEY = "hq-pass";
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
  const botRows = x => [["Best day", `${pnl(x.best_day)} (${(x.best_day_date || "").slice(5)})`], ["Best trade", pnl(x.best_trade)], ["Lifetime", pnl(x.lifetime)], ["Bot", x.running ? "running" : "stopped"]];
  const botSheet = x => [["Profit today", pnl(x.today)], ["Lifetime profit", pnl(x.lifetime)], ["Trades", num(x.trades)], ["Wins", `${num(x.wins)} (${x.trades ? Math.round(100 * x.wins / x.trades) : 0}%)`],
    ["Highest profit trade", `${pnl(x.best_trade)} · ${x.best_trade_day || ""}`], ["Worst trade", pnl(x.worst_trade)],
    ["Highest profit day", `${pnl(x.best_day)} · ${x.best_day_date || ""}`], ["Worst day", `${pnl(x.worst_day)} · ${x.worst_day_date || ""}`],
    ["Days traded", x.days_traded ?? "–"], ["Last trade", x.last_trade ? ago(x.last_trade) : "–"], ["Bot", x.running ? "🟢 running" : "⚪ stopped"]];
  const ks = bo.kalshi || {}, pm = bo.polymarket || {}, kb = bo.krypto || {};
  const ls = s.longshot || {}; const lb = s.lsbot || {};  // $25 -> $250 attempt (Polymarket long shots, owner places bets)
  const fb = s.facebook || {}, ro = s.rose || {}, ig = s.instagram || {}, rs = s.rose_social || {};
  const rd = s.rose_diary || {}, ct = s.contra || {}, ox = s.outreach || {};
  const plus = n => n == null ? "–" : (n >= 0 ? "+" : "") + num(n);
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
    { id: "etsy", name: "Etsy Megastore", short: "ETSY", icon: "🛍️", color: 0xff8a3d, pos: [-25, 6], w: 14, d: 10, h: 11, kind: "market",
      status: st("etsy"), today: eDay, total: eTot,
      tag: [`${num(L.length)} listings`, eDay ? usd(eDay) + " today" : `${num(views)} views`],
      board: { title: "ETSY MEGASTORE", main: num(views), mainLabel: "listing views (all time)",
        rows: [["Orders", num(eS.length)], ["Revenue", usd(eTot)], ["Favourites", num(favs)], ["Listings", num(L.length)], ["POD products", num(pf.products)], ["Shop visits", m.etsy_visits ?? "–"]] },
      sheet: () => sheetHTML("Etsy Megastore", "CornerWorkStudio · physical gifts (Printify) + digital", eTot, "revenue all time",
        [["Orders", eS.length], ["Today", usd(eDay)], ["Listing views", num(views)], ["Favourites", num(favs)], ["Listings", L.length],
         ["Printify products", pf.products ?? "–"], ["Printify orders", pf.orders ?? 0], ["Shop visits", m.etsy_visits ?? "–"], ["Ads clicks", m.etsy_ads_clicks ?? "–"]],
        topViewed.map(x => [x.title, `${x.views} views`]), "Most viewed listings", "https://www.etsy.com/your/shops/me/dashboard") },

    { id: "fb", name: "Facebook Media HQ", short: "MEDIA HQ", icon: "📡", color: 0x3b82f6, pos: [-60, -44], w: 10, d: 10, h: 30, kind: "media",
      status: worst(st("facebook"), st("instagram"), st("rose_social")), today: 0, total: 0,
      tag: [`${num(last7("page_media_view") + (rs.fb_post_views || 0))} views`, `${num(ig.followers)} IG followers`],
      board: { title: "MEDIA HQ", main: num(ig.views_24h ?? 0), mainLabel: "Instagram views (24h)",
        rows: [["IG followers", num(ig.followers)], ["IG views", num(ig.views)], ["Rose FB views", num(rs.fb_post_views)], ["Sonneblom 7d views", num(last7("page_media_view"))], ["Ad spend", "R" + num(Math.round(adsSpend))], ["Ads live", adsActive]] },
      sheet: () => sheetHTML("Facebook Media HQ", "Rose + Sonneblom pages, Instagram, ads", ig.views_24h ?? 0, "Instagram views today",
        [["IG followers", ig.followers], ["IG posts", ig.posts], ["IG views", num(ig.views)], ["IG likes", ig.likes], ["IG comments", ig.comments],
         ["Rose FB followers", rs.fb_followers], ["Rose FB views", num(rs.fb_post_views)], ["Sonneblom followers", fb.followers],
         ["Sonneblom 7d views", num(last7("page_media_view"))], ["Posts today", postsToday], ["Ad spend", "R" + num(Math.round(adsSpend))], ["Ad clicks", num((rs.ad_clicks || 0) + (fb.ads?.clicks || 0))], ["Ads live", adsActive]],
        (ig.media || []).slice(0, 6).map(x => [x.text || x.type, `${x.views} views`]), "Latest Instagram posts", "https://business.facebook.com/latest/home") },

    { id: "rose", name: "Rose Tower", short: "ROSE", icon: "🌹", color: 0xff3d9a, pos: [-60, -14], w: 8, d: 8, h: 36, kind: "spire",
      status: worst(st("rose"), sv("companion"), sv("rose-web")), today: rd.money_today_usd || 0, total: rd.money_usd || 0, zar: roseZar,
      tag: [`${num(rd.followers)} followers`, `${plus(rd.gained_24h)} today`],
      board: { title: "ROSE · MY DAY", main: num(rd.followers), mainLabel: "followers (Facebook + Instagram)",
        rows: [["New today", plus(rd.gained_24h)], ["New this week", plus(rd.gained_7d)], ["Messages today", num(rd.messages_today)], ["Likes this week", num(rd.likes_7d)], ["Comments (week)", num(rd.comments_7d)], ["Money made", usd(rd.money_usd)]] },
      sheet: () => sheetHTML("Rose Tower", "Rose, 28 · AI influencer · her day in numbers", rd.followers ?? 0, "followers (FB + IG)",
        [["New followers today", plus(rd.gained_24h)], ["New this week", plus(rd.gained_7d)], ["Instagram", num(rd.ig_followers)], ["Facebook", num(rd.fb_followers)],
         ["Messages today", num(rd.messages_today)], ["Chatting (24h)", num(rd.chatters_24h)], ["Messenger chats", num(ro.fb_dm_chats)],
         ["Likes this week", num(rd.likes_7d)], ["Comments this week", num(rd.comments_7d)], ["Views (24h)", num(rd.views_24h)], ["Posts this week", num(rd.posts_7d)],
         ["Money today", usd(rd.money_today_usd)], ["Money this week", usd(rd.money_7d_usd)], ["Money all time", usd(rd.money_usd)],
         ["Fans paying now", num(rd.fans)], ["Albums sold", num((rd.sales_by_item || {}).album || 0)], ["VIP girlfriend weeks", num((rd.sales_by_item || {}).gf || 0)],
         ["Bot", svLabel("companion")], ["Web chat", svLabel("rose-web")]], [], "", "https://rosecompanion.github.io/chat.html",
        `<i>Dear diary 💕 ${rd.gained_7d > 0 ? `${num(rd.gained_7d)} new followers this week` : "a quiet week for followers"}, ${num(rd.likes_7d)} likes and ${num(rd.comments_7d)} comments. ` +
        `${rd.messages_today ? `${num(rd.messages_today)} messages from my guys today` : "No messages yet today"}${rd.money_usd ? `, and ${usd(rd.money_usd)} made so far` : ", still waiting for my first sale"} 🌹</i>`) },

    { id: "contra", name: "Contra Studio", short: "CONTRA", icon: "💼", color: 0x00e5ff, pos: [-60, 16], w: 7, d: 7, h: 26, kind: "glass",
      status: "ok", today: 0, total: ct.earned_usd || 0,
      tag: [`${num(ct.busy)} jobs busy`, `${num(ct.done)} done`],
      board: { title: "CONTRA STUDIO", main: num(ct.sent), mainLabel: "proposals / jobs sent",
        rows: [["Jobs busy", num(ct.busy)], ["Jobs done", num(ct.done)], ["Projects linked", num(ct.projects)], ["Earned", usd(ct.earned_usd)], ["Profile views", ct.views ? num(ct.views) : "–"]] },
      sheet: () => sheetHTML("Contra Studio", "Freelance digital studio (websites, AI automation, brand & content)", ct.sent ?? 0, "jobs / proposals sent",
        [["Jobs busy", num(ct.busy)], ["Jobs done", num(ct.done)], ["Projects linked", num(ct.projects)], ["Earned", usd(ct.earned_usd)], ["Profile views", ct.views ? num(ct.views) : "–"]], [],
        "", "https://contra.com/opportunities", `Contra has no API, so these come from a Go Bananas sweep${ct.at ? ` (${esc(ct.at)})` : ""}. Tell Claude when a job starts or finishes.`) },

    { id: "zoho", name: "Zoho Mail Outreach", short: "OUTREACH", icon: "✉️", color: 0xffe14d, pos: [-60, 46], w: 9, d: 7, h: 11, kind: "mail",
      status: st("outreach"), today: 0, total: ox.paid_eur || 0,
      tag: [`${num(ox.sent_today)} sent today`, `${num(ox.replied)} replies`],
      board: { title: "EAA OUTREACH", main: num(ox.sent_total), mainLabel: "emails sent (eaafix.com)",
        rows: [["Sent today", num(ox.sent_today)], ["Replies", num(ox.replied)], ["Interested", num(ox.interested)], ["Quotes", num(ox.quoted)], ["Won", num(ox.won)], ["Queue", num(ox.queue)]] },
      sheet: () => sheetHTML("Zoho Mail Outreach", "EAA accessibility fixes · hello@eaafix.com · cold email, 20+/day", ox.sent_total ?? 0, "emails sent",
        [["Sent today", num(ox.sent_today)], ["Leads found", num(ox.leads)], ["Waiting to send", num(ox.queue)], ["Followed up", num(ox.followed_up)], ["Replies", num(ox.replied)],
         ["Interested", num(ox.interested)], ["Reports sent", num(ox.reports)], ["Quotes", num(ox.quoted)], ["Won", num(ox.won)], ["Paid", "€" + num(ox.paid_eur || 0)],
         ["Bounced", num(ox.bounced)], ["Opted out", num(ox.opted_out)]], [], "", "https://mail.zoho.com", "Sender runs weekdays 09:00; replies and bounces are checked every 20 minutes.") },

    { id: "gumroad", name: "Gumroad Arcade", short: "GUMROAD", icon: "🎨", color: 0x2ee6c5, pos: [25, 6], w: 11, d: 9, h: 9, kind: "market",
      status: st("gumroad"), today: gDay, total: gTot,
      tag: [`${num(gS.length)} sale${gS.length === 1 ? "" : "s"}`, usd(gTot)],
      board: { title: "GUMROAD ARCADE", main: usd(gTot), mainLabel: "revenue (all time)",
        rows: [["Sales", num(gS.length)], ["Today", usd(gDay)], ["Products", num(G.length)], ["Page views", m.gumroad_views ?? "–"]] },
      sheet: () => sheetHTML("Gumroad Arcade", "Digital downloads + Blender add-ons", gTot, "revenue all time",
        [["Sales", gS.length], ["Today", usd(gDay)], ["Products", G.length], ["Live", G.filter(x => x.published).length], ["Page views", m.gumroad_views ?? "–"]],
        gS.slice(-6).reverse().map(x => [x.product, `${usd(x.amount)} · ${ago(x.ts)}`]), "Sales", "https://gumroad.com/dashboard") },

    { id: "kdp", name: "Amazon KDP Books", short: "KDP", icon: "📦", color: 0xffb020, pos: [0, 32], w: 9, d: 7, h: 7, kind: "market",
      status: "ok", today: 0, total: m.kdp_royalty || 0,
      tag: [`${m.kdp_books ?? 0} books live`, `${m.kdp_drafts ?? 0} drafts`],
      board: { title: "AMAZON KDP", main: String(m.kdp_books ?? 0), mainLabel: "paperbacks published",
        rows: [["Drafts", m.kdp_drafts ?? 0], ["Sales", m.kdp_sales ?? 0], ["Royalties", usd(m.kdp_royalty || 0)]] },
      sheet: () => sheetHTML("Amazon KDP Books", "New small business · paperbacks under pen names", m.kdp_books ?? 0, "books published",
        [["Drafts", m.kdp_drafts ?? 0], ["Sales", m.kdp_sales ?? 0], ["Royalties", usd(m.kdp_royalty || 0)], ["Print-ready on disk", 25]], [],
        "", "https://kdp.amazon.com/en_US/bookshelf", `KDP has no API, so these numbers are entered by hand (${esc(m.kdp_at || "")}). Tell Claude in the Library when they change.`) },

    { id: "lab", name: "API Lab", short: "LAB", icon: "🧪", color: 0xa78bfa, pos: [60, 48], w: 6, d: 6, h: 12, kind: "dome",
      status: worst(st("apify"), st("x402"), sv("x402-agentedge")), today: 0, total: 0,
      tag: [`${num(runs)} runs`, `${(ap.actors || []).length} actors`],
      board: { title: "API LAB", main: num(runs), mainLabel: "Apify runs (all time)",
        rows: [["Actors", (ap.actors || []).length], ["Users", num(apUsers)], ["x402 USDC", "$" + (x4.balance_usdc ?? 0)], ["x402 paid calls", x4.external_tx_since_oct2 ?? 0]] },
      sheet: () => sheetHTML("API Lab", "Apify actors + x402 AgentEdge API", runs, "Apify runs",
        [["Actors", (ap.actors || []).length], ["Users", apUsers], ["x402 balance", "$" + (x4.balance_usdc ?? 0)], ["x402 paid calls", x4.external_tx_since_oct2 ?? 0], ["x402 server", svLabel("x402-agentedge")]],
        [...(ap.actors || [])].sort((a, b) => b.runs - a.runs).slice(0, 6).map(a => [a.title, `${a.runs} runs`]), "Busiest actors", "https://console.apify.com/actors") },

    { id: "krypto", name: "Krypto Mint", short: "KRYPTO", icon: "🪙", color: 0x9945ff, pos: [60, -48], w: 6, d: 6, h: 16, kind: "coin",
      status: st("krypto"), today: 0, total: 0,
      tag: [usd(kr.usd || 0) + " wallet", kr.armed_scripts?.length ? "bot trading" : "bot off"],
      board: { title: "KRYPTO MINT", main: usd(kr.usd || 0), mainLabel: "Phantom wallet (SOL + tokens)",
        rows: [["SOL", (kr.sol ?? 0).toFixed(4)], ["Rand", "R" + num(Math.round(kr.zar || 0))], ["Bot today", pnl(kb.today)], ["Best day", pnl(kb.best_day)]] },
      sheet: () => sheetHTML("Krypto Mint", "Phantom / Krypto Bot wallet on Solana (read-only)", usd(kr.usd || 0), "wallet value",
        [["SOL", (kr.sol ?? 0).toFixed(4)], ["Tokens (open)", usd(kr.tokens_usd || 0)], ["Rand", "R" + num(Math.round(kr.zar || 0))], ["Trading script", kr.armed_scripts?.length ? kr.armed_scripts.join(", ") : "off"], ["Bot app", kr.app_running ? "🟢 running" : "🔴 stopped"], ...botSheet(kb).slice(0, 9)],
        (kr.tokens || []).map(t => [t.symbol, usd(t.usd)]), "Open tokens", kr.address ? "https://solscan.io/account/" + kr.address : "", "Balance read from the public Solana chain on every HQ refresh.") },

    { id: "kalshi", name: "Kalshi Casino", short: "KALSHI", icon: "🎲", color: 0x00d395, pos: [60, 0], w: 5, d: 5, h: 13, kind: "coin",
      status: st("bots"), today: 0, total: 0,
      tag: [pnl(ks.today) + " today", "best day " + pnl(ks.best_day)],
      board: { title: "KALSHI BOT", main: pnl(ks.today), mainLabel: "profit today", rows: botRows(ks) },
      sheet: () => sheetHTML("Kalshi Casino", "BTC/ETH 15-minute contracts · numbers from Kalshi's own settlements", pnl(ks.lifetime), "lifetime profit",
        botSheet(ks).concat([["Balance", usd(ks.balance || 0)]]), [], "", "https://kalshi.com/portfolio", "Read-only: the bot itself is switched off.") },

    { id: "poly", name: "Polymarket Exchange", short: "POLYMARKET", icon: "📈", color: 0x2e5cff, pos: [60, -24], w: 5, d: 5, h: 15, kind: "coin",
      status: st("bots"), today: 0, total: 0,
      tag: [pnl(pm.today) + " today", "best day " + pnl(pm.best_day)],
      board: { title: "POLYMARKET BOT", main: pnl(pm.today), mainLabel: "profit today", rows: botRows(pm) },
      sheet: () => sheetHTML("Polymarket Exchange", "Crypto Up/Down 5-minute markets · numbers from Polymarket's public data", pnl(pm.lifetime), "lifetime profit",
        botSheet(pm).concat([["Unredeemed positions", pnl(pm.open_pnl)],
          ["Paper bot", pm.paper ? `${pm.paper.running ? "🟢" : "⚪"} $${pm.paper.cash} cash (started $${pm.paper.start}), ${pm.paper.open} open` : "not started"]]), [], "", "https://polymarket.com/portfolio", "Read-only: the bot itself is switched off.") },

    { id: "longshot", name: "Long Shot Tower", short: "10X", icon: "🎯", color: 0xff3b6b, pos: [60, 24], w: 5, d: 5, h: 20, kind: "coin",
      status: st("longshot"), today: 0, total: 0,
      tag: [usd(lb.value || 0) + " of $250" + (lb.mode === "paper" ? " (practice)" : ""), `${(lb.positions || []).length} open · ${lb.trades || 0} done`],
      board: { title: "$25 → $250 BOT", main: usd(lb.value || 0), mainLabel: `${Math.round(100 * (lb.progress || 0))}% of the way to $250` + (lb.mode === "paper" ? " · practice money" : ""),
        rows: [["Style", lb.style_name || "–"], ["Open trades", (lb.positions || []).length], ["Trades done", `${lb.trades || 0} (${lb.wins || 0} wins)`], ["Status", lb.status || "–"]] },
      sheet: () => sheetHTML("Long Shot Tower", "The $25 → $250 bot: many small Polymarket trades that compound toward $250. It sells winners early, cuts losers, and switches style (long shots → mid prices → steady) when a style keeps losing. " + (lb.mode === "paper" ? "Practice mode: real prices, simulated money." : "Live mode."),
        usd(lb.value || 0), "bot value (cash + open trades)",
        [["Mode", lb.mode === "paper" ? "practice (no real money)" : "live"], ["Status", lb.status || "–"], ["Style now", lb.style_name || "–"], ["Cash", usd(lb.cash || 0)], ["Progress", Math.round(100 * (lb.progress || 0)) + "%"], ["Trades done", `${lb.trades || 0} (${lb.wins || 0} wins)`]]
          .concat((lb.positions || []).map(p => [`${p.q} · ${p.outcome}`, `${usd(p.stake)} @ ${Math.round(p.entry * 100)}c → now ${Math.round((p.mark ?? p.entry) * 100)}c`])),
        (lb.log || []).slice(0, 8).map(l => [l.msg, (l.ts || "").slice(5, 16).replace("T", " ")]),
        "Latest bot moves", "https://polymarket.com", "Most long shots lose. The bot stops at $250 or when the money runs out.") },

    { id: "library", name: "The Library", short: "LIBRARY", icon: "📚", color: 0xe8a87c, pos: [0, -66], w: 20, d: 12, h: 12, kind: "library",
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
  contra: [["Opportunities", "https://contra.com/opportunities"], ["My profile", "https://contra.com/"], ["Messages", "https://contra.com/inbox"]],
  zoho: [["Zoho Mail", "https://mail.zoho.com"], ["eaafix.com", "https://eaafix.com"]],
  lab: [["Apify console", "https://console.apify.com/actors"], ["Apify Store", "https://apify.com/store"], ["Contra", "https://contra.com/opportunities"]],
  krypto: [["Phantom", "https://phantom.com"], ["DexScreener", "https://dexscreener.com/solana"]],
  kalshi: [["Kalshi portfolio", "https://kalshi.com/portfolio"]],
  poly: [["Polymarket portfolio", "https://polymarket.com/portfolio"]],
  longshot: [["Polymarket portfolio", "https://polymarket.com/portfolio"], ["Ending soon", "https://polymarket.com/markets?_s=end_date%3Aasc"]],
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
  const c = document.createElement("canvas"); c.width = 1024; c.height = 600;
  paintBoard(c.getContext("2d"), b);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function paintBoard(g, b) {
  const W = 1024, H = 600, col = hex(b.color);
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

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.45, 0.82);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  addrEventListeners();
}

// ---------- Office park in the middle of a ring road: cars, lamps, rain ----------
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
  // wet asphalt everywhere
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(EXT * 2 + 260, EXT * 2 + 260), new THREE.MeshStandardMaterial({ color: 0x0b0716, roughness: 0.28, metalness: 0.6 }));
  asphalt.rotation.x = -Math.PI / 2; scene.add(asphalt);
  // the office park: grass with a glowing kerb
  const grass = new THREE.Mesh(new THREE.BoxGeometry(PARK * 2, 0.3, PARK * 2), new THREE.MeshStandardMaterial({ color: 0x1d6b3c, emissive: 0x06301a, roughness: 0.95 }));
  grass.position.y = 0.15; scene.add(grass);
  const kerb = neonEdges(new THREE.BoxGeometry(PARK * 2 + 0.4, 0.32, PARK * 2 + 0.4), 0x22ff88); kerb.position.y = 0.16; scene.add(kerb);

  // city blocks (sidewalk slabs) with towers; the 4 blocks facing the park are "Times Square"
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

  // towers: window-textured boxes (3 colour moods) + neon strips on corners and a band near the roof
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

  // road markings: dashed centre lines + zebra crossings round the park
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

  // street lamps on both kerbs: post, arm, glowing head (cyan / magenta / warm)
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

  // smoggy stars
  const sp = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 + 0.25, R = 520; sp.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd8ccff, size: 1.2, fog: false })));
}

// detailed cars: body, glass cabin, 4 wheels, headlights, red light bar and neon underglow; two lanes per street
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

// flying cars cruising above the streets with blinking lights
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

// Times Square: big screens on the towers facing the park, cycling through every building's numbers, plus a news ticker
function slides() {
  const r = M.s.rose_diary || {};
  return [{ color: 0xff2bd6, status: "ok", board: { title: "SONNEBLOM CITY", main: usd(M.day), mainLabel: "made today across the city", rows: [["All time", usd(M.tot)], ["Sales", num(M.sales)], ["Rose followers", num(r.followers)], ["Buildings", M.B.length]] } },
    ...M.B.filter(b => b.board).map(b => ({ ...b, title: b.board.title }))];
}
function timesSquare(screens) {
  const S = slides(), cvs = [];
  screens.forEach((sc, i) => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 300;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sc.w, sc.h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    mesh.position.set(sc.x, sc.y, sc.z); mesh.rotation.y = sc.ry; scene.add(mesh);
    const frame = neonEdges(new THREE.PlaneGeometry(sc.w + 0.5, sc.h + 0.5), pick(NEON)); frame.position.copy(mesh.position); frame.rotation.y = sc.ry; scene.add(frame);
    cvs.push({ c, t, k: i % S.length });
    paint(c, t, S[i % S.length]);
  });
  // ticker under every second screen
  const tc = document.createElement("canvas"); tc.width = 2048; tc.height = 64;
  const g = tc.getContext("2d"); g.fillStyle = "#05020f"; g.fillRect(0, 0, 2048, 64);
  const r = M.s.rose_diary || {};
  const items = [`CITY TODAY ${usd(M.day)}`, `ALL TIME ${usd(M.tot)}`, ...M.B.filter(b => b.tag).map(b => `${b.short} ${b.tag[0]}`), `ROSE ${num(r.followers)} FOLLOWERS`];
  g.font = "800 34px Orbitron"; g.fillStyle = "#ffd34d"; g.fillText(items.join("   ◆   ") + "   ◆   ", 10, 45, 2030);
  const tt = new THREE.CanvasTexture(tc); tt.wrapS = THREE.RepeatWrapping; tt.repeat.x = 0.35; tt.colorSpace = THREE.SRGBColorSpace;
  screens.forEach((sc, i) => { if (i % 2) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sc.w, 1.3), new THREE.MeshBasicMaterial({ map: tt, toneMapped: false }));
    m.position.set(sc.x, sc.y - sc.h / 2 - 1.2, sc.z); m.rotation.y = sc.ry; scene.add(m); });
  let next = 0, j = 0;
  anim.push((dt, t) => {
    tt.offset.x = (tt.offset.x + dt * 0.04) % 1;
    if (t > next && cvs.length) { next = t + 0.6; const s = cvs[j++ % cvs.length]; s.k = (s.k + 1) % S.length; paint(s.c, s.t, S[s.k]); }
  });
}
function paint(c, t, b) { const g = c.getContext("2d"); g.setTransform(0.5, 0, 0, 0.5, 0, 0); paintBoard(g, b); t.needsUpdate = true; }

// rain falling around the camera
function rain() {
  const N = MOBILE ? 900 : 2400, p = new Float32Array(N * 6), sp = [];
  for (let i = 0; i < N; i++) { const x = rnd(-70, 70), y = rnd(0, 60), z = rnd(-70, 70); p.set([x, y, z, x, y - 1.2, z], i * 6); sp.push(rnd(45, 65)); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: 0.28, depthWrite: false }));
  scene.add(lines);
  anim.push(dt => {
    lines.position.set(Math.round(camera.position.x / 10) * 10, Math.max(0, camera.position.y - 40), Math.round(camera.position.z / 10) * 10);
    for (let i = 0; i < N; i++) { let y = p[i * 6 + 1] - sp[i] * dt; if (y < 0) y += 60; p[i * 6 + 1] = y; p[i * 6 + 4] = y - 1.2; }
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

// which way a building's front (and billboard) faces: side quarters face the boulevard, markets face the Vault, the Library faces the pool
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
  const toward = faceDir(b);
  const off = b.kind === "market" ? b.d / 2 + 5.5 : Math.max(b.w, b.d) * (b.kind === "mega" ? 0.75 : 0.95) + 2;
  if (b.kind === "library") { board.children.slice(-2).forEach(p => p.visible = false); board.position.set(0, top + bh / 2 + 0.6, 0); top += bh + 1; }
  else board.position.set(toward.x * off, postH + bh / 2, toward.z * off);
  if (b.kind === "market") { board.position.y += b.h * 0.55; board.children.slice(-2).forEach(p => { p.scale.y = (postH + b.h * 0.55) / postH; p.position.y = -bh / 2 - (postH + b.h * 0.55) / 2; }); }
  board.lookAt(board.position.clone().add(g.position).add(toward));
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
    const V = new THREE.Vector3(VAULT[0], 0.8, VAULT[1]), from = new THREE.Vector3(b.pos[0], 0.8, b.pos[1]), to = from.clone().sub(V).setLength(10).add(V);
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
  g.position.set(VAULT[0], 0, VAULT[1]); groups.vault = g; scene.add(g);
}

// ---------- living city: avenues, parks, trees, people, dogs, lamps, birds ----------
const EYE = 1.8;
let mode = "orbit", yaw = 0, pitch = 0, vert = 0, wheelV = 0;
const keys = {}, joy = { x: 0, y: 0 }, solids = [];

function life() {
  solids.push({ x: VAULT[0], z: VAULT[1], r: 9.8, h: 13 });
  const d = new THREE.Object3D(), col = new THREE.Color();
  const walk = new THREE.MeshStandardMaterial({ color: 0x5b5470, roughness: 0.85 }), stone = new THREE.MeshStandardMaterial({ color: 0x3d3550, roughness: 0.7 });
  // a planned park: two boulevards (media west, money east), a mall with a reflecting pool up to the Library, a market square round the Vault
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
  // market square paving, reflecting pool, Library forecourt
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

  // trees: formal rows along the pool and the boulevards, loose groves elsewhere (kept sparse so the buildings read clearly)
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

  // lamps and benches along every path
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

  // flower beds in the open lawns, hedges round the park with gates where the paths come in
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

  // people strolling along the paths; some walk dogs
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
    all.slice(0, 8).map(x => [`${x.channel} · ${x.product || x.title || ""}`, `${usd(x.amount)} · ${ago(x.ts)}`]), "Latest sales");
}

function focus(id) {
  $("#hint").style.opacity = 0; $("#payroll").hidden = true;
  const g = groups[id]; if (!g) return;
  const b = M.B.find(x => x.id === id);
  const portrait = innerWidth < innerHeight;
  if (id === "vault") {
    fly(new THREE.Vector3(VAULT[0], 6, VAULT[1]), mode === "walk" ? new THREE.Vector3(VAULT[0], EYE, VAULT[1] + 24) : new THREE.Vector3(VAULT[0], 16, VAULT[1] + (portrait ? 34 : 26)));
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
  $("#payrollbtn").onclick = () => $("#payroll").hidden = !$("#payroll").hidden;
  $("#lockbtn").onclick = () => { set(KEY, null); location.reload(); };
  $("#refresh").onclick = () => reload();
  $("#bananas").onclick = async () => {  // Go Bananas: the server re-collects every source (update.sh), then we reload the data
    const btn = $("#bananas"); if (btn.disabled) return; btn.disabled = true; btn.textContent = "🍌 Going…";
    try {
      const r = await (await fetch("https://chat.sonneblomdigitaal.co.za/api/hq-refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pw: PW }) })).json();
      if (r.error) btn.textContent = "🍌 " + r.error;
      else if (!r.started) btn.textContent = `🍌 Done recently, try in ${Math.ceil((r.wait || 60) / 60)} min`;
      else { btn.textContent = "🍌 Collecting… (about 2 min)"; await new Promise(z => setTimeout(z, 120000)); await reload(); btn.textContent = "🍌 Fresh!"; }
    } catch (e) { btn.textContent = "🍌 Couldn't reach the server"; }
    setTimeout(() => { btn.textContent = "🍌 Go Bananas"; btn.disabled = false; }, 8000);
  };
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
