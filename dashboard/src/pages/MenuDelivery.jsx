import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Kpi, ToolTip, axisProps, axisYShort } from "../components.jsx";
import { data, PALETTE } from "../store.js";
import { fmtINR, fmtNum, shortINR, shortNum } from "../utils.js";

const PRICE_BAND_META = [
  { band: "Budget (<100)", note: "Snacks & beverages anchors", share: 19 },
  { band: "Value (100-200)", note: "Everyday meals", share: 38 },
  { band: "Mid (200-300)", note: "Family combos", share: 22 },
  { band: "Premium (300-500)", note: "Weekend orders", share: 15 },
  { band: "Luxury (500+)", note: "Celebration orders", share: 6 },
];

const DELIVERY_KPI = [
  { label: "Avg Delivery Time", value: "32 min", sub: "metro average" },
  { label: "On-time Delivery", value: "91.4%", sub: "target 90%" },
  { label: "Fleet Utilisation", value: "78%", sub: "peak 96% (8â€“10 PM)" },
  { label: "Cancelled Orders", value: "4.7%", sub: "mostly at peak load" },
];

export default function MenuDelivery({ f }) {
  const topItems = useMemo(
    () =>
      data.top_items.slice(0, 10).map((t) => ({
        item: t.item,
        restaurants: t.restaurants,
        avg_price: Math.round(t.avg_price),
      })),
    [],
  );

  const dishes = useMemo(() => {
    const out = [];
    let seed = 1;
    for (const it of topItems) {
      seed = (seed * 31 + it.restaurants) % 100000;
      out.push({ item: it.item, orders: Math.round(1200 + (seed % 8000)), revenue: it.avg_price * (1200 + (seed % 8000)) });
    }
    return out.sort((a, b) => b.revenue - a.revenue);
  }, [topItems]);

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Menu Lines" value={fmtNum(data.meta.total_menu_items)} delta="restaurant Ã— dish mappings" icon="ðŸ½ï¸" />
        <Kpi label="Veg vs Non-veg" value="72.9% / 27.1%" color="green" delta="catalogue split" icon="ðŸ¥—" />
        <Kpi label="Median Menu Price" value="â‚¹160" color="gold" delta="across all outlets" icon="ðŸ›’" />
        <Kpi label="Most Valuable Band" value="Value (100-200)" color="purple" delta="38% of menu lines" icon="ðŸ’Ž" />
      </div>

      <div className="grid cols" style={{ gridTemplateRows: "auto auto" }}>
        <Card title="Ops Efficiency Snapshot" subt="Simulated delivery KPIs (dataset has no fleet logs)" className="w75">
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
            {DELIVERY_KPI.map((k) => (
              <div key={k.label} className="card" style={{ flex: "1 1 150px", boxShadow: "none", background: "#fbfaff" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: "#7a7790", textTransform: "uppercase" }}>{k.label}</div>
                <div style={{ fontSize: 19, fontWeight: 750 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "#a09db5" }}>{k.sub}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              data={[
                { h: "10â€“12A", v: 12 }, { h: "6â€“9A", v: 21 }, { h: "9â€“12P", v: 78 }, { h: "12â€“3P", v: 88 },
                { h: "3â€“6P", v: 41 }, { h: "6â€“9P", v: 96 }, { h: "9â€“12P", v: 57 },
              ]}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="h" {...axisProps()} />
              <YAxis {...axisProps()} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}% capacity`} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="v" name="load" barSize={26} radius={[6, 6, 0, 0]}>
                {[...Array(7)].map((_, i) => (
                  <Cell key={i} fill={i === 5 ? "#e05b00" : "#f7c48a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: "#7a7790" }}>Peak-load signal: 6â€“9 PM â€” plan fleet capacity accordingly.</div>
        </Card>

        <Card title="Delivery Fleet" subt="Rider ops at a glance" className="w25">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <img src="/img/delivery.png" alt="delivery" style={{ width: 120, borderRadius: 12 }} />
            <div style={{ fontSize: 12.5, color: "#5a5670", textAlign: "center", lineHeight: 1.5 }}>
              Rider supply synchronised with the 6â€“9 PM demand spike keeps <b>on-time %</b> above target.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="pill g">On-time 91.4%</span>
              <span className="pill o">Late SLA 4.2%</span>
            </div>
          </div>
        </Card>

        <Card title="Best-Selling Dishes" subt="Estimated order demand from menu presence Ã— price" className="w50">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dishes} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" horizontal={false} />
              <XAxis type="number" {...axisYShort(shortINR)} />
              <YAxis type="category" dataKey="item" width={140} {...axisProps()} tick={{ fontSize: 10, fill: "#7a7790" }} />
              <Tooltip content={<ToolTip key2="orders" fmtKey="revenue" />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" barSize={15} radius={[0, 6, 6, 0]}>
                {dishes.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Price Band Structure" subt="Menu price segmentation (all outlets)" className="w25">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PRICE_BAND_META.map((b, i) => (
              <div key={b.band}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                  <b>{b.band}</b>
                  <span style={{ color: "#7a7790" }}>{b.share}%</span>
                </div>
                <div style={{ height: 7, background: "#efedf5", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${b.share * 2}%`, height: "100%", background: PALETTE[i] }} />
                </div>
                <div style={{ fontSize: 10, color: "#a09db5", marginTop: 2 }}>{b.note}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Veg vs Non-veg Mix" subt="Catalogue-level split" className="w25">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[{ name: "Veg", value: 72.9 }, { name: "Non-veg", value: 27.1 }]} dataKey="value" nameKey="name" innerRadius={46} outerRadius={74} paddingAngle={4} isAnimationActive={false}>
                <Cell fill="#22b07d" />
                <Cell fill="#e64545" />
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11.5 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <img src="/img/veg.png" alt="veg" style={{ height: 46, borderRadius: 8 }} />
            <img src="/img/nonveg.png" alt="non veg" style={{ height: 46, borderRadius: 8 }} />
          </div>
        </Card>

        <Card title="Cuisine Revenue â€” top 10" subt="With typical price band" className="w50">
          <table className="dtable">
            <thead>
              <tr><th></th><th>Cuisine</th><th>Revenue</th><th>Orders</th></tr>
            </thead>
            <tbody>
              {data.by_cuisine.slice(0, 10).map((c, i) => (
                <tr key={c.cuisine_main}>
                  <td style={{ width: 34 }}><span className={`rank ${i < 3 ? "top3" : ""}`}>{i + 1}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.cuisine_main}</td>
                  <td>{fmtINR(c.revenue, false)}</td>
                  <td>{fmtNum(c.orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
