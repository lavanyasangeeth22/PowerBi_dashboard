export const fmtINR = (n, compact = true) => {
  if (n == null) return "–";
  if (compact) {
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
    if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
  }
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

export const fmtNum = (n) => (n == null ? "–" : n.toLocaleString("en-IN"));

export const shortINR = (v) => {
  if (Math.abs(v) >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
};

export const shortNum = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`);

export const pct = (v) => `${(v * 100).toFixed(1)}%`;

export const sum = (rows, key) => rows.reduce((a, r) => a + r[key], 0);
