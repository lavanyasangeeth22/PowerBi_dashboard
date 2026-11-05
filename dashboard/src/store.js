import payload from "./data/swiggy.json";
import tccRaw from "./data/fact_time_city_cuisine.json";
import dimsRaw from "./data/fact_customer_dims.json";
import usersRaw from "./data/fact_users.json";
import dowRaw from "./data/fact_dow.json";
import frRaw from "./data/fact_rest.json";
import ratingRaw from "./data/fact_rating.json";
import menuRaw from "./data/fact_menu.json";

export const data = {
  ...payload,
  tcc: tccRaw.rows,
  cities: tccRaw.cities,
  cuisines: tccRaw.cuisines,
  dims: dimsRaw,
  usersAll: usersRaw.all,
  usersYear: usersRaw.year,
  dow: dowRaw,
  fr: frRaw,
  rating: ratingRaw,
  menu: menuRaw,
};

export const YEARS = [...new Set(data.tcc.map((r) => r.y))].sort();

const CITY_KEYS = new Set(data.cities);
const CUISINE_KEYS = new Set(data.cuisines);

export function scopeKeys(sel) {
  const { city = "All", cuisine = "All" } = sel || {};
  return {
    c: CITY_KEYS.has(city) ? city : "*",
    cu: CUISINE_KEYS.has(cuisine) ? cuisine : "*",
  };
}

export function filterFacts(sel) {
  const { city = "All", year = "All", cuisine = "All" } = sel || {};
  const inCity = (v) => city === "All" || v === city;
  const inYr = (v) => year === "All" || String(v) === String(year);
  const inCu = (v) => cuisine === "All" || v === cuisine;
  return {
    sel: { city, year, cuisine },
    keys: scopeKeys(sel),
    tcc: data.tcc.filter((r) => inCity(r.c) && inYr(r.y) && inCu(r.cu)),
    dims: data.dims.filter((r) => inCity(r.c) && inYr(r.y) && inCu(r.cu)),
    dow: data.dow.filter((r) => inCity(r.c) && inYr(r.y) && inCu(r.cu)),
    fr: data.fr
      .filter((r) => inCity(r.c) && inYr(r.y) && inCu(r.cu))
      .sort((a, b) => b.r - a.r),
    ratingBands: data.rating.bands.filter((r) => r.c === scopeKeys(sel).c && r.cu === scopeKeys(sel).cu),
    markets: data.rating.markets.filter(
      (r) =>
        r.c !== "*" &&
        (city === "All" || r.c === city) &&
        (cuisine === "All" ? r.cu === "*" : r.cu === cuisine),
    ),
    marketTotal: data.rating.markets.find((r) => r.c === scopeKeys(sel).c && r.cu === scopeKeys(sel).cu),
    menu: data.menu.rows.find((r) => r.c === scopeKeys(sel).c && r.cu === scopeKeys(sel).cu),
    menuBands: data.menu.bands.filter((r) => r.c === scopeKeys(sel).c && r.cu === scopeKeys(sel).cu),
    menuItems: data.menu.items.filter((r) => r.c === scopeKeys(sel).c && r.cu === scopeKeys(sel).cu),
    users: usersFor(sel),
  };
}

export function usersFor(sel) {
  const { city = "All", year = "All", cuisine = "All" } = sel || {};
  const c = CITY_KEYS.has(city) ? city : "*";
  const cu = CUISINE_KEYS.has(cuisine) ? cuisine : "*";
  const rows = year === "All" ? data.usersAll : data.usersYear;
  const hit = rows.find((r) => r.c === c && r.cu === cu && (year === "All" || r.y === Number(year)));
  return hit ? hit.u : 0;
}

export function groupSum(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, { key: k, revenue: 0, orders: 0 });
    const g = m.get(k);
    g.revenue += r.r ?? r.revenue ?? 0;
    g.orders += r.o ?? r.orders ?? 0;
  }
  return [...m.values()];
}

export const monthly = (f) =>
  groupSum(f.tcc, (r) => r.ym)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((g) => ({
      month: g.key,
      label: g.key.slice(2).replace("-", "/"),
      revenue: g.revenue,
      orders: g.orders,
      aov: Math.round(g.revenue / Math.max(g.orders, 1)),
    }));

export const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const PALETTE = [
  "#fc8019", "#4c6fff", "#22b07d", "#9b51e0", "#f2b840",
  "#e64545", "#6b5dd3", "#2ec4b6", "#ef476f", "#118ab2",
  "#b5838d", "#8d99ae", "#a7c957", "#f28482", "#3d5a80",
];

export const AI_INSIGHTS = [
  "Younger customers in the 22–25 age group dominate spend — target college students with curated combo offers.",
  "Male users out-spend female users; run female-focused discount campaigns to balance acquisition.",
  "The top 10% of customers generate ~80% of revenue — launch a VIP/loyalty program for repeat buyers.",
  "Delhi and Bangalore lead metro revenue; tier-2 hubs like Tirupati and Bikaner punch above their weight.",
  "2018 grew ~356% YoY, while growth cooled to single digits afterward — retention beats acquisition here.",
];
