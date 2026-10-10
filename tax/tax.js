/* Sonneblom Tax: shared South African tax engine + page helpers (no tracking, no cookies, runs in your browser).
   Tables: SARS rates of tax for individuals, medical tax credits, interest exemption, CGT and the rate-per-km schedule.
   Year = tax year ending in February (2027 = 1 March 2026 to 28 February 2027). */
const TAX = {
  2027: { label: "2026/27", brackets: [[0, 0, 18], [245100, 44118, 26], [383100, 79998, 31], [530200, 125599, 36], [695800, 185215, 39], [887000, 259783, 41], [1878600, 666339, 45]],
    rebates: [17820, 9765, 3249], mtc: [376, 376, 254], raCap: 430000, cgtExcl: 50000, primaryRes: 3000000, tfsa: 46000,
    km: [[115000, 38344, 132.9, 49.1], [230000, 68487, 148.4, 61.4], [345000, 98689, 161.2, 67.8], [460000, 125393, 173.4, 74.0], [575000, 152097, 185.5, 86.9],
         [690000, 180078, 212.8, 102.0], [805000, 208106, 216.5, 114.5], [920000, 237679, 220.1, 126.1], [1e12, 237679, 220.1, 126.9]] },
  2026: { label: "2025/26", brackets: [[0, 0, 18], [237100, 42678, 26], [370500, 77362, 31], [512800, 121475, 36], [673000, 179147, 39], [857900, 251258, 41], [1817000, 644489, 45]],
    rebates: [17235, 9444, 3145], mtc: [364, 364, 246], raCap: 350000, cgtExcl: 40000, primaryRes: 2000000, tfsa: 36000, km: null },
};
const CUR = 2027;
const INTEREST_EXEMPT = [23800, 34500];          // under 65 / 65+
const CGT = { deathExclusion: 300000, inclusion: 0.4 };   // annual exclusion + primary residence exclusion are per year in TAX
const RA = { pct: 0.275 };                                // rand cap is per year in TAX (R430,000 from 1 March 2026)
const UIF = { rate: 0.01, ceilingMonthly: 17712 };
const VAT_RATE = 0.15;

const r2 = (x) => Math.round((x + 1e-9) * 100) / 100;
const tableTax = (ti, y = CUR) => { if (ti <= 0) return 0; const b = [...TAX[y].brackets].reverse().find((b) => ti > b[0]); return b[1] + (ti - b[0]) * b[2] / 100; };
const rebates = (age, y = CUR) => { const [p, s, t] = TAX[y].rebates; return p + (age >= 65 ? s : 0) + (age >= 75 ? t : 0); };
const threshold = (age, y = CUR) => { let t = 0, lo = 0, hi = 1e7; const reb = rebates(age, y); while (hi - lo > 0.5) { t = (lo + hi) / 2; tableTax(t, y) > reb ? (hi = t) : (lo = t); } return Math.round(lo); };
const mtcMonth = (members, y = CUR) => { const [m, f, e] = TAX[y].mtc; return members >= 1 ? m + (members >= 2 ? f : 0) + e * Math.max(0, members - 2) : 0; };
const marginal = (ti, y = CUR) => (ti <= 0 ? 0 : [...TAX[y].brackets].reverse().find((b) => ti > b[0])[2]);

/* Annual income tax (ITR12-style estimate). Same maths as FinBot's income tax workbook. */
function incomeTax(d) {
  const y = d.year || CUR, age = +d.age || 40;
  const gross = (+d.salary || 0) + (+d.bonus || 0) + (+d.other || 0) + (+d.interest || 0) + (+d.rental || 0) + (+d.travelAllowance || 0) + (+d.fringe || 0);
  const exempt = Math.min(+d.interest || 0, INTEREST_EXEMPT[age >= 65 ? 1 : 0]);
  const travel = Math.min(+d.travelAllowance || 0, +d.travelDeduction || 0);
  const beforeRA = gross - exempt - travel;
  const ra = Math.min(+d.retirement || 0, RA.pct * Math.max(beforeRA, 0), TAX[y].raCap);
  const gain = (+d.cgtGain || 0), ex = TAX[y].cgtExcl; const net = gain > ex ? gain - ex : gain < -ex ? gain + ex : 0;
  const cg = Math.max(net, 0) * CGT.inclusion;
  const ti = Math.max(0, beforeRA - ra + cg - (+d.otherDeductions || 0));
  const tax = tableTax(ti, y), reb = rebates(age, y);
  const members = +d.medMembers || 0, months = d.medMonths == null ? 12 : +d.medMonths;
  const mtc = mtcMonth(members, y) * months;
  const contrib = +d.medContrib || 0, oop = +d.medOOP || 0;
  const amtc = (age >= 65 || d.disability) ? 0.333 * (Math.max(0, contrib - 3 * mtc) + oop) : 0.25 * Math.max(0, Math.max(0, contrib - 4 * mtc) + oop - 0.075 * ti);
  const normal = Math.max(0, tax - reb), afterMtc = Math.max(0, normal - mtc), payable = Math.max(0, afterMtc - amtc);
  const paid = (+d.paye || 0) + (+d.provisional || 0);
  return { gross, exempt, travel, ra, cg, ti, tax, reb, mtc, amtc, payable, paid, balance: payable - paid,
           effective: gross ? payable / gross : 0, marginal: marginal(ti, y) };
}

