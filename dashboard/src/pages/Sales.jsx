import React, { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Area,
} from "recharts";
import { Card, Kpi, ToolTip, axisProps, axisYShort } from "../components.jsx";
import { groupSum, monthly } from "../store.js";
import { fmtINR, fmtNum, shortINR, shortNum } from "../utils.js";

export default function Sales({ f }) {
  const trend = useMemo(() => monthly(f), [f]);
  const tot = useMemo(() => {
    const revenue = f.tcc.reduce((a, r) => a + r.r, 0);
    const orders = f.tcc.reduce((a, r) => a + r.o, 0);
    return { revenue, orders, aov: orders ? revenue / orders : 0 };
  }, [f]);

  const byYear = useMemo(
    () =>
      groupSum(f.tcc, (r) => r.y)
        .sort((a, b) => a.key - b.key)
        .map((g) => ({ year: String(g.key), revenue: g.revenue, orders: g.orders })),
    [f],
  );

  const byQuarter = useMemo(() => {
    const q = groupSum(f.tcc, (r) => `Q${Math.ceil(r.m / 3)}`);
    return ["Q1", "Q2", "Q3", "Q4"].map((k) => q.find((x) => x.key === k) || { key: k, revenue: 0, orders: 0 })
      .map((g) => ({ quarter: g.key, revenue: g.revenue, orders: g.orders }));
  }, [f]);

  const byCity = useMemo(
    () => groupSum(f.tcc, (r) => r.c).sort((a, b) => b.orders - a.orders).slice(0, 10)
      .map((g) => ({ city: g.key === "Unassigned" ? "Others" : g.key, revenue: g.revenue, orders: g.orders })),
    [f],
  );

  let prevRev = null;
  const trendWithGrowth = trend.map((t) => {
    const growth = prevRev != null && prevRev !== 0 ? (t.revenue - prevRev) / prevRev : null;
    prevRev = t.revenue;
    return { ...t, growth };
  });

  const monthlyTable = useMemo(() => [...trendWithGrowth].reverse().slice(0, 14), [trendWithGrowth]);

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Gross Sales" value={fmtINR(tot.revenue)} delta="all filtered orders" />
        <Kpi label="Orders" value={fmtNum(tot.orders)} delta="transactions" color="blue" />
        <Kpi label="Avg Order Value" value={fmtINR(tot.aov)} delta="revenue per order" color="green" />
        <Kpi label="Peak Month" value={(()=> {
          const peak = trend.reduce((a, t) => (t.revenue > (a?.revenue ?? -1) ? t : a), null);
          return peak ? peak.label : "–";
        })()} delta="highest revenue month" color="gold" />
      </div>

      <div className="grid cols" style={{ gridTemplateRows: "auto auto auto auto" }}>
        <Card title="Revenue & Orders — Monthly" subt="Combo view with MoM growth %" className="w66">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trendWithGrowth} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fc8019" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#fc8019" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="label" {...axisProps()} />
              <YAxis yAxisId="rev" {...axisYShort(shortINR)} />
              <YAxis yAxisId="ord" orientation="right" {...axisYShort(shortNum)} />
              <Tooltip content={<ToolTip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area isAnimationActive={false} yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#fc8019" strokeWidth={2.2} fill="url(#g2)" />
              <Line isAnimationActive={false} yAxisId="ord" type="monotone" dataKey="orders" name="Orders" stroke="#4c6fff" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Year-over-Year" subt="Gross sales by calendar year" className="w33">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byYear} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="year" {...axisProps()} />
              <YAxis {...axisYShort(shortINR)} />
              <Tooltip content={<ToolTip />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" barSize={38} radius={[8, 8, 0, 0]}>
                {byYear.map((_, i) => (
                  <Cell key={i} fill={["#ffd9b8", "#fc8019", "#e05b00", "#9b51e0"][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Orders by City — Top 10" subt="Volume leaders (orders, not ₹)" className="w66">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byCity} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="city" {...axisProps()} interval={0} angle={-14} textAnchor="end" height={52} />
              <YAxis {...axisYShort(shortNum)} />
              <Tooltip content={<ToolTip />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="orders" fill="#6b5dd3" radius={[7, 7, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Seasonality — by Quarter" subt="Aggregate revenue across all years" className="w33">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byQuarter} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="quarter" {...axisProps()} />
              <YAxis {...axisYShort(shortINR)} />
              <Tooltip content={<ToolTip />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" fill="#22b07d" barSize={40} radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Month-wise Detail Table" subt="Latest 14 months with MoM growth" className="w100">
          <table className="dtable">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Orders</th>
                <th>AOV</th>
                <th>MoM Growth</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTable.map((t) => (
                <tr key={t.month}>
                  <td style={{ fontWeight: 700 }}>{t.month}</td>
                  <td>{fmtINR(t.revenue, false)}</td>
                  <td>{fmtNum(t.orders)}</td>
                  <td>{fmtINR(t.aov)}</td>
                  <td>
                    {t.growth != null ? (
                      <span className={`pill ${t.growth >= 0 ? "g" : "b"}`}>
                        {t.growth >= 0 ? "▲" : "▼"} {Math.abs(t.growth * 100).toFixed(1)}%
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
