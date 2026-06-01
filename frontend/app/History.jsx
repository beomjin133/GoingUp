// Transaction History

function History({ state, dispatch, holdings }) {
  const [transactions, setTransactions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [filter, setFilter] = React.useState("all");
  const [kindFilter, setKindFilter] = React.useState("all");
  const hidden = state.hideAmounts;

  function loadTransactions() {
    setLoading(true);
    fetch(`${API_BASE}/api/transactions`)
      .then(r => r.json())
      .then(data => { setTransactions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  function syncTransactions() {
    setSyncing(true);
    fetch(`${API_BASE}/api/transactions/sync`, { method: 'POST' })
      .then(r => r.json())
      .catch(() => null)
      .then(() => loadTransactions())
      .finally(() => setSyncing(false));
  }

  React.useEffect(() => {
    loadTransactions();
    syncTransactions();
  }, []);

  const rows = transactions
    .filter(t => filter === "all" ? true : t.side === filter)
    .filter(t => kindFilter === "all" ? true : t.kind === kindFilter);

  const buys     = transactions.filter(t => t.side === "buy").reduce((s, t) => s + t.total, 0);
  const sells    = transactions.filter(t => t.side === "sell").reduce((s, t) => s + t.total, 0);
  const deposits = transactions.filter(t => t.side === "deposit").reduce((s, t) => s + t.total, 0);

  return (
    <main className="gu-page gu-fade-in">
      <div className="gu-page-head">
        <div className="gu-page-head-left">
          <div className="gu-breadcrumb">
            <button onClick={() => dispatch({type:"tab", tab:"dash"})} style={{background:"none", border:"none", cursor:"pointer", color:"inherit", textDecoration:"underline"}}>대시보드</button>
            <span className="gu-breadcrumb-sep"><Icon name="chevron_right" size={12}/></span>
            <span>거래내역</span>
          </div>
          <h2 className="gu-h2">거래내역</h2>
        </div>
        <div className="gu-page-actions">
          <button className="gu-btn gu-btn-ghost gu-btn-sm" onClick={syncTransactions} disabled={syncing}>
            <Icon name="refresh" size={13}/> {syncing ? "동기화 중..." : "거래소 동기화"}
          </button>
          <button className="gu-btn gu-btn-secondary gu-btn-sm"><Icon name="download" size={13}/> CSV 내보내기</button>
        </div>
      </div>

      <div className="gu-history-kpis">
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">총 매수</div>
          <div className={"gu-kpi-val gu-up" + (hidden ? " gu-blur-amt" : "")}>₩{fmt(buys)}</div>
          <div className="gu-kpi-delta" style={{color: "var(--gu-fg3)"}}>
            {transactions.filter(t => t.side === "buy").length}건
          </div>
        </div>
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">총 매도</div>
          <div className={"gu-kpi-val gu-down" + (hidden ? " gu-blur-amt" : "")}>₩{fmt(sells)}</div>
          <div className="gu-kpi-delta" style={{color: "var(--gu-fg3)"}}>
            {transactions.filter(t => t.side === "sell").length}건
          </div>
        </div>
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">입출금</div>
          <div className={"gu-kpi-val" + (hidden ? " gu-blur-amt" : "")} style={{color: "var(--gu-brand-primary)"}}>₩{fmt(deposits)}</div>
          <div className="gu-kpi-delta" style={{color: "var(--gu-fg3)"}}>
            {transactions.filter(t => t.side === "deposit").length}건
          </div>
        </div>
      </div>

      <div className="gu-card">
        <div className="gu-card-head">
          <div className="gu-h4">전체 내역</div>
          <div className="gu-filters">
            {[
              {id:"all", label:"전체"},
              {id:"buy", label:"매수"},
              {id:"sell", label:"매도"},
              {id:"deposit", label:"입출금"},
            ].map(f => (
              <button key={f.id}
                className={"gu-pill gu-pill-outline" + (filter === f.id ? " is-active" : "")}
                onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
            <div style={{width: 8}}/>
            {[
              {id:"all", label:"전체 분류"},
              {id:"crypto", label:"코인"},
              {id:"equity", label:"KR"},
              {id:"us", label:"US"},
            ].map(f => (
              <button key={f.id}
                className={"gu-pill" + (kindFilter === f.id ? " is-active" : "")}
                onClick={() => setKindFilter(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>
        <table className="gu-table">
          <thead>
            <tr>
              <th style={{width: "28%"}}>종목 / 시각</th>
              <th>구분</th>
              <th>수량</th>
              <th>단가</th>
              <th>총 금액</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign:"center", color:"var(--gu-fg3)", padding:32}}>불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:"center", color:"var(--gu-fg3)", padding:32}}>거래내역이 없습니다</td></tr>
            ) : rows.map(t => {
              const h = holdings.find(x => x.ticker === t.ticker);
              return (
                <tr key={t.id}
                    onClick={() => h && dispatch({type:"goDetail", id: h.id})}
                    style={!h ? {cursor: "default"} : {}}>
                  <td>
                    <div className="gu-hold-name">
                      {h ? <AssetLogo h={h} size={26}/> : (
                        <div className="gu-hold-logo" style={{width:26, height:26, background: "var(--gu-fg3)", fontSize: 9}}>₩</div>
                      )}
                      <div className="gu-history-row-meta">
                        <span className="gu-history-row-name">{t.name}</span>
                        <span className="gu-history-row-time">{t.time}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={"gu-history-side is-" + t.side}>
                      {t.side === "buy" ? "매수" : t.side === "sell" ? "매도" : "입금"}
                    </span>
                  </td>
                  <td>{t.side === "deposit" ? "—" : Number(t.amt).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
                  <td style={{color: "var(--gu-fg3)"}}>{t.side === "deposit" ? "—" : fmt(t.price)}</td>
                  <td className={hidden ? "gu-blur-amt" : ""} style={{fontWeight: 600}}>
                    <span className={t.side === "buy" ? "gu-up" : t.side === "sell" ? "gu-down" : "gu-flat"}>
                      {t.side === "buy" ? "−" : "+"}₩{fmt(t.total)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

window.History = History;
