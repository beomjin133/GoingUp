function TradeHistory({ market }) {
  const [rows] = React.useState(() => {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const up = Math.random() > 0.5;
      out.push({
        time: `09:${(12 - i).toString().padStart(2, "0")}:${Math.floor(Math.random()*60).toString().padStart(2, "0")}`,
        price: market.price + (Math.round((Math.random() - 0.5) * market.price * 0.0008)),
        size: +(Math.random() * 0.8 + 0.01).toFixed(4),
        up
      });
    }
    return out;
  });
  return (
    <div className="gu-trade-history">
      <div className="gu-trade-history-head">
        <span>체결시각</span>
        <span>체결가</span>
        <span>체결량</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="gu-trade-history-row">
          <span className="gu-num gu-fg3">{r.time}</span>
          <span className={"gu-num " + (r.up ? "gu-up" : "gu-down")}>{fmt(r.price)}</span>
          <span className="gu-num">{r.size.toFixed(4)}</span>
        </div>
      ))}
    </div>
  );
}
window.TradeHistory = TradeHistory;
