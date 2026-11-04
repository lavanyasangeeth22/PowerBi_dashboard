import React, { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Scatter, ScatterChart, ZAxis,
} from "recharts";
import { Card, Kpi, ToolTip, axisProps, axisYShort } from "../components.jsx";
import { PALETTE, data } from "../store.js";
import { fmtINR, fmtNum, shortINR, shortNum } from "../utils.js";

export default function Restaurants({ f }) {
  const topRest = useMemo(() => f.fr.slice(0, 10).map((r) => ({ ...r, label: r.n })), [f]);
  const topRestTable = useMemo(() => f.fr.slice(0, 15), [f]);
  const totalFrRevenue = useMemo(() => f.fr.reduce((a, r) => a + r.r, 0), [f]);

  const rated = Array.isArray(data.rating_band_split)
    ? [...data.rating_band_split].sort((a, b) => {
        const order = ["<2.0", "2.0-3.0", "3.0-3.5", "3.5-4.0", "4.0-5.0", "Not Rated"];
        return order.indexOf(a.rating_band) - order.indexOf(b.rating_band);
      })
    : [];

  const ratedCount = data.meta.total_rated_restaurants;
  const ratedShare = ratedCount / data.meta.total_restaurants;

  const ratingCity = useMemo(
    () =>
      data.market.slice(0, 12).map((m) => ({
        city: m.city,
        avg_rating: m.avg_rating == null ? 0 : +m.avg_rating.toFixed(2),
        restaurants: m.restaurants,
      })),
    [],
  );

  const market = useMemo(() => data.market.slice(0, 15), []);

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Partner Restaurants" value={fmtNum(data.meta.total_restaurants)} delta="across all cities" />
        <Kpi label="Avg Rating" value={data.meta.avg_rating} color="gold" delta={`${fmtNum(ratedCount)} rated outlets`} />
        <Kpi label="Rated Share" value={`${(ratedShare * 100).toFixed(1)}%`} color="green" delta="of all partners" />
        <Kpi label="Top Earner (scoped)" value={topRest[0] ? shortINR(topRest[0].r) : "–"} color="blue" delta={topRest[0]?.n} />
      </div>

      <div className="grid cols" style={{ gridTemplateRows: "auto auto auto" }}>
        <Card title="Top 10 Restaurants by Revenue" subt="Filtered by the top slicers" className="w66">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={topRest} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" horizontal={false} />
              <XAxis type="number" {...axisYShort(shortINR)} />
              <YAxis type="category" dataKey="label" width={150} {...axisProps()} tick={{ fontSize: 10, fill: "#7a7790" }} />
              <Tooltip content={<RestToolTip />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="r" barSize={17} radius={[0, 6, 6, 0]}>
                {topRest.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#fc8019" : PALETTE[(i + 1) % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: "#7a7790", marginTop: 6 }}>
            These 10 outlets = {((topRest.reduce((a, r) => a + r.r, 0) / Math.max(totalFrRevenue, 1)) * 100).toFixed(1)}% of the revenue held by the top 500 partners.
          </div>
        </Card>

        <Card title="Rating Bands" subt="Outlet count per band (all-time)" className="w33">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={rated.map((r) => ({ band: r.rating_band, n: r.restaurants }))} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="band" {...axisProps()} interval={0} angle={-18} textAnchor="end" height={56} tick={{ fontSize: 10, fill: "#7a7790" }} />
              <YAxis {...axisYShort(shortNum)} />
              <Tooltip formatter={(v) => fmtNum(v)} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="n" barSize={30} radius={[7, 7, 0, 0]}>
                {rated.map((r, i) => (
                  <Cell key={r.rating_band} fill={["#e64545", "#f2b840", "#fc8019", "#22b07d", "#118ab2", "#b6b1cc"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Avg Rating by City — Top 12 Markets" subt="Market depth vs satisfaction" className="w50">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ratingCity} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="city" {...axisProps()} interval={0} angle={-16} textAnchor="end" height={58} tick={{ fontSize: 10, fill: "#7a7790" }} />
              <YAxis {...axisProps()} tick={{ fontSize: 11, fill: "#7a7790" }} domain={[0, 5]} />
              <Tooltip formatter={(v, n) => (n === "avg_rating" ? `${v.toFixed(2)} ★` : fmtNum(v))} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="avg_rating" barSize={26} fill="#f2b840" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="City Market Snapshot" subt="Top 15 partner-dense markets" className="w50">
          <table className="dtable" style={{ maxHeight: 260 }}>
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th>City</th>
                <th>Partners</th>
                <th>Avg Rating</th>
                <th>Rating Volume</th>
              </tr>
            </thead>
            <tbody>
              {market.map((m, i) => (
                <tr key={m.city}>
                  <td><span className={`rank ${i < 3 ? "top3" : ""}`}>{i + 1}</span></td>
                  <td style={{ fontWeight: 600 }}>{m.city}</td>
                  <td>{fmtNum(m.restaurants)}</td>
                  <td>{m.avg_rating ? m.avg_rating.toFixed(2) : "–"}</td>
                  <td>{fmtNum(m.rating_mins)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Revenue vs Rating — Safecorner" subt="Bigger bubble = more revenue (top 120 partners, scoped)" className="w100">
          <ResponsiveContainer width="100%" height={230}>
            <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" />
              <XAxis dataKey="rt" name="Rating" {...axisProps()} tick={{ fontSize: 11, fill: "#7a7790" }} />
              <YAxis dataKey="r" {...axisYShort(shortINR)} />
              <ZAxis dataKey="r" range={[30, 260]} />
              <Tooltip content={<RestToolTip />} />
              <Scatter data={f.fr.slice(0, 120)} fill="#fc8019" fillOpacity={0.55} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function RestToolTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tip">
      <div style={{ fontWeight: 700 }}>{d.name ?? d.label ?? d.city}</div>
      {d.rt != null && <div>Rating: <b>{d.rt ? `${d.rt} ★` : "Not rated"}</b></div>}
      {d.r != null && <div>Revenue: <b>{fmtINR(d.r, false)}</b></div>}
      {d.o != null && <div>Orders: <b>{fmtNum(d.o)}</b></div>}
      {d.restaurants != null && <div>Partners: <b>{fmtNum(d.restaurants)}</b></div>}
      {d.avg_rating != null && <div>Avg Rating: <b>{d.avg_rating} ★</b></div>}
    </div>
  );
}
