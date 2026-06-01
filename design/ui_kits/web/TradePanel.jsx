function TradePanel({ market, prefillPrice }) {
  const [side, setSide] = React.useState("buy");
  const [type, setType] = React.useState("limit");
  const [price, setPrice] = React.useState(market.price);
  const [amount, setAmount] = React.useState("");
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => setPrice(market.price), [market.price]);
  React.useEffect(() => { if (prefillPrice) setPrice(prefillPrice); }, [prefillPrice]);

  const krwBalance = 12840210;
  const coinBalance = 0.0418;
  const pcts = [25, 50, 75, 100];
  const total = (+amount || 0) * price;

  const submit = (e) => {
    e.preventDefault();
    setToast({
      kind: side,
      text: `${side === "buy" ? "매수" : "매도"} 주문이 체결되었습니다 · ${amount || "0"} ${market.ticker}`
    });
    setAmount("");
    setTimeout(() => setToast(null), 2400);
  };

  return (
    <div className="gu-trade-panel">
      <div className="gu-trade-tabs">
        <button className={"gu-trade-tab " + (side === "buy" ? "is-buy" : "")}
          onClick={() => setSide("buy")}>매수</button>
        <button className={"gu-trade-tab " + (side === "sell" ? "is-sell" : "")}
          onClick={() => setSide("sell")}>매도</button>
      </div>
      <div className="gu-trade-types">
        {[["limit","지정가"],["market","시장가"],["trigger","예약"]].map(([id, label]) => (
          <button key={id}
            className={"gu-pill" + (type === id ? " is-active" : "")}
            onClick={() => setType(id)}>{label}</button>
        ))}
      </div>
      <form className="gu-trade-form" onSubmit={submit}>
        <div className="gu-field">
          <label className="gu-label">주문 가격</label>
          <div className="gu-affix">
            <input className="gu-input" type="number" value={price}
              onChange={e => setPrice(+e.target.value)} disabled={type === "market"} />
            <span className="gu-suf">KRW</span>
          </div>
        </div>
        <div className="gu-field">
          <label className="gu-label">주문 수량</label>
          <div className="gu-affix">
            <input className="gu-input" type="number" placeholder="0"
              value={amount} onChange={e => setAmount(e.target.value)} />
            <span className="gu-suf">{market.ticker}</span>
          </div>
          <div className="gu-trade-pcts">
            {pcts.map(p => (
              <button type="button" key={p} className="gu-pill"
                onClick={() => {
                  if (side === "buy") setAmount(((krwBalance * p / 100) / price).toFixed(6));
                  else setAmount((coinBalance * p / 100).toFixed(6));
                }}>{p}%</button>
            ))}
          </div>
        </div>
        <div className="gu-trade-summary">
          <div><span className="gu-label">총 주문금액</span>
            <span className="gu-num">₩{fmt(Math.round(total))}</span></div>
          <div><span className="gu-label">수수료 (0.05%)</span>
            <span className="gu-num gu-fg3">₩{fmt(Math.round(total * 0.0005))}</span></div>
          <div><span className="gu-label">{side === "buy" ? "사용 가능" : "보유"}</span>
            <span className="gu-num">
              {side === "buy" ? `₩${fmt(krwBalance)}` : `${coinBalance} ${market.ticker}`}
            </span></div>
        </div>
        <button type="submit" className={"gu-btn gu-btn-lg " + (side === "buy" ? "gu-btn-buy" : "gu-btn-sell")}>
          {side === "buy" ? `${market.name} 매수` : `${market.name} 매도`}
        </button>
      </form>
      {toast && (
        <div className={"gu-toast " + (toast.kind === "buy" ? "is-up" : "is-down")}>{toast.text}</div>
      )}
    </div>
  );
}
window.TradePanel = TradePanel;
