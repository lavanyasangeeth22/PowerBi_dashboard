import React, { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, Kpi, ToolTip, axisProps, axisYShort } from "../components.jsx";
import { groupSum, PALETTE, data } from "../store.js";
import { fmtINR, fmtNum, shortINR, shortNum } from "../utils.js";

export default function Customers({ f }) {
  const [gender, setGender] = useState("All");
  const [age, setAge] = useState("All");

  const scoped = useMemo(
    () =>
      f.tud.filter((r) => (gender === "All" || r.g === gender) && (age === "All" || r.a === age)),
    [f, gender, age],
  );

  const revenue = scoped.reduce((a, r) => a + r.r, 0);
  const orders = scoped.reduce((a, r) => a + r.o, 0);
  const aov = orders ? revenue / orders : 0;
  const ordersPerUser = orders / Math.max(data.meta.total_users, 1);

  const genderRows = useMemo(
    () => groupSum(scoped, (r) => r.g).map((g) => ({ gender: g.key, revenue: g.revenue, orders: g.orders })),
    [scoped],
  );
  const ageRows = useMemo(
    () => groupSum(scoped, (r) => r.a || "Unknown").sort((a, b) => a.key.localeCompare(b.key))
      .map((g) => ({ age: g.key, revenue: g.revenue, orders: g.orders })),
    [scoped],
  );
  const loyaltyRows = useMemo(
    () => groupSum(scoped, (r) => r.l).sort((a, b) => b.revenue - a.revenue)
      .map((g) => ({ loyalty: g.key, revenue: g.revenue })),
    [scoped],
  );
  const occRows = useMemo(
    () => groupSum(scoped, (r) => r.oc).sort((a, b) => b.revenue - a.revenue)
      .map((g) => ({ occ: g.key, revenue: g.revenue })),
    [scoped],
  );
  const freqRows = data.freq_split.map((r) => ({ freq: r.freq, users: r.users }));

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Revenue (scoped)" value={fmtINR(revenue)} delta="current slicer selection" icon="ðŸ’°" />
        <Kpi label="Orders (scoped)" value={fmtNum(orders)} color="blue" delta="current slicer selection" icon="ðŸ§¾" />
        <Kpi label="AOV" value={fmtINR(aov)} color="green" delta="per order" icon="ðŸ§®" />
        <Kpi label="Orders / User" value={ordersPerUser.toFixed(1)} color="gold" delta="all-time average" icon="ðŸ”" />
        <Kpi label="Registered Users" value={fmtNum(data.meta.total_users)} color="purple" delta="demographic base" icon="ðŸ‘¤" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#7a7790", alignSelf: "center", textTransform: "uppercase", letterSpacing: 1 }}>Local filters:</span>
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
        <Card title="Gender â€” Revenue Split" subt="Male vs Female spend" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={genderRows} dataKey="revenue" nameKey="gender" innerRadius={55} outerRadius={85} paddingAngle={4} isAnimationActive={false}>
                {genderRows.map((_, i) => (
                  <Cell key={i} fill={["#4c6fff", "#ef476f"][i % 2]} />
                ))}
              </Pie>
              <Tooltip content={<ToolTip key2="orders" />} />
              <Legend wrapperStyle={{ fontSize: 11.5 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Age Group â€” Spend" subt="18â€“21 Â· 22â€“25 Â· 26â€“29 Â· 30â€“33" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageRows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="age" {...axisProps()} />
              <YAxis {...axisYShort(shortINR)} />
              <Tooltip content={<ToolTip />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" barSize={34} radius={[7, 7, 0, 0]}>
                {ageRows.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
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
              <Bar isAnimationActive={false} dataKey="revenue" barSize={18} fill="#9b51e0" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Occupation Mix" subt="Who spends the most" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={occRows} layout="vertical" margin={{ top: 0, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" horizontal={false} />
              <XAxis type="number" {...axisYShort(shortINR)} />
              <YAxis type="category" dataKey="occ" width={100} {...axisProps()} tick={{ fontSize: 10.5, fill: "#7a7790" }} />
              <Tooltip content={<ToolTip key2={null} />} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="revenue" barSize={18} fill="#f2b840" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Order Frequency Segments" subt="Users by orders placed (all-time)" className="w33">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={freqRows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeecf5" vertical={false} />
              <XAxis dataKey="freq" {...axisProps()} />
              <YAxis {...axisYShort(shortNum)} />
              <Tooltip formatter={(v) => fmtNum(v)} cursor={{ fill: "#fff4eb" }} />
              <Bar isAnimationActive={false} dataKey="users" barSize={38} fill="#2ec4b6" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Segmentation Snapshot" subt="Guidance derived from splits" className="w33">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
            {ageRows.length > 0 && (
              <Seg note={`Highest spending age band: ${ageRows.slice().sort((a, b) => b.revenue - a.revenue)[0]?.age}`} />
            )}
            <Seg note={`Dominant loyalty base: ${loyaltyRows[0]?.loyalty} (${((loyaltyRows[0]?.revenue / Math.max(revenue, 1)) * 100).toFixed(1)}% of revenue)`} />
            <Seg note={`Top occupation: ${occRows[0]?.occ}`} />
            <Seg note={`${fmtNum(freqRows[1]?.users + freqRows[2]?.users)} users ordered 2â€“9 times â€” the loyalty engine of the platform.`} />
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
