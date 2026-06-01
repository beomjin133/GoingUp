function CandleChart({ market }) {
  const [tf, setTf] = React.useState("1H");
  const tfs = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
  // Seeded pseudo-candles from market ticker so it changes per coin.
  const seed = market.ticker.charCodeAt(0) + market.ticker.charCodeAt(market.ticker.length - 1);
  const candles = React.useMemo(() => {
    const arr = []; let y = 70;
    for (let i = 0; i < 40; i++) {
      const r = Math.sin((i + seed) * 0.7) * 12 + Math.cos((i + seed) * 0.3) * 8;
      const open = y;
      y = Math.max(10, Math.min(110, y + r * 0.3 - (market.change > 0 ? 0.9 : -0.6)));
      const close = y;
      const high = Math.min(open, close) - Math.abs(r) * 0.4;
      const low  = Math.max(open, close) + Math.abs(r) * 0.4;
      arr.push({ open, close, high, low, up: close < open });
    }
    return arr;
  }, [market.ticker, market.change]);

  return (
    <div className="gu-chart">
      <div className="gu-chart-toolbar">
        <div className="gu-chart-tfs">
          {tfs.map(t => (
            <button key={t}
              className={"gu-chart-tf" + (tf === t ? " is-active" : "")}
              onClick={() => setTf(t)}>{t}</button>
          ))}
        </div>
        <div className="gu-chart-indicators">
          <button className="gu-chart-tf">MA</button>
          <button className="gu-chart-tf">볼륨</button>
          <button className="gu-chart-tf">지표</button>
        </div>
      </div>
      <svg className="gu-chart-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
        {[60, 120, 180, 240].map(y => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#EEF0F3" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        {candles.map((c, i) => {
          const x = 10 + i * 19;
          const color = c.up ? "#F24147" : "#1967D2";
          const y1 = Math.min(c.open, c.close) * 2.2;
          const h = Math.max(2, Math.abs(c.close - c.open) * 2.2);
          return (
            <g key={i}>
              <line x1={x + 6} y1={c.high * 2.2} x2={x + 6} y2={c.low * 2.2} stroke={color} strokeWidth="1.2" />
              <rect x={x} y={y1} width="12" height={h} fill={color} />
            </g>
          );
        })}
      </svg>
      <div className="gu-chart-axis">
        <span className="gu-caption">09:00</span><span className="gu-caption">11:00</span>
        <span className="gu-caption">13:00</span><span className="gu-caption">15:00</span>
        <span className="gu-caption">17:00</span>
      </div>
    </div>
  );
}
window.CandleChart = CandleChart;
