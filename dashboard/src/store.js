import payload from "./data/swiggy.json";
import tccRaw from "./data/fact_time_city_cuisine.json";
import tudRaw from "./data/fact_time_userdim.json";
import frRaw from "./data/fact_rest.json";
import fdailyRaw from "./data/fact_daily.json";

export const data = {
  ...payload,
  tcc: tccRaw.rows,
  cities: tccRaw.cities,
  cuisines: tccRaw.cuisines,
  tud: tudRaw.rows,
  occupations: tudRaw.occupations,
  loyalties: tudRaw.loyalties,
  fr: frRaw,
  fdaily: fdailyRaw,
};

export const YEARS = [...new Set(data.tcc.map((r) => r.y))].sort();

export function filterFacts(sel) {
  const { city = "All", year = "All", cuisine = "All" } = sel || {};
  const inCity = (v) => city === "All" || v === city;
  const inYr = (v) => year === "All" || v === year;
  const inCu = (v) => cuisine === "All" || v === cuisine;
  return {
    tcc: data.tcc.filter((r) => inCity(r.c) && inYr(r.y) && inCu(r.cu)),
    tud: data.tud.filter((r) => inCity(r.c) && inYr(r.y)),
    fr: data.fr.filter((r) => inCity(r.c) && inCu(r.cu)),
    fdaily: Object.entries(data.fdaily)
      .filter(([d]) => year === "All" || d.startsWith(String(year)))
      .map(([d, v]) => ({ date: d, revenue: v.r, orders: v.o })),
  };
}

export function groupSum(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, { key: k, revenue: 0, orders: 0 });
    const g = m.get(k);
    g.revenue += r.r ?? r.revenue;
    g.orders += r.o ?? r.orders;
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
