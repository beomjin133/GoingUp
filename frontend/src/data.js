export const API_BASE = '';

export const KIND_META = {
  crypto: { label: "코인",   color: "#F59E0B" },
  equity: { label: "KR",    color: "#1A55F0" },
  us:     { label: "US",    color: "#8B5CF6" },
  cash:   { label: "예수금", color: "#6B7684" },
};

export const DEFAULT_TARGETS = { crypto: 25, equity: 40, us: 25, cash: 10 };

export function computeTotals(holdings, cashKRW) {
  let total = cashKRW;
  const byKind = { crypto: 0, equity: 0, us: 0, cash: cashKRW };
  holdings.forEach(h => {
    total += h.marketValue;
    byKind[h.kind] = (byKind[h.kind] || 0) + h.marketValue;
  });
  return { total, byKind };
}

export function makePriceSeries(endPrice, days = 90) {
  return makeEquityCurve(days, endPrice);
}

export function makeEquityCurve(days = 90, endValue = 0) {
  const pts = [];
  let v = endValue * 0.78;
  for (let i = 0; i < days; i++) {
    const drift = 0.003;
    const noise = (Math.sin(i * 0.42) + Math.cos(i * 0.71) * 0.5 + (Math.random() - 0.5) * 0.7) * 0.018;
    v = v * (1 + drift + noise);
    pts.push(v);
  }
  const ratio = endValue / pts[pts.length - 1];
  return pts.map(p => p * ratio);
}

export const fmt = (n) => Math.round(n).toLocaleString("ko-KR");

export function fmtPrice(n) {
  if (n >= 1) return Math.round(n).toLocaleString("ko-KR");
  if (n <= 0) return '0';
  const decimals = Math.min(7, Math.max(2, Math.ceil(-Math.log10(n)) + 2));
  return n.toFixed(decimals);
}

export const fmtPct = (n, digits = 2) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(digits) + "%";
export const fmtSigned = (n) => (n >= 0 ? "+" : "−") + Math.abs(Math.round(n)).toLocaleString("ko-KR");

export function fmtShortKRW(n) {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + "조";
  if (abs >= 1e8)  return (n / 1e8).toFixed(2) + "억";
  if (abs >= 1e4)  return (n / 1e4).toFixed(1) + "만";
  return Math.round(n).toLocaleString("ko-KR");
}
