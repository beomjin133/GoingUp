function OrderBook({ market, onPriceClick }) {
  const base = market.price;
  const tick = Math.round(base * 0.00002);
  const asks = [];
  const bids = [];
  for (let i = 0; i < 8; i++) {
    asks.push({ price: base + tick * (i + 1), size: +(Math.random() * 1.5 + 0.1).toFixed(4), pct: Math.random() * 0.8 + 0.1 });
    bids.push({ price: base - tick * (i + 1), size: +(Math.random() * 1.5 + 0.1).toFixed(4), pct: Math.random() * 0.8 + 0.1 });
  }
  return (
    <div className="gu-orderbook">
      <div className="gu-orderbook-head">
        <span>가격(KRW)</span>
        <span>수량</span>
        <span>누적</span>
      </div>
      <div className="gu-orderbook-asks">
        {asks.slice().reverse().map((a, i) => (
          <div key={i} className="gu-orderbook-row" onClick={() => onPriceClick?.(a.price)}>
            <span className="gu-orderbook-bar gu-orderbook-bar-ask" style={{width: (a.pct * 100) + "%"}} />
            <span className="gu-num gu-up">{fmt(a.price)}</span>
            <span className="gu-num">{a.size.toFixed(4)}</span>
            <span className="gu-num gu-fg3">{(a.size * asks.length).toFixed(3)}</span>
          </div>
        ))}
      </div>
      <div className="gu-orderbook-spread">
        <span>스프레드</span>
        <span className="gu-num">{fmt(tick * 2)}</span>
      </div>
      <div className="gu-orderbook-bids">
        {bids.map((b, i) => (
          <div key={i} className="gu-orderbook-row" onClick={() => onPriceClick?.(b.price)}>
            <span className="gu-orderbook-bar gu-orderbook-bar-bid" style={{width: (b.pct * 100) + "%"}} />
            <span className="gu-num gu-down">{fmt(b.price)}</span>
            <span className="gu-num">{b.size.toFixed(4)}</span>
            <span className="gu-num gu-fg3">{(b.size * bids.length).toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
window.OrderBook = OrderBook;
