import React from "react";
import { fmtINR, fmtNum, shortINR, shortNum } from "./utils.js";

export function Kpi({ label, value, delta, deltaDir, color = "" }) {
  return (
    <div className="card kpi">
      <span className={`stripe ${color}`} />
      <span className="label">{label}</span>
      <div className="value">{value}</div>
      {delta && <div className={`delta ${deltaDir || ""}`}>{delta}</div>}
    </div>
  );
}

export function ToolTip({ active, payload, label, fmtKey = "revenue", fmt = fmtINR, fmt2 = fmtNum, key2 = "orders" }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tip">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label ?? d.label ?? d.key}</div>
      {fmtKey && (
        <div>
          {fmtKey}: <b>{fmt(d[fmtKey])}</b>
        </div>
      )}
      {fmt2 && key2 && d[key2] != null && (
        <div>
          {key2}: <b>{fmt2(d[key2])}</b>
        </div>
      )}
      {d.aov != null && (
        <div>
          Avg/Order: <b>{fmtINR(d.aov)}</b>
        </div>
      )}
    </div>
  );
}

export function Card({ title, subt, children, className = "w50" }) {
  return (
    <div className={`card ${className}`}>
      {title && <h3>{title}</h3>}
      {subt && <div className="subt">{subt}</div>}
      {children}
    </div>
  );
}

export function axisProps() {
  return {
    tickLine: false,
    axisLine: false,
    tick: { fontSize: 11, fill: "#7a7790" },
  };
}

export function axisYShort(format = shortNum) {
  return {
    tickFormatter: format,
    ...axisProps(),
  };
}

export { shortINR, shortNum };
