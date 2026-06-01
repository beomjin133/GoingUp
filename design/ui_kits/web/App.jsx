function App() {
  const [tab, setTab] = React.useState("trade");
  const [selected, setSelected] = React.useState("BTC");
  const [prefillPrice, setPrefillPrice] = React.useState(null);
  const market = MARKETS.find(m => m.ticker === selected) || MARKETS[0];

  return (
    <div className="gu-app">
      <Header tab={tab} setTab={setTab} />
      {tab === "trade" && (
        <div className="gu-trade-shell">
          <MarketList selected={selected} onSelect={setSelected} />
          <main className="gu-trade-main">
            <PriceHeader market={market} />
            <div className="gu-trade-grid">
              <div className="gu-trade-grid-chart">
                <CandleChart market={market} />
              </div>
              <div className="gu-trade-grid-book">
                <OrderBook market={market} onPriceClick={setPrefillPrice} />
              </div>
              <div className="gu-trade-grid-panel">
                <TradePanel market={market} prefillPrice={prefillPrice} />
              </div>
              <div className="gu-trade-grid-tape">
                <TradeHistory market={market} />
              </div>
            </div>
          </main>
        </div>
      )}
      {tab === "dash" && (
        <main className="gu-dash">
          <div className="gu-dash-head">
            <div>
              <div className="gu-label">내 자산 현황 · 2026-04-23 09:12 KST</div>
              <h2 className="gu-h2" style={{margin:"4px 0 0"}}>포트폴리오</h2>
            </div>
            <div className="gu-dash-actions">
              <button className="gu-btn gu-btn-secondary gu-btn-sm">리밸런싱</button>
              <button className="gu-btn gu-btn-primary gu-btn-sm">자산 연결</button>
            </div>
          </div>
          <PortfolioSummary />
          <Holdings />
        </main>
      )}
      {tab === "deposit" && <SimpleTab title="입출금" sub="원화 입금, 원화 출금, 코인 입금, 코인 출금을 한 화면에서 처리하세요." />}
      {tab === "history" && <SimpleTab title="거래내역" sub="전체 체결·미체결 내역을 기간별로 확인할 수 있습니다." />}
    </div>
  );
}

function SimpleTab({ title, sub }) {
  return (
    <main className="gu-empty">
      <div className="gu-empty-inner">
        <div className="gu-h3">{title}</div>
        <div className="gu-body" style={{marginTop:8, maxWidth:420, textAlign:"center"}}>{sub}</div>
        <div className="gu-caption" style={{marginTop:16}}>이 화면은 데모 목적으로 비어 있습니다.</div>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
