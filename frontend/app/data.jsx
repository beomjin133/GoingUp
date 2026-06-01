// GoingUp — formatters & helpers (데이터는 API에서 로딩)

const API_BASE = '';

const KIND_META = {
  crypto: { label: "코인",   color: "#F59E0B" },
  equity: { label: "KR",    color: "#1A55F0" },
  us:     { label: "US",    color: "#8B5CF6" },
  cash:   { label: "예수금", color: "#6B7684" },
};

const DEFAULT_TARGETS = { crypto: 25, equity: 40, us: 25, cash: 10 };

function computeTotals(holdings, cashKRW) {
  let total = cashKRW;
  const byKind = { crypto: 0, equity: 0, us: 0, cash: cashKRW };
  holdings.forEach(h => {
    total += h.marketValue;
    byKind[h.kind] = (byKind[h.kind] || 0) + h.marketValue;
  });
  return { total, byKind };
}

function makePriceSeries(endPrice, days = 90) {
  return makeEquityCurve(days, endPrice);
}

function makeEquityCurve(days = 90, endValue = 0) {
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

// Formatters
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
function fmtPrice(n) {
  if (n >= 1) return Math.round(n).toLocaleString("ko-KR");
  if (n <= 0) return '0';
  // 유효숫자 2자리 이상 보이도록 자릿수 계산, 최대 7자리
  const decimals = Math.min(7, Math.max(2, Math.ceil(-Math.log10(n)) + 2));
  return n.toFixed(decimals);
}
const fmtPct = (n, digits = 2) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(digits) + "%";
const fmtSigned = (n) => (n >= 0 ? "+" : "−") + Math.abs(Math.round(n)).toLocaleString("ko-KR");
function fmtShortKRW(n) {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + "조";
  if (abs >= 1e8)  return (n / 1e8).toFixed(2) + "억";
  if (abs >= 1e4)  return (n / 1e4).toFixed(1) + "만";
  return Math.round(n).toLocaleString("ko-KR");
}

Object.assign(window, {
  API_BASE, KIND_META, DEFAULT_TARGETS, computeTotals,
  makeEquityCurve, makePriceSeries, fmt, fmtPrice, fmtPct, fmtSigned, fmtShortKRW,
});
