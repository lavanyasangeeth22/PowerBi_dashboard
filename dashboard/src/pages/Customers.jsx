import React, { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, Kpi, ToolTip, axisProps, axisYShort, useChartPick } from "../components.jsx";
import { groupSum, PALETTE, data } from "../store.js";
import { fmtINR, fmtNum, shortINR, shortNum } from "../utils.js";

const DIMS = { g: "g", a: "a", l: "l", oc: "oc" };

export default function Customers({ f }) {
  const [gender, setGender] = useState("All");
  const [age, setAge] = useState("All");

  const scoped = useMemo(
    () =>
      f.dims.filter(
        (r) =>
          (r.k !== DIMS.g || gender === "All" || r.v === gender) &&
          (r.k !== DIMS.a || age === "All" || r.v === age),
      ),
    [f, gender, age],
  );

  const revenue = f.tcc.reduce((a, r) => a + r.r, 0);
  const orders = f.tcc.reduce((a, r) => a + r.o, 0);
  const aov = orders ? revenue / orders : 0;
  const buyingUsers = f.users;
  const ordersPerUser = orders / Math.max(buyingUsers, 1);

  const genderRows = useMemo(
    () => groupSum(scoped.filter((r) => r.k === DIMS.g), (r) => r.v).map((g) => ({ gender: g.key, revenue: g.revenue, orders: g.orders })),
    [scoped],
  );
  const ageRows = useMemo(
    () => groupSum(scoped.filter((r) => r.k === DIMS.a), (r) => r.v || "Unknown").sort((a, b) => a.key.localeCompare(b.key))
      .map((g) => ({ age: g.key, revenue: g.revenue, orders: g.orders })),
    [scoped],
  );
  const loyaltyRows = useMemo(
    () => groupSum(scoped.filter((r) => r.k === DIMS.l), (r) => r.v).sort((a, b) => b.revenue - a.revenue)
      .map((g) => ({ loyalty: g.key, revenue: g.revenue })),
    [scoped],
  );
  const occRows = useMemo(
    () => groupSum(scoped.filter((r) => r.k === DIMS.oc), (r) => r.v).sort((a, b) => b.revenue - a.revenue)
      .map((g) => ({ occ: g.key, revenue: g.revenue })),
    [scoped],
  );
  const freqRows = data.freq_split.map((r) => ({ freq: r.freq, users: r.users }));

  const genderPick = useChartPick(genderRows.map((d) => d.gender).join("|"));
  const agePick = useChartPick(ageRows.map((d) => d.age).join("|"));
  const loyaltyPick = useChartPick(loyaltyRows.map((d) => d.loyalty).join("|"));
  const occPick = useChartPick(occRows.map((d) => d.occ).join("|"));
  const freqPick = useChartPick(freqRows.map((d) => d.freq).join("|"));

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Revenue (scoped)" value={fmtINR(revenue)} delta="current slicer selection" />
        <Kpi label="Orders (scoped)" value={fmtNum(orders)} color="blue" delta="current slicer selection" />
        <Kpi label="AOV" value={fmtINR(aov)} color="green" delta="per order" />
        <Kpi label="Orders / User" value={ordersPerUser.toFixed(1)} color="gold" delta="scoped buying users" />
        <Kpi label="Buying Users" value={fmtNum(buyingUsers)} color="purple" delta="unique in scope" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#7a7790", alignSelf: "center" }}>Local filters:</span>
        {["All", "Male", "Female"].map((g) => (
          <button key={g} className={`pill ${gender === g ? "o" : "b"}`} style={{ cursor: "pointer", border: "none" }} onClick={() => setGender(g)}>
            {g}
          </button>
        ))}
        <span style={{ width: 14 }} />
        {["All", "18-21", "22-25", "26-29", "30-33"].map((a) => (
          <button key={a} className={`pill ${age === a ? "o" : "b"}`} style={{ cursor: "pointer", border: "none" }} onClick={() => setAge(a)}>
            {a}
          </button>
        ))}
      </div>

      <div className="grid cols" style={{ gridTemplateRows: "auto auto auto auto" }}>
        <Card title="Gender — Revenue Split" subt="Male vs Female spend in scope" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={genderRows} dataKey="revenue" nameKey="gender" innerRadius={55} outerRadius={85} paddingAngle={4} isAnimationActive={false}>
                {genderRows.map((_, i) => (
                  <Cell key={i} fill={["#4c6fff", "#ef476f", "#b6b1cc"][i % 3]} {...genderPick.cellProps(i)} />
                ))}
              </Pie>
              <Tooltip content={<ToolTip key2="orders" />} />
              <Legend wrapperStyle={{ fontSize: 11.5 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Age Group — Spend" subt="Revenue by age band in scope" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageRows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="age" {...axisProps()} />
              <YAxis {...axisYShort(shortINR)} />
              <Tooltip content={<ToolTip />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" barSize={34} radius={[7, 7, 0, 0]}>
                {ageRows.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} {...agePick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Loyalty Status" subt="Single vs Married vs Prefer not to say" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={loyaltyRows} layout="vertical" margin={{ top: 0, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" horizontal={false} />
              <XAxis type="number" {...axisYShort(shortINR)} />
              <YAxis type="category" dataKey="loyalty" width={110} {...axisProps()} tick={{ fontSize: 10.5, fill: "#7a7790" }} />
              <Tooltip content={<ToolTip key2={null} />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" barSize={18} radius={[0, 6, 6, 0]}>
                {loyaltyRows.map((_, i) => (
                  <Cell key={i} fill="#9b51e0" {...loyaltyPick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Occupation Mix" subt="Who spends the most in scope" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={occRows} layout="vertical" margin={{ top: 0, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" horizontal={false} />
              <XAxis type="number" {...axisYShort(shortINR)} />
              <YAxis type="category" dataKey="occ" width={100} {...axisProps()} tick={{ fontSize: 10.5, fill: "#7a7790" }} />
              <Tooltip content={<ToolTip key2={null} />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" barSize={18} radius={[0, 6, 6, 0]}>
                {occRows.map((_, i) => (
                  <Cell key={i} fill="#f2b840" {...occPick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Order Frequency Segments" subt="Users by lifetime orders · all users (not sliced)" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={freqRows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="freq" {...axisProps()} />
              <YAxis {...axisYShort(shortNum)} />
              <Tooltip formatter={(v) => fmtNum(v)} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="users" barSize={38} radius={[7, 7, 0, 0]}>
                {freqRows.map((_, i) => (
                  <Cell key={i} fill="#2ec4b6" {...freqPick.cellProps(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Segmentation Snapshot" subt="Guidance derived from the scoped splits" className="w33">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
            {ageRows.length > 0 && (
              <Seg note={`Highest spending age band: ${ageRows.slice().sort((a, b) => b.revenue - a.revenue)[0]?.age}`} />
            )}
            <Seg note={`Dominant loyalty base: ${loyaltyRows[0]?.loyalty} (${((loyaltyRows[0]?.revenue / Math.max(revenue, 1)) * 100).toFixed(1)}% of revenue)`} />
            <Seg note={`Top occupation: ${occRows[0]?.occ}`} />
            <Seg note={`${fmtNum(freqRows[1]?.users + freqRows[2]?.users)} users ordered 2–9 times (all-time) — the loyalty engine of the platform.`} />
            <Seg note="VIP program recommended: top 10% of users generate ~80% of sales." />
          </div>
        </Card>
      </div>
    </>
  );
}

function Seg({ note }) {
  return (
    <div style={{ background: "#fbfaff", borderRadius: 10, padding: "10px 14px", borderLeft: "3px solid #fc8019" }}>
      {note}
    </div>
  );
}
