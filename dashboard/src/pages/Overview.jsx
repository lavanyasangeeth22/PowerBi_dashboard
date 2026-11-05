import React, { useMemo, useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, Kpi, ToolTip, axisProps, axisYShort, useChartPick } from "../components.jsx";
import { groupSum, monthly, AI_INSIGHTS, PALETTE, data, DAY_ORDER } from "../store.js";
import { fmtINR, fmtNum, shortINR } from "../utils.js";

const BAND_ORDER = ["<2.0", "2.0-3.0", "3.0-3.5", "3.5-4.0", "4.0-5.0", "Not Rated"];
const BAND_COLORS = ["#e64545", "#f2b840", "#fc8019", "#22b07d", "#118ab2", "#b6b1cc"];

export default function Overview({ f, tick }) {
  const trend = useMemo(() => monthly(f), [f]);
  const kpis = useMemo(() => {
    const revenue = f.tcc.reduce((a, r) => a + r.r, 0);
    const orders = f.tcc.reduce((a, r) => a + r.o, 0);
    return {
      revenue,
      orders,
      aov: orders ? revenue / orders : 0,
    };
  }, [f]);

  const byCity = useMemo(
    () => groupSum(f.tcc, (r) => r.c).sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((g) => ({ city: g.key === "Unassigned" ? "Others" : g.key, revenue: g.revenue, orders: g.orders })),
    [f],
  );
  const byCuisineTop = useMemo(
    () => groupSum(f.tcc, (r) => r.cu).sort((a, b) => b.revenue - a.revenue).slice(0, 6).map((g) => ({ cuisine: g.key, revenue: g.revenue })),
    [f],
  );

  const weekday = useMemo(() => {
    const m = new Map(DAY_ORDER.map((n) => [n, { revenue: 0, orders: 0 }]));
    for (const row of f.dow) {
      const g = m.get(row.d);
      if (!g) continue;
      g.revenue += row.r;
      g.orders += row.o;
    }
    return DAY_ORDER.map((n) => ({ day: n.slice(0, 3), revenue: m.get(n).revenue, orders: m.get(n).orders }));
  }, [f]);

  const ratingBands = useMemo(
    () =>
      [...f.ratingBands]
        .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band))
        .map((r) => ({ rating_band: r.band, restaurants: r.n })),
    [f],
  );
  const ratedTotal = ratingBands.filter((r) => r.rating_band !== "Not Rated").reduce((a, r) => a + r.restaurants, 0);
  const pieBands = ratingBands.filter((r) => r.rating_band !== "Not Rated");

  const cityPick = useChartPick(byCity.map((d) => d.city).join("|"));
  const cuisinePick = useChartPick(byCuisineTop.map((d) => d.cuisine).join("|"));
  const ratingPick = useChartPick(pieBands.map((d) => d.rating_band).join("|"));

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Total Revenue" value={fmtINR(kpis.revenue)} delta="sales_value from orders" color="" />
        <Kpi label="Total Orders" value={fmtNum(kpis.orders)} delta="order volume" color="blue" />
        <Kpi label="Avg Order Value" value={fmtINR(kpis.aov)} delta="per order" color="green" />
        <Kpi
          label="Avg Rating"
          value={f.marketTotal?.avg_rating ? f.marketTotal.avg_rating.toFixed(2) : "–"}
          delta={`${fmtNum(f.marketTotal?.restaurants)} outlets in scope (snapshot)`}
          color="gold"
        />
        <Kpi label="Buying Users" value={fmtNum(f.users)} delta="unique users in scope" color="purple" />
      </div>

      <div className="grid cols" style={{ gridTemplateRows: "auto auto auto auto" }}>
        <Card title="Monthly Revenue Trend" subt="Year-month time intelligence · slicer aware" className="w66">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fc8019" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#fc8019" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="label" {...axisProps()} />
              <YAxis yAxisId="l" {...axisYShort(shortINR)} />
              <Tooltip content={<ToolTip />} />
              <Area isAnimationActive={false} yAxisId="l" type="monotone" dataKey="revenue" stroke="#fc8019" strokeWidth={2.4} fill="url(#gradRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <LiveFeed tick={tick} aov={kpis.aov} city={f.sel.city} className="w33" />

        <Card title="Top Cities by Revenue" subt="Metro-level contribution" className="w66">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byCity} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="city" {...axisProps()} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis {...axisYShort(shortINR)} />
              <Tooltip content={<ToolTip />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" radius={[7, 7, 0, 0]}>
                {byCity.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} {...cityPick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Weekday Pattern" subt="Revenue by day of week · slicer aware" className="w33">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weekday} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="day" {...axisProps()} />
              <YAxis {...axisYShort(shortINR)} />
              <Tooltip content={<ToolTip key2={null} />} />
              <Line isAnimationActive={false} type="monotone" dataKey="revenue" stroke="#4c6fff" strokeWidth={2.4} dot={{ r: 3.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Restaurant Rating Distribution" subt="Rating bands in scope · snapshot (year not applicable)" className="w33">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={pieBands} dataKey="restaurants" nameKey="rating_band" innerRadius={52} outerRadius={82} paddingAngle={3} isAnimationActive={false}>
                {pieBands.map((r, i) => (
                  <Cell key={r.rating_band} fill={BAND_COLORS[BAND_ORDER.indexOf(r.rating_band)]} {...ratingPick.cellProps(i)} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtNum(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "#7a7790" }}>
            {pieBands.map((r) => (
              <span key={r.rating_band} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: BAND_COLORS[BAND_ORDER.indexOf(r.rating_band)] }} />
                {r.rating_band}
              </span>
            ))}
            <span style={{ opacity: 0.7 }}>· Not Rated: {fmtNum(ratingBands.find((r) => r.rating_band === "Not Rated")?.restaurants ?? 0)}</span>
            <span style={{ opacity: 0.7 }}>· Rated: {fmtNum(ratedTotal)}</span>
          </div>
        </Card>

        <Card title="Top Cuisines" subt="Revenue share by primary cuisine" className="w33">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byCuisineTop} layout="vertical" margin={{ top: 0, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" horizontal={false} />
              <XAxis type="number" {...axisYShort(shortINR)} />
              <YAxis type="category" dataKey="cuisine" width={82} {...axisProps()} tick={{ fontSize: 10.5, fill: "#7a7790" }} />
              <Tooltip content={<ToolTip key2={null} />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" radius={[0, 6, 6, 0]} barSize={16}>
                {byCuisineTop.map((_, i) => (
                  <Cell key={i} fill="#22b07d" {...cuisinePick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <AIInsights className="w50" />
        <YoYSnapshot f={f} className="w25" />
        <QtdSnapshot trend={trend} className="w25" />
      </div>
    </>
  );
}

/* ---------------- live order feed (simulated realtime) ---------------- */
const FEED_CITIES = ["Koramangala, Bangalore", "Sector 43, Gurgaon", "Powai, Mumbai", "Banjara Hills, Hyderabad", "Anna Nagar, Chennai", "Salt Lake, Kolkata", "Bandra West, Mumbai", "Indiranagar, Bangalore"];

function LiveFeed({ tick, aov, city, className }) {
  const [feed, setFeed] = useState([]);
  const [liveRev, setLiveRev] = useState(0);
  const [liveOrders, setLiveOrders] = useState(0);

  useEffect(() => {
    if (tick === 0) return;
    const n = 1 + Math.floor(Math.random() * 5);
    const now = new Date();
    const rows = [];
    for (let i = 0; i < n; i++) {
      const items = 1 + Math.floor(Math.random() * 4);
      const amount = Math.max(120, Math.round((aov || 6600) * (0.05 + Math.random() * 0.15)) * items);
      const citySlot = city !== "All" ? `${city} (selected scope)` : FEED_CITIES[Math.floor(Math.random() * FEED_CITIES.length)];
      const mins = 22 + Math.floor(Math.random() * 20);
      rows.push({
        id: `${now.getTime()}-${i}`,
        title: `Order · ${items} item${items > 1 ? "s" : ""} · ${fmtINR(amount, false)}`,
        amount,
        meta: `${citySlot} · ETA ${mins} min`,
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
    }
    setFeed((prev) => [...rows, ...prev].slice(0, 7));
    setLiveRev((r) => r + rows.reduce((a, x) => a + x.amount, 0));
    setLiveOrders((o) => o + n);
  }, [tick, aov, city]);

  return (
    <Card className={className}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 10 }}>
        <h3>Live Order Stream</h3>
        <span className="live-badge" style={{ marginLeft: "auto" }}>
          <span className="live-dot" /> {fmtNum(liveOrders)} new
        </span>
      </div>
      <div className="subt">Simulated feed sized to the selected scope · refresh 2.5s</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div className="card" style={{ flex: 1, boxShadow: "none", background: "#fff7f0" }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 600, color: "#d95a00" }}>Today's revenue</div>
          <div style={{ fontSize: 18, fontWeight: 750 }}>{fmtINR(liveRev, false)}</div>
        </div>
        <div className="card" style={{ flex: 1, boxShadow: "none", background: "#f2f6ff" }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 600, color: "#4c6fff" }}>Today's orders</div>
          <div style={{ fontSize: 18, fontWeight: 750 }}>{fmtNum(liveOrders)}</div>
        </div>
      </div>
      <div className="livefeed">
        {feed.length === 0 && <div style={{ fontSize: 12, color: "#7a7790" }}>Listening for orders…</div>}
        {feed.map((row) => (
          <div key={row.id} className="feedrow">
            <div>
              <div style={{ fontWeight: 600 }}>{row.title}</div>
              <div style={{ color: "#a09db5", fontSize: 10.5 }}>{row.meta}</div>
            </div>
            <span className="t">{row.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- AI insights ---------------- */
function AIInsights({ className }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % AI_INSIGHTS.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <Card className={className}>
      <h3>Insights</h3>
      <div className="subt">Generated from the dataset with reference to the project brief</div>
      <div key={idx} style={{ minHeight: 66, fontSize: 13.5, lineHeight: 1.55, fontWeight: 500, color: "#3c3a4d", animation: "slidein .5s ease" }}>
        {AI_INSIGHTS[idx]}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
        {AI_INSIGHTS.map((_, i) => (
          <span key={i} style={{ width: i === idx ? 18 : 7, height: 7, borderRadius: 4, background: i === idx ? "#fc8019" : "#e6e2ef", transition: "width .3s" }} />
        ))}
      </div>
    </Card>
  );
}

/* ---------------- YoY snapshot ---------------- */
function YoYSnapshot({ f, className }) {
  const rows = useMemo(() => groupSum(f.tcc, (r) => r.y).sort((a, b) => a.key - b.key), [f]);
  const yearPick = useChartPick(rows.map((g) => g.key).join("|"));
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const yoy = prev ? (last.revenue - prev.revenue) / Math.max(prev.revenue, 1) : 0;
  return (
    <Card className={className}>
      <h3>Last-Yr Performance</h3>
      <div className="subt">{last?.key} vs {prev?.key}</div>
      <div style={{ fontSize: 20, fontWeight: 750 }}>{last ? fmtINR(last.revenue) : "–"}</div>
      <div className={`delta ${yoy >= 0 ? "up" : "down"}`} style={{ fontSize: 13, marginTop: 6 }}>
        {yoy >= 0 ? "▲" : "▼"} {Math.abs(yoy * 100).toFixed(1)}% YoY
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={rows.map((g) => ({ y: g.key, revenue: g.revenue }))}>
          <Tooltip content={<ToolTip key2={null} />} />
          <Bar isAnimationActive={false} dataKey="revenue" barSize={26} radius={[6, 6, 0, 0]}>
            {rows.map((_, i) => (
              <Cell key={i} fill={i === rows.length - 1 ? "#fc8019" : "#ffd9b8"} {...yearPick.cellProps(i)} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ---------------- quarter snapshot ---------------- */
function QtdSnapshot({ trend, className }) {
  const q = trend[trend.length - 1];
  return (
    <Card className={className}>
      <h3>Latest Month</h3>
      <div className="subt">{q ? new Date(q.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" }) : ""}</div>
      <div style={{ fontSize: 20, fontWeight: 750 }}>{fmtINR(q?.revenue)}</div>
      <div className="delta" style={{ fontSize: 13, marginTop: 6, color: "#7a7790" }}>Orders: {fmtNum(q?.orders)} · AOV {fmtINR(q?.aov)}</div>
      <div style={{ marginTop: 12, height: 8, background: "#efedf5", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (q?.orders / (trend[0]?.orders || 1)) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#fc8019,#f2b840)" }} />
      </div>
      <div style={{ fontSize: 11, color: "#7a7790", marginTop: 6 }}>vs first tracked month · {fmtNum(trend[0]?.orders)} orders</div>
    </Card>
  );
}
