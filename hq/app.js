// Sonneblom HQ: decrypts data.enc.json in the browser (AES-GCM, PBKDF2 key) and renders the dashboard.
(function () {
  const $ = s => document.querySelector(s);
  const KEY = "hq-pass";
  const COL = { Rose: "#c2185b", Etsy: "#e0711b", Gumroad: "#ef5d3a", Printify: "#2f74c0", Apify: "#7a4fb5", "x402 API": "#0f766e", KDP: "#b7791f", Pinterest: "#c8372d", Facebook: "#1877f2" };
  let fbSort = "reactions";
  const ICON = { sale: "💰", fav: "❤️", views: "👀", new: "🆕", usage: "⚙️", warn: "⚠️", info: "ℹ️" };
  let D = null, evFilter = "";

  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function decrypt(pw) {
    const enc = await (await fetch("data.enc.json?t=" + Date.now(), { cache: "no-store" })).json();
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(enc.salt), iterations: enc.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };

  async function unlock(pw, remember) {
    try { D = await decrypt(pw); } catch (e) { $("#err").hidden = false; return false; }
    if (remember) set(KEY, pw);
    $("#lock").hidden = true; $("#app").hidden = false;
    render();
    return true;
  }
  $("#unlock").addEventListener("submit", e => { e.preventDefault(); unlock($("#pw").value, $("#remember").checked); });
  $("#lockbtn").onclick = () => { set(KEY, null); location.reload(); };
  $("#reload").onclick = async () => { const pw = get(KEY) || $("#pw").value; if (pw) { D = await decrypt(pw); render(); } };
  $("#bananas").onclick = async () => {
    const b = $("#bananas"), pw = get(KEY) || $("#pw").value; if (!pw || !D) return;
    const before = D.snapshot.ts; b.disabled = true; b.textContent = "🍌 Pulling data…";
    try {
      const r = await (await fetch("https://chat.sonneblomdigitaal.co.za/api/hq-refresh", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pw }) })).json();
      if (r.error) throw new Error(r.error);
      if (r.started === false) b.textContent = `🍌 Just ran, try in ${Math.ceil(r.wait / 60)} min`;
      for (let i = 0; i < 30 && r.started; i++) {  // collect + publish takes ~2-4 minutes
        await new Promise(z => setTimeout(z, 15000));
        const nd = await decrypt(pw).catch(() => null);
        if (nd && nd.snapshot.ts !== before) { D = nd; render(); b.textContent = "🍌 Fresh!"; break; }
        b.textContent = `🍌 Pulling data… ${Math.round((i + 1) / 4 * 10) / 10} min`;
      }
    } catch (e) { b.textContent = "🍌 Failed, try again"; }
    setTimeout(() => { b.disabled = false; b.textContent = "🍌 Go Bananas"; }, 8000);
  };
  document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("on", x === b));
    document.querySelectorAll("main section").forEach(s => s.hidden = s.dataset.p !== b.dataset.t);
    scrollTo(0, 0);
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  const saved = get(KEY);
  if (saved) unlock(saved, true);

  // ── helpers ──
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = n => "$" + (n || 0).toFixed(2);
  const ago = ts => { const m = (Date.now() - new Date(ts)) / 60000; return m < 60 ? Math.round(m) + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; };
  const ok = x => x && !x.error;

  function products() {
    const s = D.snapshot, out = [];
    if (ok(s.etsy)) s.etsy.listings.forEach(x => out.push({ ...x, channel: "Etsy", kind: x.physical ? "Print-on-demand" : "Digital" }));
    if (ok(s.gumroad)) s.gumroad.listings.forEach(x => out.push({ ...x, channel: "Gumroad", views: null, favs: null, kind: "Digital" }));
    return out;
  }
  function sales() {
    const s = D.snapshot;
    return [...(ok(s.etsy) ? s.etsy.sales : []), ...(ok(s.gumroad) ? s.gumroad.sales : []), ...((D.manual.sales) || [])]
      .sort((a, b) => b.ts.localeCompare(a.ts));
  }
  function kpi(v, l, c, d) { return `<div class="kpi" style="--c:${c}"><div class="v">${v}</div><div class="l">${l}</div>${d ? `<div class="d">${d}</div>` : ""}</div>`; }
  function row(p) {
    const n = p.channel === "Gumroad" ? `<b>${p.sales}</b> sales` : `<b>${p.views}</b> views<br>${p.favs} ❤️ · ${p.sales} sold`;
    return `<a class="row" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.img || "icon-192.png")}" alt="" loading="lazy">
      <div><div class="t">${esc(p.title)}</div><div class="m"><span class="badge" style="--c:${COL[p.channel]}">${p.channel}</span>${esc(p.section || p.kind)} · ${money(p.price)}</div></div>
      <div class="n">${n}</div></a>`;
  }

  // ── render ──
  function render() {
    const s = D.snapshot, P = products(), S = sales(), H = D.history;
    $("#updated").textContent = "Updated " + ago(s.ts);
    const ev = s.etsy.listings || [];
    const views = ev.reduce((a, x) => a + x.views, 0), favs = ev.reduce((a, x) => a + x.favs, 0);
    const rev = S.reduce((a, x) => a + (x.amount || 0), 0);
    const prev = H.length > 1 ? H[H.length - 2] : null;
    const dv = prev ? views - prev.etsy_views : 0;
    const apify30 = ok(s.apify) ? s.apify.actors.reduce((a, x) => a + (x.users30 || 0), 0) : 0;
    const m = D.manual || {}, mAt = k => m[k + "_at"] ? "as of " + m[k + "_at"] : "";
    $("#kpis").innerHTML = kpi(P.length, "Listings live", COL.Etsy) + kpi(views, "Etsy listing views", COL.Etsy, dv > 0 ? "+" + dv + " since yesterday" : "") +
      kpi(m.etsy_ads_views ?? "–", "Etsy Ads views", COL.Etsy, mAt("etsy_ads_views")) + kpi(m.gumroad_views ?? "–", "Gumroad views", COL.Gumroad, mAt("gumroad_views")) +
      kpi(m.pinterest_impressions ?? "–", "Pinterest impressions", COL.Pinterest, mAt("pinterest_impressions")) +
      kpi(favs, "Etsy favourites", "#c8372d") + kpi(S.length, "Sales (all time)", "#2f8a57") + kpi(money(rev), "Revenue (gross)", "#2f8a57") +
      kpi(apify30, "Apify users (30d)", COL.Apify) +
      (ok(s.rose) ? kpi(s.rose.web_visits_24h ?? "–", "Rose site visits (24h)", "#c2185b", (s.rose.web_visits ?? 0) + " all time") +
        kpi(s.rose.chatters_24h ?? s.rose.users, "Rose chatters (24h)", "#c2185b", (s.rose.chatters ?? 0) + " all time") +
        kpi(s.rose.messages_24h, "Rose messages (24h)", "#c2185b") +
        kpi(s.rose.checkouts ?? 0, "Rose checkouts opened", "#c2185b", (s.rose.checkouts_24h ?? 0) + " in 24h") +
        kpi((s.rose.payments || 0) + (s.rose.card_paid || 0), "Rose payments", "#2f8a57", "R" + (s.rose.card_revenue_zar || 0).toFixed(0) + " card · " + s.rose.stars + " Stars") : "") +
      (ok(s.rose_social) ? kpi(s.rose_social.ad_clicks_today, "Rose ad clicks (today)", COL.Facebook, "R" + s.rose_social.ad_spend_today.toFixed(2) + " spent today · " + s.rose_social.ads_active + " active") +
        kpi(s.rose_social.fb_post_views, "Rose Facebook post views", COL.Facebook, s.rose_social.fb_followers + " followers") : "") +
      kpi(m.tiktok_views ?? "–", "TikTok views", "#111", mAt("tiktok_views")) +
      (ok(s.instagram) ? kpi(s.instagram.views, "Instagram views", "#c13584", s.instagram.followers + " followers · " + s.instagram.likes + " likes · " + s.instagram.comments + " comments")
        : kpi(m.instagram_views ?? "–", "Instagram views", "#c13584", mAt("instagram_views"))) +
      (ok(s.facebook) ? kpi(s.facebook.followers, "Facebook followers", COL.Facebook) +
        kpi(((s.facebook.daily.page_media_view || []).slice(-1)[0] || {}).value ?? 0, "Facebook views (day)", COL.Facebook, (((s.facebook.daily.page_media_view || []).slice(-1)[0] || {}).day || "").slice(5)) +
        kpi((s.facebook.daily.page_media_view || []).slice(-7).reduce((x, d) => x + d.value, 0), "Facebook views (7 days)", COL.Facebook) +
        (s.facebook.ads && !s.facebook.ads.error ? kpi(s.facebook.ads.clicks, "Facebook ad clicks", COL.Facebook, "R" + s.facebook.ads.spend.toFixed(2) + " spent") : "") : "");
    trend(H);
    feed();
    $("#top").innerHTML = P.filter(p => p.views != null).sort((a, b) => b.views - a.views).slice(0, 8).map(row).join("");
    plist();
    $("#skpis").innerHTML = ["Etsy", "Gumroad"].map(c => { const x = S.filter(s => s.channel === c); return kpi(money(x.reduce((a, s) => a + s.amount, 0)), c + ": " + x.length + " sales", COL[c]); }).join("") +
      kpi(ok(s.printify) ? s.printify.orders : "–", "Printify orders", COL.Printify) + kpi(ok(s.x402) ? s.x402.external_tx_since_oct2 : "–", "x402 payments since 2 Oct", COL["x402 API"]);
    $("#slist").innerHTML = S.length ? S.map(x => `<div class="row" style="grid-template-columns:1fr auto"><div><div class="t">${esc(x.product)}</div>
      <div class="m"><span class="badge" style="--c:${COL[x.channel] || "#555"}">${x.channel}</span>${new Date(x.ts).toLocaleDateString()} · ${esc(x.country || "")}${x.referrer ? " · via " + esc(x.referrer.replace(/^https?:\/\//, "").split("/")[0]) : ""}</div></div>
      <div class="n"><b>${money(x.amount)}</b>${x.fee ? "<br>fee " + money(x.fee) : ""}</div></div>`).join("") : "<p class='m'>No sales yet.</p>";
    channels();
    facebook();
  }
  function facebook() {
    const f = D.snapshot.facebook;
    if (!ok(f)) { $("#fkpis").innerHTML = "<p class='m'>Facebook data can't be fetched right now (the access key needs renewing). It comes back at the next update after that.</p>"; return; }
    const P = f.posts || [], a = f.ads || {}, tot = k => P.reduce((x, p) => x + (p[k] || 0), 0);
    const D7 = m => (f.daily[m] || []).slice(-7).reduce((x, d) => x + d.value, 0);
    const D1 = m => ((f.daily[m] || []).slice(-1)[0] || {}).value ?? 0;
    const D1day = m => (((f.daily[m] || []).slice(-1)[0] || {}).day || "latest day").slice(5);
    // Page was the old web-design business (and its ads) until the shop relaunch on 1 Oct 2026
    const day = (f.daily.page_media_view || []).filter(d => d.day >= "2026-10-01");
    $("#fkpis").innerHTML = (f.stale ? `<p class='m'>⚠️ Showing Facebook figures from ${esc((f.stale_since || "").slice(0, 16).replace("T", " "))} UTC: the access key expired and needs renewing.</p>` : "") + kpi(f.followers, "Followers", COL.Facebook) + kpi(P.length, "Posts published", COL.Facebook) +
      kpi(tot("views"), "Post views", COL.Facebook) + kpi(tot("reactions"), "Reactions", "#c8372d") + kpi(tot("clicks"), "Post clicks", "#2f8a57") +
      kpi(D1("page_media_view"), "Content views (" + D1day("page_media_view") + ")", COL.Facebook) + kpi(D1("page_views_total"), "Page visits (" + D1day("page_views_total") + ")", COL.Facebook) +
      kpi(D7("page_total_media_view_unique"), "People reached (7d)", COL.Facebook) + kpi(D7("page_media_view"), "Content views (7d)", COL.Facebook) +
      kpi(D7("page_views_total"), "Page visits (7d)", COL.Facebook) + kpi(D7("page_post_engagements"), "Engagements (7d)", "#2f8a57");
    $("#fads").innerHTML = a.error ? "<p class='m'>" + esc(a.error) + "</p>" : a.status ? `
      <div class="stats" style="display:flex;gap:16px;flex-wrap:wrap"><div><b>${esc(a.status)}</b>status</div><div><b>R${a.spend.toFixed(2)}</b>of R${a.budget_cap} spent</div>
      <div><b>${a.impressions}</b>impressions</div><div><b>${a.reach}</b>people reached</div><div><b>${a.clicks}</b>link clicks</div>
      <div><b>R${a.cpc.toFixed(2)}</b>per click</div><div><b>${a.ctr.toFixed(2)}%</b>click rate</div></div>
      <div style="height:8px;background:var(--bg);border-radius:4px;margin-top:10px"><div style="height:8px;border-radius:4px;background:${COL.Facebook};width:${Math.min(100, a.spend / a.budget_cap * 100)}%"></div></div>
      <p class="m" style="color:var(--muted);margin-top:6px">${esc(a.name)} · ${esc(a.balance)} · pauses automatically at R${a.budget_cap}, or after R250 if a click costs over R12 or under 1% click.</p>` : "<p class='m'>No campaign.</p>";
    if (day.length > 1) {
      const W = 640, Ht = 140, p = 28, mx = Math.max(1, ...day.map(d => d.value)), xs = day.map((_, i) => p + i * (W - 2 * p) / (day.length - 1)), ys = day.map(d => Ht - p - d.value / mx * (Ht - 2 * p));
      $("#ftrend").innerHTML = `<svg viewBox="0 0 ${W} ${Ht}" width="100%"><polyline fill="none" stroke="${COL.Facebook}" stroke-width="3" points="${xs.map((x, i) => x + "," + ys[i]).join(" ")}"/>
        ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3.5" fill="${COL.Facebook}"/>`).join("")}<text x="${p}" y="${Ht - 6}">${day[0].day.slice(5)}</text>
        <text x="${W - p}" y="${Ht - 6}" text-anchor="end">${day[day.length - 1].day.slice(5)}</text><text x="${p}" y="14">${mx} content views</text></svg>`;
    } else $("#ftrend").innerHTML = "<p class='m' style='color:var(--muted)'>Fills in day by day.</p>";
    const opts = [["reactions", "Reactions"], ["clicks", "Clicks"], ["views", "Views"], ["ts", "Newest"]];
    $("#fsort").innerHTML = opts.map(([k, l]) => `<button data-k="${k}" class="${k === fbSort ? "on" : ""}">${l}</button>`).join("");
    $("#fsort").querySelectorAll("button").forEach(b => b.onclick = () => { fbSort = b.dataset.k; facebook(); });
    const L = [...P].sort((x, y) => fbSort === "ts" ? y.ts.localeCompare(x.ts) : (y[fbSort] || 0) - (x[fbSort] || 0));
    $("#fposts").innerHTML = L.map(p => `<a class="row" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.img || "icon-192.png")}" alt="" loading="lazy">
      <div><div class="t">${esc(p.text || "(photo)")}</div><div class="m">${ago(p.ts)} · ${p.reach} reached</div></div>
      <div class="n"><b>${p.reactions}</b> 👍<br>${p.clicks} clicks · ${p.views} views</div></a>`).join("") || "<p class='m'>No posts yet.</p>";
  }
  function trend(H) {
    if (H.length < 2) { $("#trend").innerHTML = "<p class='m' style='color:var(--muted)'>The chart fills in as daily snapshots build up.</p>"; return; }
    const W = 640, Ht = 160, p = 28, xs = H.map((_, i) => p + i * (W - 2 * p) / (H.length - 1)), max = Math.max(1, ...H.map(h => h.etsy_views));
    const ys = H.map(h => Ht - p - (h.etsy_views / max) * (Ht - 2 * p));
    $("#trend").innerHTML = `<svg viewBox="0 0 ${W} ${Ht}" width="100%"><polyline fill="none" stroke="#a3452b" stroke-width="3" points="${xs.map((x, i) => x + "," + ys[i]).join(" ")}"/>
      ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3.5" fill="#a3452b"/>`).join("")}
      <text x="${p}" y="${Ht - 6}">${H[0].ts.slice(5, 10)}</text><text x="${W - p}" y="${Ht - 6}" text-anchor="end">${H[H.length - 1].ts.slice(5, 10)}</text>
      <text x="${p}" y="14">${max} views</text></svg>`;
  }
  function feed() {
    const kinds = ["", "sale", "views", "fav", "new", "usage", "warn"];
    $("#evf").innerHTML = kinds.map(k => `<button data-k="${k}" class="${k === evFilter ? "on" : ""}">${k ? ICON[k] + " " + k : "All"}</button>`).join("");
    $("#evf").querySelectorAll("button").forEach(b => b.onclick = () => { evFilter = b.dataset.k; feed(); });
    const E = D.events.filter(e => !evFilter || e.kind === evFilter).slice(0, 120);
    $("#feed").innerHTML = E.length ? E.map(e => `<li><span>${ICON[e.kind] || "•"}</span><span>${esc(e.text)}</span><time>${ago(e.ts)}</time></li>`).join("")
      : "<li>Nothing yet. New sales, views and listings show up here after each update.</li>";
  }
  function plist() {
    const q = $("#q").value.toLowerCase(), ch = $("#ch").value, so = $("#sort").value;
    const P = products().filter(p => (!ch || p.channel === ch) && (!q || p.title.toLowerCase().includes(q)));
    P.sort((a, b) => so === "title" ? a.title.localeCompare(b.title) : (b[so] ?? -1) - (a[so] ?? -1));
    $("#plist").innerHTML = `<p class="m" style="color:var(--muted);margin-bottom:6px">${P.length} listings</p>` + P.map(row).join("");
  }
  ["#q", "#ch", "#sort"].forEach(s => $(s).addEventListener("input", plist));
  function channels() {
    const s = D.snapshot, S = sales(), m = D.manual || {};
    const et = s.etsy, gr = s.gumroad, pr = s.printify, ap = s.apify, x = s.x402;
    const card = (name, url, stats, note) => `<div class="card" style="--c:${COL[name]}"><h2>${name} <a href="${url}" target="_blank" rel="noopener" style="font-weight:400;font-size:13px">open ↗</a></h2>
      <div class="stats">${stats.map(([v, l]) => `<div><b>${v}</b>${l}</div>`).join("")}</div>${note ? `<p class="note">${note}</p>` : ""}</div>`;
    const sum = c => S.filter(z => z.channel === c);
    $("#chans").innerHTML = '<div class="ch">' +
      card("Etsy", "https://www.etsy.com/your/shops/me/dashboard", ok(et) ? [[et.listings.length, "listings"], [et.listings.reduce((a, z) => a + z.views, 0), "listing views"], [m.etsy_visits ?? "–", "shop visits" + (m.etsy_visits_at ? " (" + m.etsy_visits_at + ")" : "")], [m.etsy_ads_views ?? "–", "Etsy Ads views"], [m.etsy_ads_clicks ?? "–", "Etsy Ads clicks"], [m.etsy_ads_spend != null ? money(m.etsy_ads_spend) : "–", "Etsy Ads spend"], [sum("Etsy").length, "sales"], [money(sum("Etsy").reduce((a, z) => a + z.amount, 0)), "revenue"]] : [["!", et.error]],
        ok(et) ? `${et.listings.filter(z => z.physical).length} print-on-demand, ${et.listings.filter(z => !z.physical).length} digital. Listing views come from the Etsy API (it lags a day or two); Etsy Ads views aren't in the API, so they're copied from the Etsy Ads page${m.etsy_ads_views_at ? " (" + m.etsy_ads_views_at + ")" : ""}.${m.etsy_visits_facebook != null ? ` Shop visits from Facebook: ${m.etsy_visits_facebook}; abandoned baskets: ${m.etsy_abandoned_baskets ?? 0}.` : ""}` : "") +
      card("Gumroad", "https://app.gumroad.com/dashboard", ok(gr) ? [[gr.listings.length, "products"], [m.gumroad_views ?? "–", "views"], [sum("Gumroad").length, "sales"], [money(sum("Gumroad").reduce((a, z) => a + z.amount, 0)), "revenue"]] : [["!", gr.error]],
        "Views aren't in Gumroad's API, so they're copied from the Gumroad dashboard" + (m.gumroad_views_at ? " (" + m.gumroad_views_at + ")" : "") + ". 10 new products/day limit; the rest of the catalogue is being added daily.") +
      card("Printify", "https://printify.com/app/store/products", ok(pr) ? [[pr.published, "products live"], [pr.orders, "orders"]] : [["!", pr.error]], "Physical orders are paid on Etsy; Printify charges production + shipping per order.") +
      card("Apify", "https://console.apify.com/actors", ok(ap) ? [[ap.actors.length, "actors"], [ap.actors.filter(z => z.public).length, "public"], [ap.actors.reduce((a, z) => a + z.runs, 0), "runs"], [ap.actors.reduce((a, z) => a + (z.users30 || 0), 0), "users (30d)"]] : [["!", ap.error]]) +
      card("x402 API", "https://164.160.90.241.sslip.io", ok(x) ? [[x.balance_usdc, "USDC balance"], [x.external_tx_since_oct2, "payments since 2 Oct"]] : [["!", x.error]], "AgentEdge pay-per-call API; owner test payments are excluded.") +
      (ok(s.facebook) ? card("Facebook", "https://business.facebook.com/latest/home", [[s.facebook.followers, "followers"], [(s.facebook.posts || []).length, "posts"],
        [(s.facebook.posts || []).reduce((a, z) => a + z.reactions, 0), "reactions"], [s.facebook.ads && s.facebook.ads.clicks != null ? s.facebook.ads.clicks : "–", "ad clicks"],
        [s.facebook.ads && s.facebook.ads.spend != null ? "R" + s.facebook.ads.spend.toFixed(0) : "–", "ad spend"]], "Pulled automatically from the Facebook Graph API every 3 hours. Comments and shares need one more permission (pages_read_user_content).") : "") +
      card("KDP", "https://kdpreports.amazon.com", [[m.kdp_books ?? "–", "books live"], [m.kdp_sales ?? "–", "sales"]], "Amazon KDP has no API: send me the numbers from the KDP report and I'll add them.") +
      card("Pinterest", "https://www.pinterest.com/business/hub/", [[m.pinterest_pins ?? "121", "pins uploaded"], [m.pinterest_impressions ?? "–", "impressions"], [m.pinterest_clicks ?? "–", "outbound clicks"]],
        m.pinterest_impressions_at ? "From Pinterest Analytics (" + m.pinterest_impressions_at + ")." : "Pinterest has no API access for this account: send me the impressions and outbound clicks from Pinterest Analytics.") + "</div>";
  }
})();
