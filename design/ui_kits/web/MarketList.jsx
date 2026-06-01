function MarketList({ selected, onSelect }) {
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const filters = [
    { id: "all", label: "전체", icon: null },
    { id: "crypto", label: "코인", icon: "../../assets/icons/coin.svg" },
    { id: "equity", label: "주식", icon: "../../assets/icons/stock.svg" },
    { id: "fav", label: "관심", icon: "../../assets/icons/star.svg" },
  ];
  const rows = MARKETS.filter(m =>
    (filter === "all" || filter === "fav" || m.kind === filter) &&
    (q === "" || m.name.includes(q) || m.ticker.includes(q.toUpperCase()))
  );
  return (
    <aside className="gu-market-list">
      <div className="gu-market-search">
        <input className="gu-input" placeholder="종목 검색" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="gu-market-filters">
        {filters.map(f => (
          <button key={f.id}
            className={"gu-pill" + (filter === f.id ? " is-active" : "")}
            onClick={() => setFilter(f.id)}>
            {f.icon && <img src={f.icon} width="12" height="12" alt="" style={{marginRight:4,verticalAlign:"-2px"}} />}
            {f.label}
          </button>
        ))}
      </div>
      <div className="gu-market-head">
        <span>종목</span>
        <span className="gu-num-col">현재가</span>
        <span className="gu-num-col">변동</span>
      </div>
      <div className="gu-market-rows">
        {rows.map(m => (
          <button key={m.ticker}
            className={"gu-market-row" + (selected === m.ticker ? " is-active" : "")}
            onClick={() => onSelect(m.ticker)}>
            <span className="gu-market-name">
              <span className="gu-market-star">☆</span>
              <span className="gu-market-name-main">{m.name}</span>
              <span className="gu-market-tkr">{m.ticker}</span>
            </span>
            <span className="gu-num gu-num-col">{fmt(m.price)}</span>
            <span className={"gu-num gu-num-col " + (m.change >= 0 ? "gu-up" : "gu-down")}>
              {fmtPct(m.change)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
window.MarketList = MarketList;
