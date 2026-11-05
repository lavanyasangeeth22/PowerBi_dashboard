import React, { useMemo, useState } from "react";
import { data, YEARS, filterFacts } from "./store.js";
import Overview from "./pages/Overview.jsx";
import Sales from "./pages/Sales.jsx";
import Customers from "./pages/Customers.jsx";
import Restaurants from "./pages/Restaurants.jsx";
import MenuDelivery from "./pages/MenuDelivery.jsx";

const PAGES = [
  { id: "overview", name: "Executive Overview" },
  { id: "sales", name: "Orders & Revenue" },
  { id: "customers", name: "Customer Intelligence" },
  { id: "restaurants", name: "Restaurant Performance" },
  { id: "menu", name: "Menu & Operations" },
];

const PAGE_SUB = {
  overview: "Business pulse at a glance",
  sales: "Revenue & order trends, 2017 – 2020",
  customers: "Who orders, how often, and how much",
  restaurants: "Ratings, revenue share & market depth",
  menu: "Food mix, price bands & delivery snapshot",
};

function initialSelection() {
  const q = new URLSearchParams(location.search);
  const city = q.get("city");
  const year = q.get("year");
  const cuisine = q.get("cuisine");
  return {
    city: data.cities.includes(city) ? city : "All",
    year: YEARS.map(String).includes(year) ? year : "All",
    cuisine: data.cuisines.includes(cuisine) ? cuisine : "All",
  };
}

export default function App() {
  const [page, setPage] = useState(() => {
    const h = (location.hash || "").replace("#", "");
    return PAGES.some((p) => p.id === h) ? h : "overview";
  });
  const start = useMemo(initialSelection, []);
  const [city, setCity] = useState(start.city);
  const [year, setYear] = useState(start.year);
  const [cuisine, setCuisine] = useState(start.cuisine);
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2500);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    location.hash = page;
  }, [page]);

  React.useEffect(() => {
    const q = new URLSearchParams(location.search);
    for (const [k, v] of [["city", city], ["year", year], ["cuisine", cuisine]]) {
      if (v === "All") q.delete(k);
      else q.set(k, v);
    }
    const qs = q.toString();
    history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  }, [city, year, cuisine]);

  const gotoHash = () => {
    const h = (location.hash || "").replace("#", "");
    if (PAGES.some((p) => p.id === h)) setPage(h);
  };
  React.useEffect(() => {
    window.addEventListener("hashchange", gotoHash);
    return () => window.removeEventListener("hashchange", gotoHash);
  }, []);

  const f = useMemo(() => filterFacts({ city, year, cuisine }), [city, year, cuisine]);

  const sub = page === "overview" ? "Business pulse at a glance" : PAGE_SUB[page];
  const activeFilterChips = [
    city !== "All" && `City: ${city}`,
    year !== "All" && `Year: ${year}`,
    cuisine !== "All" && `Cuisine: ${cuisine}`,
  ].filter(Boolean);

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <img src="/img/logo.png" alt="Swiggy" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", fontFamily: "'Space Grotesk', Manrope, sans-serif" }}>Analytics Suite</div>
            <div className="sub">Food Delivery · MIS</div>
          </div>
        </div>
        <div className="nav-caption">Dashboard</div>
        <nav className="nav">
          {PAGES.map((p) => (
            <button key={p.id} className={page === p.id ? "active" : ""} onClick={() => setPage(p.id)}>
              <span className="nav-idx">{PAGES.indexOf(p) + 1}</span>
              {p.name}
            </button>
          ))}
        </nav>
        <div className="foot">
          Built on the public Swiggy food-delivery dataset (2017–2020) for analytical training purposes.
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{PAGES.find((p) => p.id === page)?.name}</h1>
            <div className="crumb">{sub}</div>
          </div>
          <span className="live-badge">
            <span className="live-dot" /> LIVE STREAM
          </span>
          {activeFilterChips.length > 0 && (
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {activeFilterChips.map((c) => (
                <span key={c} className="pill o">
                  {c}
                </span>
              ))}
              <button
                className="pill b"
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => {
                  setCity("All");
                  setYear("All");
                  setCuisine("All");
                }}
              >
                Reset
              </button>
            </span>
          )}
          <div className="slicers">
            <div className="slicer">
              <label>City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option>All</option>
                {data.cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="slicer">
              <label>Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option>All</option>
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="slicer">
              <label>Cuisine</label>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                <option>All</option>
                {data.cuisines.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {page === "overview" && <Overview f={f} tick={tick} />}
        {page === "sales" && <Sales f={f} />}
        {page === "customers" && <Customers f={f} />}
        {page === "restaurants" && <Restaurants f={f} />}
        {page === "menu" && <MenuDelivery f={f} />}
      </main>
    </>
  );
}
