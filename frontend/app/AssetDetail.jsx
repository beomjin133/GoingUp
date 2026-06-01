// Trading page — sidebar ticker list + chart + order panel

function AssetDetail({ state, dispatch, data, onRefresh }) {
  const { holdings, cashKRW } = data;

  const initHolding = holdings.find(x => x.id === state.selectedId);
  const [kind, setKind]         = React.useState(initHolding?.kind || 'crypto');
  const [markets, setMarkets]   = React.useState([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [selected, setSelected] = React.useState(
    initHolding ? {
      ticker: initHolding.ticker, name: initHolding.name,
      price: initHolding.price, daily_pct: initHolding.daily_pct,
      kind: initHolding.kind,
    } : null
  );
  const [search, setSearch]       = React.useState('');
  const [side, setSide]           = React.useState('buy');
  const [price, setPrice]         = React.useState(initHolding?.price || 0);
  const [qty, setQty]             = React.useState(0);
  const [krwAmt, setKrwAmt]       = React.useState(0);
  const [ordering, setOrdering]       = React.useState(false);
  const [orderResult, setOrderResult] = React.useState(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pendingLot, setPendingLot]   = React.useState(null); // {lot, reload}
  const hidden = state.hideAmounts;

  const SERVICE_MAP = { crypto: 'upbit', equity: 'kis', us: 'kis' };

  function executeOrder() {
    setShowConfirm(false);
    setOrdering(true);
    setOrderResult(null);
    const lotCtx = pendingLot;
    setPendingLot(null);
    fetch(`${API_BASE}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: SERVICE_MAP[selected.kind] || selected.kind,
        side, ticker: selected.ticker, name: selected.name,
        kind: selected.kind, price: selected.price, qty: orderQty,
      }),
    })
      .then(r => r.json())
      .then(res => {
        setOrderResult(res);
        setOrdering(false);
        if (res.success) {
          setQty(0); setKrwAmt(0);
          if (lotCtx) {
            fetch(`${API_BASE}/api/lots/${lotCtx.lot.id}`, { method: 'DELETE' });
            lotCtx.reload();
          }
          if (onRefresh) onRefresh();
        }
      })
      .catch(e => { setOrderResult({ success: false, msg: String(e) }); setOrdering(false); });
  }

  React.useEffect(() => {
    setSearch('');
    if (kind !== 'crypto') {
      setMarkets(
        holdings
          .filter(h => h.kind === kind)
          .map(h => ({ ticker: h.ticker, name: h.name, price: h.price, daily_pct: h.daily_pct || 0, kind: h.kind }))
      );
      return;
    }
    setLoadingList(true);
    fetch(`${API_BASE}/api/markets?kind=crypto`)
      .then(r => r.json())
      .then(list => { setMarkets(Array.isArray(list) ? list : []); setLoadingList(false); })
      .catch(() => setLoadingList(false));
  }, [kind]);

  const filtered = markets.filter(m =>
    m.name.includes(search) ||
    m.ticker.toLowerCase().includes(search.toLowerCase())
  );

  const hHolding = selected ? holdings.find(x => x.ticker === selected.ticker) : null;
  const myAmt    = hHolding?.amt || 0;
  const orderQty = qty;
  const total    = krwAmt;

  function selectTicker(m) {
    setSelected(m);
    setPrice(m.price);
    setQty(0); setKrwAmt(0);
  }

  const KINDS = [
    { id: 'crypto', label: '코인' },
    { id: 'equity', label: '한국주식' },
    { id: 'us',     label: '해외주식' },
  ];

  return (
    <div className="gu-trade-wrap gu-fade-in">
    <div className="gu-trade-page">

      {/* ── 메인 콘텐츠 (왼쪽) ── */}
      <div className="gu-trade-content">
        {!selected ? (
          <div className="gu-trade-empty">종목을 선택하세요</div>
        ) : (
          <>
            {/* 종목 헤더 */}
            <div className="gu-trade-ticker-hero">
              <div className="gu-trade-ticker-row">
                <span className="gu-trade-ticker-name">{selected.name}</span>
                <span className="gu-trade-ticker-price-val">₩{fmtPrice(selected.price)}</span>
              </div>
              <div className="gu-trade-ticker-row">
                <div className="gu-trade-ticker-meta">
                  <KindTag kind={selected.kind}/>
                  <span style={{color:'var(--gu-fg3)'}}>{selected.ticker}</span>
                </div>
                <span className={'gu-trade-ticker-delta ' + (selected.daily_pct >= 0 ? 'gu-up' : 'gu-down')}>
                  {selected.daily_pct >= 0 ? '▲' : '▼'} {Math.abs(selected.daily_pct).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* 차트 */}
            <div className="gu-card" style={{overflow:'hidden'}}>
              {selected.kind === 'equity'
                ? <KRXChart ticker={selected.ticker} theme={state.theme}/>
                : <TradingViewChart ticker={selected.ticker} kind={selected.kind} theme={state.theme}/>
              }
            </div>

            {/* 보유 현황 */}
            {hHolding && (
              <>
                <div className="gu-detail-holdings">
                  <div>
                    <span className="gu-label">보유 수량</span>
                    <span className="gu-num">{hHolding.amt.toLocaleString('ko-KR', {maximumFractionDigits:4})} {selected.ticker}</span>
                  </div>
                  <div>
                    <span className="gu-label">평균 매수가</span>
                    <span className="gu-num">₩{fmtPrice(hHolding.avgPrice)}</span>
                  </div>
                  <div>
                    <span className="gu-label">평가 금액</span>
                    <span className={'gu-num' + (hidden ? ' gu-blur-amt' : '')}>₩{fmt(hHolding.marketValue)}</span>
                  </div>
                  <div>
                    <span className="gu-label">평가 손익</span>
                    <span className={'gu-num ' + (hHolding.pl >= 0 ? 'gu-up' : 'gu-down')}>
                      {fmtSigned(hHolding.pl)} <span style={{fontSize:11, fontWeight:500}}>({fmtPct(hHolding.plPct)})</span>
                    </span>
                  </div>
                </div>
                <div className="gu-card">
                  <LotsPanel h={hHolding} hidden={hidden} onSellLot={(lot, reload) => {
                    setSide('sell');
                    setQty(parseFloat(lot.amt));
                    setPendingLot({ lot, reload });
                    setOrderResult(null);
                    setShowConfirm(true);
                  }}/>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── 오른쪽 패널 (종목 리스트 + 주문) ── */}
      <aside className="gu-trade-sidebar">
        {/* 종목 리스트 */}
        <div className="gu-trade-kind-tabs">
          {KINDS.map(k => (
            <button key={k.id}
              className={'gu-trade-kind-tab' + (kind === k.id ? ' is-active' : '')}
              onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>

        <div className="gu-trade-search">
          <Icon name="search" size={14}/>
          <input type="text" placeholder="종목 검색..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        <div className="gu-trade-list">
          {loadingList ? (
            <div className="gu-trade-list-placeholder">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="gu-trade-list-placeholder">종목 없음</div>
          ) : filtered.map(m => {
            const held = holdings.some(h => h.ticker === m.ticker);
            const isActive = selected?.ticker === m.ticker;
            return (
              <button key={m.ticker}
                className={'gu-trade-list-item' + (isActive ? ' is-active' : '')}
                onClick={() => selectTicker(m)}>
                <div className="gu-trade-list-left">
                  <span className="gu-trade-list-name">
                    {m.name}
                    {held && <span className="gu-trade-held-dot"/>}
                  </span>
                  <span className="gu-trade-list-ticker">{m.ticker}</span>
                </div>
                <div className="gu-trade-list-right">
                  <span className="gu-trade-list-price">₩{fmtPrice(m.price)}</span>
                  <span className={'gu-trade-list-pct ' + (m.daily_pct >= 0 ? 'gu-up' : 'gu-down')}>
                    {m.daily_pct >= 0 ? '+' : ''}{m.daily_pct.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 주문 패널 */}
        {selected && (
          <div className="gu-trade-order-panel">
            <div className="gu-trade-tabs">
              <button className={'gu-trade-tab ' + (side === 'buy' ? 'is-buy-active' : '')}
                onClick={() => setSide('buy')}>매수</button>
              <button className={'gu-trade-tab ' + (side === 'sell' ? 'is-sell-active' : '')}
                onClick={() => setSide('sell')}>매도</button>
            </div>
            <div className="gu-trade-body">
              <div style={{fontSize:11, color:'var(--gu-fg3)', marginBottom:10}}>
                시장가 · 현재가 ₩{fmtPrice(selected.price)}
                {myAmt > 0 && (
                  <span style={{marginLeft:8}}>
                    보유 {myAmt.toLocaleString('ko-KR', {maximumFractionDigits:4})} {selected.ticker}
                  </span>
                )}
              </div>
              <div className="gu-trade-field">
                <span className="gu-label">수량</span>
                <div className="gu-input-affix">
                  <input type="number" value={qty || ''} min="0" step="0.0001"
                    placeholder="0"
                    onChange={e => {
                      const v = +e.target.value;
                      setQty(v);
                      setKrwAmt(+(v * selected.price).toFixed(0));
                    }}/>
                  <span className="gu-input-affix-suf">{selected.ticker}</span>
                </div>
                <span className="gu-label" style={{marginTop:8}}>금액</span>
                <div className="gu-input-affix">
                  <input type="number" value={krwAmt || ''} min="0" step="1000"
                    placeholder="0"
                    onChange={e => {
                      const v = +e.target.value;
                      setKrwAmt(v);
                      setQty(+(v / selected.price).toFixed(8));
                    }}/>
                  <span className="gu-input-affix-suf">원</span>
                </div>
                {myAmt > 0 && side === 'sell' && (
                  <div className="gu-trade-pcts" style={{marginTop:6}}>
                    {[25,50,75,100].map(p => (
                      <button key={p} className="gu-pill gu-pill-outline"
                        onClick={() => {
                          const v = +(myAmt * p / 100).toFixed(8);
                          setQty(v);
                          setKrwAmt(+(v * selected.price).toFixed(0));
                        }}>
                        {p}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className={'gu-btn gu-btn-lg ' + (side === 'buy' ? 'gu-btn-up' : 'gu-btn-down')}
                onClick={() => { setOrderResult(null); setShowConfirm(true); }}
                disabled={ordering || qty <= 0}>
                {ordering ? '주문 중...' : side === 'buy' ? '시장가 매수' : '시장가 매도'}
              </button>
              {orderResult && (
                <div className={'gu-order-result ' + (orderResult.success ? 'is-success' : 'is-error')}>
                  {orderResult.success ? '✓' : '✗'} {orderResult.msg}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* 주문 확인 모달 */}
      {showConfirm && selected && (
        <div className="gu-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="gu-modal gu-order-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="gu-modal-head">
              <div className="gu-h4">주문 확인</div>
              <button className="gu-modal-close" onClick={() => setShowConfirm(false)}>
                <Icon name="close" size={16}/>
              </button>
            </div>
            <div className="gu-order-confirm-body">
              <div className="gu-order-confirm-badge" style={{
                background: side === 'buy' ? 'rgba(242,65,71,.1)' : 'rgba(25,103,210,.1)',
                color: side === 'buy' ? '#F24147' : '#1967D2',
              }}>
                시장가 {side === 'buy' ? '매수' : '매도'}
              </div>
              <div className="gu-order-confirm-asset">
                <span className="gu-order-confirm-name">{selected.name}</span>
                <span className="gu-order-confirm-ticker">{selected.ticker}</span>
              </div>
              <div className="gu-order-confirm-rows">
                <div><span>수량</span><span>{qty.toLocaleString('ko-KR', {maximumFractionDigits:8})} {selected.ticker}</span></div>
                <div><span>현재가</span><span>₩{fmtPrice(selected.price)}</span></div>
                <div className="gu-order-confirm-total">
                  <span>예상금액</span>
                  <span>₩{fmt(total)}</span>
                </div>
              </div>
              <p className="gu-order-confirm-warn">실제 거래소에 주문이 접수됩니다.</p>
            </div>
            <div className="gu-modal-actions">
              <button className="gu-btn gu-btn-ghost" style={{maxWidth:'none'}} onClick={() => setShowConfirm(false)}>취소</button>
              <button
                className={'gu-btn gu-btn-lg ' + (side === 'buy' ? 'gu-btn-up' : 'gu-btn-down')}
                style={{maxWidth:'none', flex:1}}
                onClick={executeOrder}>
                {side === 'buy' ? '매수 확인' : '매도 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function KRXChart({ ticker, theme }) {
  const containerId = `krx_${ticker}`;

  React.useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const isDark = theme === 'dark';
    const chart = LightweightCharts.createChart(container, {
      width:  container.clientWidth,
      height: 460,
      layout: {
        background: { color: isDark ? '#161b22' : '#ffffff' },
        textColor:  isDark ? '#9aa4b0' : '#333',
      },
      grid: {
        vertLines: { color: isDark ? '#21262d' : '#f0f3fa' },
        horzLines: { color: isDark ? '#21262d' : '#f0f3fa' },
      },
      timeScale: { timeVisible: true, borderColor: isDark ? '#21262d' : '#e0e4ef' },
    });

    const CandleSeries = LightweightCharts.CandlestickSeries ?? null;
    const series = CandleSeries
      ? chart.addSeries(CandleSeries, {
          upColor: '#F24147', downColor: '#1967D2',
          borderUpColor: '#F24147', borderDownColor: '#1967D2',
          wickUpColor: '#F24147', wickDownColor: '#1967D2',
        })
      : chart.addCandlestickSeries({
          upColor: '#F24147', downColor: '#1967D2',
          borderUpColor: '#F24147', borderDownColor: '#1967D2',
          wickUpColor: '#F24147', wickDownColor: '#1967D2',
        });

    fetch(`${API_BASE}/api/chart/${ticker}`)
      .then(r => r.json())
      .then(data => { series.setData(data); chart.timeScale().fitContent(); });

    const onResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); };
  }, [ticker, theme]);

  return <div id={containerId} style={{width:'100%', height:460}}/>;
}

function TradingViewChart({ ticker, kind, theme }) {
  const containerId = `tv_${ticker}`;
  const tvSymbol = kind === 'us' ? ticker : `UPBIT:${ticker}KRW`;

  React.useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const init = () => {
      new window.TradingView.widget({
        container_id: containerId,
        symbol: tvSymbol,
        interval: "D",
        theme: theme === "dark" ? "dark" : "light",
        locale: "kr",
        width: "100%", height: 460,
        style: "1",
        timezone: "Asia/Seoul",
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        overrides: {
          "mainSeriesProperties.candleStyle.upColor":         "#F24147",
          "mainSeriesProperties.candleStyle.downColor":       "#1967D2",
          "mainSeriesProperties.candleStyle.borderUpColor":   "#F24147",
          "mainSeriesProperties.candleStyle.borderDownColor": "#1967D2",
          "mainSeriesProperties.candleStyle.wickUpColor":     "#F24147",
          "mainSeriesProperties.candleStyle.wickDownColor":   "#1967D2",
        },
      });
    };

    if (window.TradingView) init();
    else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.onload = init;
      document.head.appendChild(script);
    }
    return () => { container.innerHTML = ''; };
  }, [ticker, theme]);

  return <div id={containerId} style={{height:460}}/>;
}

window.AssetDetail = AssetDetail;
