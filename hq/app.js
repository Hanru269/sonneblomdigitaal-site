// Sonneblom HQ: decrypts data.enc.json in the browser (AES-GCM, PBKDF2 key) and renders the dashboard.
(function () {
  const $ = s => document.querySelector(s);
  const KEY = "hq-pass";
  const COL = { Etsy: "#e0711b", Gumroad: "#ef5d3a", Printify: "#2f74c0", Apify: "#7a4fb5", "x402 API": "#0f766e", KDP: "#b7791f", Pinterest: "#c8372d" };
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
    $("#kpis").innerHTML = kpi(P.length, "Listings live", COL.Etsy) + kpi(views, "Etsy views", COL.Etsy, dv > 0 ? "+" + dv + " since yesterday" : "") +
      kpi(favs, "Etsy favourites", "#c8372d") + kpi(S.length, "Sales (all time)", "#2f8a57") + kpi(money(rev), "Revenue (gross)", "#2f8a57") +
      kpi(apify30, "Apify users (30d)", COL.Apify);
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
  }
  function trend(H) {
    if (H.length < 2) { $("#trend").innerHTML = "<p class='m' style='color:var(--muted)'>The chart fills in as daily snapshots build up.</p>"; return; }
    const W = 640, Ht = 160, p = 28, xs = H.map((_, i) => p + i * (W - 2 * p) / (H.length - 1)), max = Math.max(1, ...H.map(h => h.etsy_views));
    const ys = H.map(h => Ht - p - (h.etsy_views / max) * (Ht - 2 * p));
    $("#trend").innerHTML = `<svg viewBox="0 0 ${W} ${Ht}" width="100%"><polyline fill="none" stroke="#14917f" stroke-width="3" points="${xs.map((x, i) => x + "," + ys[i]).join(" ")}"/>
      ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3.5" fill="#14917f"/>`).join("")}
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
      card("Etsy", "https://www.etsy.com/your/shops/me/dashboard", ok(et) ? [[et.listings.length, "listings"], [et.listings.reduce((a, z) => a + z.views, 0), "views"], [sum("Etsy").length, "sales"], [money(sum("Etsy").reduce((a, z) => a + z.amount, 0)), "revenue"]] : [["!", et.error]],
        ok(et) ? `${et.listings.filter(z => z.physical).length} print-on-demand, ${et.listings.filter(z => !z.physical).length} digital.` : "") +
      card("Gumroad", "https://app.gumroad.com/dashboard", ok(gr) ? [[gr.listings.length, "products"], [sum("Gumroad").length, "sales"], [money(sum("Gumroad").reduce((a, z) => a + z.amount, 0)), "revenue"]] : [["!", gr.error]],
        "Gumroad doesn't share page views through its API. 10 new products/day limit; the rest of the catalogue is being added daily.") +
      card("Printify", "https://printify.com/app/store/products", ok(pr) ? [[pr.published, "products live"], [pr.orders, "orders"]] : [["!", pr.error]], "Physical orders are paid on Etsy; Printify charges production + shipping per order.") +
      card("Apify", "https://console.apify.com/actors", ok(ap) ? [[ap.actors.length, "actors"], [ap.actors.filter(z => z.public).length, "public"], [ap.actors.reduce((a, z) => a + z.runs, 0), "runs"], [ap.actors.reduce((a, z) => a + (z.users30 || 0), 0), "users (30d)"]] : [["!", ap.error]]) +
      card("x402 API", "https://164.160.90.241.sslip.io", ok(x) ? [[x.balance_usdc, "USDC balance"], [x.external_tx_since_oct2, "payments since 2 Oct"]] : [["!", x.error]], "AgentEdge pay-per-call API; owner test payments are excluded.") +
      card("KDP", "https://kdpreports.amazon.com", [[m.kdp_books ?? "–", "books live"], [m.kdp_sales ?? "–", "sales"]], "Amazon KDP has no API: send me the numbers from the KDP report and I'll add them.") +
      card("Pinterest", "https://www.pinterest.com/business/hub/", [[m.pinterest_pins ?? "121", "pins uploaded"]], "Pin stats come later via Pinterest Analytics.") + "</div>";
  }
})();
