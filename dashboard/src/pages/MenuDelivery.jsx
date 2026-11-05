import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Kpi, axisProps, axisYShort, useChartPick } from "../components.jsx";
import { groupSum, PALETTE } from "../store.js";
import { fmtINR, fmtNum, shortINR } from "../utils.js";

const PRICE_BANDS = [
  { band: "Budget (<100)", note: "Snacks & beverages anchors" },
  { band: "Value (100-200)", note: "Everyday meals" },
  { band: "Mid (200-300)", note: "Family combos" },
  { band: "Premium (300-500)", note: "Weekend orders" },
  { band: "Luxury (500+)", note: "Celebration orders" },
];

const DELIVERY_KPI = [
  { label: "Avg Delivery Time", value: "32 min", sub: "metro average" },
  { label: "On-time Delivery", value: "91.4%", sub: "target 90%" },
  { label: "Fleet Utilisation", value: "78%", sub: "peak 96% (8–10 PM)" },
  { label: "Cancelled Orders", value: "4.7%", sub: "mostly at peak load" },
];

const OPS_HOURS = [
  { h: "10–12A", v: 12 }, { h: "6–9A", v: 21 }, { h: "9–12P", v: 78 }, { h: "12–3P", v: 88 },
  { h: "3–6P", v: 41 }, { h: "6–9P", v: 96 }, { h: "9–12P", v: 57 },
];

