import React, { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { Card, Kpi, axisProps, axisYShort } from "../components.jsx";
import { PALETTE } from "../store.js";
import { fmtINR, fmtNum, shortINR, shortNum } from "../utils.js";

const BAND_ORDER = ["<2.0", "2.0-3.0", "3.0-3.5", "3.5-4.0", "4.0-5.0", "Not Rated"];
const BAND_COLORS = ["#e64545", "#f2b840", "#fc8019", "#22b07d", "#118ab2", "#b6b1cc"];

export default function Restaurants({ f }) {
  const topRest = useMemo(() => f.fr.slice(0, 10).map((r) => ({ ...r, label: r.n })), [f]);
  const totalFrRevenue = useMemo(() => f.fr.reduce((a, r) => a + r.r, 0), [f]);
  const ratedLeaders = useMemo(() => f.fr.filter((r) => r.rt > 0).slice(0, 120), [f]);

  const rated = useMemo(
    () =>
      [...f.ratingBands]
        .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band))
        .map((r) => ({ rating_band: r.band, restaurants: r.n })),
    [f],
  );

  const totalOutlets = f.marketTotal?.restaurants ?? 0;
  const notRated = rated.find((r) => r.rating_band === "Not Rated")?.restaurants ?? 0;
  const ratedCount = Math.max(totalOutlets - notRated, 0);
  const ratedShare = totalOutlets ? ratedCount / totalOutlets : 0;

  const ratingCity = useMemo(
    () =>
      [...f.markets]
        .sort((a, b) => b.restaurants - a.restaurants)
        .slice(0, 12)
        .map((m) => ({
          city: m.city ?? m.c,
          avg_rating: m.avg_rating == null ? 0 : +m.avg_rating.toFixed(2),
          restaurants: m.restaurants,
        })),
    [f],
  );

  const market = useMemo(
    () =>
      [...f.markets]
        .sort((a, b) => b.restaurants - a.restaurants)
        .slice(0, 15)
        .map((m) => ({ ...m, city: m.city ?? m.c })),
    [f],
  );

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Partner Restaurants" value={fmtNum(totalOutlets)} delta="in scope (snapshot)" />
        <Kpi
          label="Avg Rating"
          value={f.marketTotal?.avg_rating ? f.marketTotal.avg_rating.toFixed(2) : "–"}
          color="gold"
          delta={`${fmtNum(ratedCount)} rated outlets`}
        />
        <Kpi label="Rated Share" value={`${(ratedShare * 100).toFixed(1)}%`} color="green" delta="of partners in scope" />
        <Kpi label="Top Earner (scoped)" value={topRest[0] ? shortINR(topRest[0].r) : "–"} color="blue" delta={topRest[0]?.n} />
      </div>

      <div className="grid cols" style={{ gridTemplateRows: "auto auto auto" }}>
        <Card title="Top 10 Restaurants by Revenue" subt="Filtered by city · year · cuisine" className="w66">
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
            These 10 outlets = {((topRest.reduce((a, r) => a + r.r, 0) / Math.max(totalFrRevenue, 1)) * 100).toFixed(1)}% of revenue held by city leaders in scope.
          </div>
        </Card>

        <Card title="Rating Bands" subt="Outlet count per band · snapshot (year not applicable)" className="w33">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={rated.map((r) => ({ band: r.rating_band, n: r.restaurants }))} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="band" {...axisProps()} interval={0} angle={-18} textAnchor="end" height={56} tick={{ fontSize: 10, fill: "#7a7790" }} />
              <YAxis {...axisYShort(shortNum)} />
              <Tooltip formatter={(v) => fmtNum(v)} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="n" barSize={30} radius={[7, 7, 0, 0]}>
                {rated.map((r) => (
                  <Cell key={r.rating_band} fill={BAND_COLORS[BAND_ORDER.indexOf(r.rating_band)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Avg Rating by City" subt="Market depth vs satisfaction (cuisine-scoped)" className="w50">
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

        <Card title="City Market Snapshot" subt="Partner-dense markets in scope" className="w50">
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

        <Card title="Revenue vs Rating" subt="Bubble size = revenue · rated outlets in scope" className="w100">
          <ResponsiveContainer width="100%" height={230}>
            <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" />
              <XAxis dataKey="rt" name="Rating" type="number" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axisProps()} tick={{ fontSize: 11, fill: "#7a7790" }} />
              <YAxis dataKey="r" {...axisYShort(shortINR)} />
              <ZAxis dataKey="r" range={[30, 260]} />
              <Tooltip content={<RestToolTip />} />
              <Scatter data={ratedLeaders} fill="#fc8019" fillOpacity={0.55} isAnimationActive={false} />
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
      <div style={{ fontWeight: 700 }}>{d.n ?? d.name ?? d.label ?? d.city}</div>
      {d.rt != null && <div>Rating: <b>{d.rt ? `${d.rt} ★` : "Not rated"}</b></div>}
      {d.r != null && <div>Revenue: <b>{fmtINR(d.r, false)}</b></div>}
      {d.o != null && <div>Orders: <b>{fmtNum(d.o)}</b></div>}
      {d.restaurants != null && <div>Partners: <b>{fmtNum(d.restaurants)}</b></div>}
      {d.avg_rating != null && <div>Avg Rating: <b>{d.avg_rating} ★</b></div>}
    </div>
  );
}
