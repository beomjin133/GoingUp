function PriceHeader({ market }) {
  const up = market.change >= 0;
  const abs = Math.round(market.price * market.change / 100);
  return (
    <div className="gu-price-header">
      <div className="gu-price-header-left">
        <div className="gu-price-title">
          <span className="gu-price-name">{market.name}</span>
          <span className="gu-price-pair">{market.pair}</span>
        </div>
        <div className="gu-price-row">
          <span className={"gu-price-val gu-num-lg " + (up ? "gu-up" : "gu-down")}>
            {fmt(market.price)}
          </span>
          <span className={"gu-price-delta gu-num " + (up ? "gu-up" : "gu-down")}>
            {up ? "▲" : "▼"} {fmtPct(market.change)}
            <span className="gu-price-delta-abs"> · {fmtSigned(abs)}</span>
          </span>
        </div>
      </div>
      <div className="gu-price-stats">
        <div><span className="gu-label">고가</span><span className="gu-num gu-up">{fmt(Math.round(market.price * 1.028))}</span></div>
        <div><span className="gu-label">저가</span><span className="gu-num gu-down">{fmt(Math.round(market.price * 0.982))}</span></div>
        <div><span className="gu-label">거래량 24h</span><span className="gu-num">{market.vol}</span></div>
      </div>
    </div>
  );
}
window.PriceHeader = PriceHeader;