/* Monthly PAYE / take-home pay (SARS annualising method, regular income only). */
function paye(d) {
  const y = d.year || CUR, age = +d.age || 40, g = +d.gross || 0;
  const pension = +d.pension || 0, ra = +d.ra || 0;
  const travelTaxable = (+d.travelAllowance || 0) * (d.travel80 ? 0.2 : 0.8);
  const fund = Math.min((pension + ra) * 12, RA.pct * Math.max(0, (g + travelTaxable + (+d.fringe || 0)) * 12), TAX[y].raCap) / 12;
  const monthlyTaxable = g + travelTaxable + (+d.fringe || 0) - fund;
  const annual = monthlyTaxable * 12;
  const taxYear = Math.max(0, tableTax(annual, y) - rebates(age, y));
  const mtc = mtcMonth(+d.medMembers || 0, y);
  const payeM = Math.max(0, taxYear / 12 - mtc);
  const uif = Math.min(g, UIF.ceilingMonthly) * UIF.rate;
  const net = g + (+d.travelAllowance || 0) - payeM - uif - pension - ra - (+d.medContrib || 0) - (+d.otherDeductions || 0);
  return { monthlyTaxable, annual, payeM, uif, uifEmployer: uif, sdl: g * 0.01, mtc, net, fund, marginal: marginal(annual, y), effective: g ? payeM / g : 0 };
}

/* Travel allowance: deemed cost per km from the vehicle value (actual-distance method, s8(1)(b)). */
function travelDeduction(d) {
  const y = d.year || CUR, t = TAX[y].km || TAX[CUR].km;
  const [, fixed, fuel, maint] = t.find((r) => (+d.value || 0) <= r[0]);
  const total = Math.max(1, (+d.closing || 0) - (+d.opening || 0)), days = +d.days || 365;
  const cents = fixed * days / 365 / total * 100 + (d.fuel !== false ? fuel : 0) + (d.maint !== false ? maint : 0);
  const deduction = Math.min(+d.allowance || 0, (+d.business || 0) * cents / 100);
  return { fixed, fuel, maint, cents, total, deduction, taxable: Math.max(0, (+d.allowance || 0) - deduction), businessPct: (+d.business || 0) / total };
}

/* ---------------- page helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const R = (n, dec = 2) => (n < 0 ? "-R" : "R") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const pct = (x) => (x * 100).toFixed(1) + "%";
const num = (id) => { const el = document.getElementById(id); if (!el) return 0; const v = String(el.value).replace(/[\s,R]/g, ""); return v === "" ? 0 : +v || 0; };
function rows(list) { return `<table class="res">${list.map(([k, v, cls]) => `<tr class="${cls || ""}"><td>${k}</td><td>${v}</td></tr>`).join("")}</table>`; }
function live(form, fn) { const run = () => { try { fn(); } catch (e) { console.error(e); } }; form.addEventListener("input", run); form.addEventListener("change", run); run(); }

/* Pro pass (paid): a token stored in this browser only. */
const API = "https://chat.sonneblomdigitaal.co.za/taxapi";
const pro = { get token() { return localStorage.getItem("sbtax-pro") || ""; }, get until() { return +localStorage.getItem("sbtax-pro-until") || 0; },
  get on() { return !!this.token && this.until > Date.now(); } };
function proBadge() { const b = $("#proState"); if (b) b.innerHTML = pro.on ? `⭐ Pro until ${new Date(pro.until).toLocaleDateString("en-ZA")}` : `<a href="/tax/pro/">Go Pro</a>`; }
document.addEventListener("DOMContentLoaded", () => {
  proBadge();
  const t = $(".navtoggle"); if (t) t.onclick = () => document.body.classList.toggle("navopen");
  $$("[data-print]").forEach((b) => (b.onclick = () => window.print()));
});