export default function MenuDelivery({ f }) {
  const slice = f.menu || { lines: 0, veg: 0, nonveg: 0, median: 0 };
  const totalCatalogue = slice.veg + slice.nonveg;
  const vegPct = totalCatalogue ? (slice.veg / totalCatalogue) * 100 : 0;
  const nonvegPct = 100 - vegPct;

  const bandRows = useMemo(() => {
    const total = f.menuBands.reduce((a, r) => a + r.n, 0);
    return PRICE_BANDS.map((b, i) => {
      const hit = f.menuBands.find((r) => r.band === b.band);
      return { ...b, share: total ? (hit ? (hit.n / total) * 100 : 0) : 0, color: PALETTE[i] };
    });
  }, [f]);

  const topBand = [...bandRows].sort((a, b) => b.share - a.share)[0];

  const dishes = useMemo(
    () => [...f.menuItems].sort((a, b) => b.n - a.n).slice(0, 10).map((r) => ({ item: r.item, listings: r.n, price: r.price })),
    [f],
  );

  const cuisineRows = useMemo(
    () => groupSum(f.tcc, (r) => r.cu).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    [f],
  );

  const vegRows = [
    { name: "Veg", value: slice.veg },
    { name: "Non-veg", value: slice.nonveg },
  ];
  const opsPick = useChartPick(OPS_HOURS.map((d) => d.h).join("|"));
  const dishPick = useChartPick(dishes.map((d) => d.item).join("|"));
  const vegPick = useChartPick(`${slice.veg}|${slice.nonveg}`);
  const bandPick = useChartPick(bandRows.map((d) => d.band).join("|"));

  return (
    <>
      {slice.lines === 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "3px solid #fc8019", fontSize: 12.5, lineHeight: 1.55 }}>
          <b>Menu catalogue not available for this selection.</b> The dataset's menu file covers 11,844 outlets
          (Ahmedabad, Bangalore, and outlets with no recorded city), so city-level catalogue splits are limited.
          Revenue and order metrics on the other pages still honour every slicer.
        </div>
      )}
      <div className="grid kpis">
        <Kpi label="Menu Lines" value={fmtNum(slice.lines)} delta="restaurant × dish mappings in scope" />
        <Kpi label="Veg vs Non-veg" value={`${vegPct.toFixed(1)}% / ${nonvegPct.toFixed(1)}%`} color="green" delta="catalogue split in scope" />
        <Kpi label="Median Menu Price" value={fmtINR(slice.median, false)} color="gold" delta="across outlets in scope" />
        <Kpi label="Most Common Band" value={topBand?.band ?? "–"} color="purple" delta={`${topBand ? topBand.share.toFixed(0) : 0}% of menu lines`} />
      </div>

      <div className="grid cols" style={{ gridTemplateRows: "auto auto auto" }}>
        <Card title="Ops Efficiency Snapshot" subt="Illustrative delivery KPIs · dataset has no fleet logs (not sliced)" className="w75">
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
            {DELIVERY_KPI.map((k) => (
              <div key={k.label} className="card" style={{ flex: "1 1 150px", boxShadow: "none", background: "#fbfaff" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7a7790" }}>{k.label}</div>
                <div style={{ fontSize: 19, fontWeight: 750 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "#a09db5" }}>{k.sub}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              data={OPS_HOURS}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="h" {...axisProps()} />
              <YAxis {...axisProps()} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}% capacity`} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="v" name="load" barSize={26} radius={[6, 6, 0, 0]}>
                {OPS_HOURS.map((_, i) => (
                  <Cell key={i} fill={i === 5 ? "#e05b00" : "#f7c48a"} {...opsPick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: "#7a7790" }}>Peak-load signal: 6–9 PM — plan fleet capacity accordingly.</div>
        </Card>

        <Card title="Delivery Fleet" subt="Rider ops at a glance (illustrative)" className="w25">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { metric: "Active riders (peak)", value: "12,400" },
              { metric: "Avg deliveries / rider / day", value: "21" },
              { metric: "10-min pickup timer", value: "87%" },
            ].map((row) => (
              <div key={row.metric} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5 }}>
                <span style={{ color: "#7a7790" }}>{row.metric}</span>
                <b style={{ fontSize: 15 }}>{row.value}</b>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "#5a5670", lineHeight: 1.5, borderTop: "1px solid #efedf5", paddingTop: 10 }}>
              Fleet supply is synchronised with the 6–9 PM demand spike, keeping <b>on-time delivery</b> above target.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="pill g">On-time 91.4%</span>
              <span className="pill o">Late SLA 4.2%</span>
            </div>
          </div>
        </Card>

        <Card title="Most-Listed Dishes" subt="Menu penetration in scope (outlets listing each dish)" className="w50">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dishes} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" horizontal={false} />
              <XAxis type="number" {...axisYShort(fmtNum)} />
              <YAxis type="category" dataKey="item" width={140} {...axisProps()} tick={{ fontSize: 10, fill: "#7a7790" }} />
              <Tooltip
                formatter={(v, n, p) => [fmtNum(v), "Menu listings"]}
                labelFormatter={(l, p) => `${l} · avg ₹${p?.[0]?.payload?.price ?? "–"}`}
                cursor={{ fill: "#fff4eb" }}
              />
              <Bar isAnimationActive={false} dataKey="listings" barSize={15} radius={[0, 6, 6, 0]}>
                {dishes.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} {...dishPick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Price Band Structure" subt="Menu price segmentation in scope" className="w25">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bandRows.map((b, i) => (
              <div
                key={b.band}
                onClick={() => bandPick.toggle(i)}
                style={{
                  cursor: "pointer",
                  opacity: bandPick.pick == null || bandPick.pick === i ? 1 : 0.3,
                  transition: "opacity .18s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                  <b>{b.band}</b>
                  <span style={{ color: "#7a7790" }}>{b.share.toFixed(0)}%</span>
                </div>
                <div style={{ height: 7, background: "#efedf5", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, b.share * 2)}%`, height: "100%", background: b.color }} />
                </div>
                <div style={{ fontSize: 10, color: "#a09db5", marginTop: 2 }}>{b.note}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Veg vs Non-veg Mix" subt="Catalogue-level split in scope" className="w25">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={vegRows} dataKey="value" nameKey="name" innerRadius={46} outerRadius={74} paddingAngle={4} isAnimationActive={false}>
                <Cell fill="#22b07d" {...vegPick.cellProps(0)} />
                <Cell fill="#e64545" {...vegPick.cellProps(1)} />
              </Pie>
              <Tooltip formatter={(v) => `${fmtNum(v)} lines`} />
              <Legend wrapperStyle={{ fontSize: 11.5 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Cuisine Revenue — top 10" subt="Revenue share in the selected year" className="w50">
          <table className="dtable">
            <thead>
              <tr><th></th><th>Cuisine</th><th>Revenue</th><th>Orders</th></tr>
            </thead>
            <tbody>
              {cuisineRows.map((c, i) => (
                <tr key={c.key}>
                  <td style={{ width: 34 }}><span className={`rank ${i < 3 ? "top3" : ""}`}>{i + 1}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.key}</td>
                  <td>{fmtINR(c.revenue, false)}</td>
                  <td>{fmtNum(c.orders)}</td>
                </tr>
              ))}
              {cuisineRows.length === 0 && (
                <tr><td colSpan={4} style={{ color: "#7a7790" }}>No orders for this selection.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
