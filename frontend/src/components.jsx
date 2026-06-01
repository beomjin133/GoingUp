import React from 'react';

export function Logo({ size = 22 }) {
  return (
    <svg height={size} viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="url(#gu-lg)"/>
      <path d="M8 19L13 13L16 16L21 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 9H21V13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="36" y="20" fontFamily="Pretendard Variable, sans-serif" fontSize="16" fontWeight="700" fill="currentColor">GoingUp</text>
      <defs>
        <linearGradient id="gu-lg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0E44D5"/><stop offset="1" stopColor="#1A55F0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.75 }) {
  const paths = {
    search:   <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>,
    chevron_right: <path d="M9 6l6 6-6 6"/>,
    chevron_left:  <path d="M15 6l-9 6 9 6"/>,
    chevron_down:  <path d="M6 9l6 6 6-6"/>,
    plus:     <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    minus:    <path d="M5 12h14"/>,
    arrow_up: <><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></>,
    arrow_down: <><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    refresh: <><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    close: <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         style={{flexShrink: 0}}>
      {paths[name]}
    </svg>
  );
}

export function AssetLogo({ h, size = 28 }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const initials = h.kind === "equity" || h.kind === "us"
    ? h.name.slice(0, 2)
    : h.ticker.slice(0, 2);

  if (h.kind === "crypto" && !imgFailed) {
    return (
      <div className="gu-hold-logo" style={{ width: size, height: size, background: "transparent" }}>
        <img
          src={`https://static.upbit.com/logos/${h.ticker}.png`}
          alt={h.ticker}
          width={size} height={size}
          style={{ borderRadius: "50%", display: "block" }}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className="gu-hold-logo" style={{
      width: size, height: size,
      background: h.color,
      color: h.color === "#FEE500" ? "#0F1419" : "#fff",
      fontSize: size * 0.36,
    }}>
      {initials}
    </div>
  );
}

export function KindTag({ kind }) {
  const labels = { crypto: "코인", equity: "KR", us: "US", cash: "현금" };
  return <span className={"gu-hold-kind is-" + kind}>{labels[kind]}</span>;
}

export function AreaChart({ data, height = 120, color = "#1A55F0", fillOpacity = 0.12 }) {
  if (!data || data.length === 0) return null;
  const w = 800, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 10) - 4]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg className="gu-hero-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{height}}>
      <defs>
        <linearGradient id={"gu-ag-" + color.replace("#","")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity}/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#gu-ag-${color.replace("#","")})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Sparkline({ data, width = 80, height = 24, color = "#1A55F0" }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) =>
    i * step + "," + (height - ((v - min) / range) * (height - 4) - 2).toFixed(1)
  ).join(" ");
  return (
    <svg width={width} height={height} style={{display:"block"}}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

export function Donut({ slices, size = 140, thickness = 22, centerLabel, centerValue }) {
  const r = size / 2;
  const inner = r - thickness;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let accum = 0;
  const arcs = slices.map((s, i) => {
    const start = (accum / total) * Math.PI * 2 - Math.PI / 2;
    accum += s.value;
    const end = (accum / total) * Math.PI * 2 - Math.PI / 2;
    if (s.value / total >= 0.9999) {
      const midR = (r + inner) / 2;
      return <circle key={i} cx={r} cy={r} r={midR} fill="none" stroke={s.color} strokeWidth={thickness} />;
    }
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = r + r * Math.cos(start), y1 = r + r * Math.sin(start);
    const x2 = r + r * Math.cos(end),   y2 = r + r * Math.sin(end);
    const x3 = r + inner * Math.cos(end), y3 = r + inner * Math.sin(end);
    const x4 = r + inner * Math.cos(start), y4 = r + inner * Math.sin(start);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
    return <path key={i} d={d} fill={s.color} />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      {centerLabel && (
        <>
          <text x={r} y={r - 3} textAnchor="middle" fontFamily="Pretendard Variable" fontSize="10" fill="var(--gu-fg3)">{centerLabel}</text>
          <text x={r} y={r + 14} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="14" fontWeight="700" fill="var(--gu-fg1)">{centerValue}</text>
        </>
      )}
    </svg>
  );
}
