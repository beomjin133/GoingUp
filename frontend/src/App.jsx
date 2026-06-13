import React from 'react';
import { API_BASE, computeTotals, fmt } from './data';
import Header from './Header';
import Dashboard from './Dashboard';
import AssetDetail from './AssetDetail';
import History from './History';
import AutoBot from './AutoBot';
import TotpLock, { isAuthenticated } from './TotpLock';
import Backtest from './Backtest';

export default function App() {
  const [authed, setAuthed] = React.useState(isAuthenticated());

  const systemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const initial = { tab: "dash", selectedId: null, hideAmounts: false };
  const stored = (() => {
    try {
      const s = JSON.parse(localStorage.getItem("gu-state") || "{}");
      delete s.theme;
      return s;
    } catch { return {}; }
  })();

  const [state, setState]             = React.useState({ ...initial, ...stored, theme: systemTheme() });
  const [holdings, setHoldings]       = React.useState([]);
  const [cashKRW, setCashKRW]         = React.useState(0);
  const [cashByService, setCashByService] = React.useState({});
  const [loading, setLoading]         = React.useState(true);
  const [error, setError]             = React.useState(null);
  const [txRefreshKey, setTxRefreshKey] = React.useState(0);

  React.useEffect(() => {
    localStorage.setItem("gu-state", JSON.stringify(state));
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state]);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => dispatch({ type: "set", key: "theme", value: e.matches ? 'dark' : 'light' });
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 인증 완료 시 데이터 로드
  React.useEffect(() => {
    if (authed) loadData(true);
  }, [authed]);

  React.useEffect(() => {
    if (!authed || holdings.length === 0) return;
    const id = setInterval(refreshPrices, 5000);
    return () => clearInterval(id);
  }, [holdings.length, authed]);

  React.useEffect(() => {
    if (!authed) return;
    const id = setInterval(() => {
      loadData(false);
      setTxRefreshKey(k => k + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [authed]);

  function loadData(showSpinner = false) {
    if (showSpinner) setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_BASE}/api/holdings`).then(r => r.json()),
      fetch(`${API_BASE}/api/balance`).then(r => r.json()),
    ]).then(([holdingsData, balanceData]) => {
      if (holdingsData.length === 0) {
        setHoldings([]);
        setCashKRW(balanceData.krw);
        setCashByService(balanceData.by_service || {});
        setLoading(false);
        return;
      }
      const priceGroups = {};
      holdingsData.filter(h => h.price == null).forEach(h => {
        if (!priceGroups[h.service]) priceGroups[h.service] = [];
        priceGroups[h.service].push(h.ticker);
      });

      const fetchPrices = Object.keys(priceGroups).length > 0
        ? fetch(`${API_BASE}/api/prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(priceGroups),
          }).then(r => r.json())
        : Promise.resolve({});

      return fetchPrices.then(priceData => {
        holdingsData.forEach(h => {
          if (h.price == null) {
            const p = priceData[h.ticker] || { price: 0, daily_pct: 0 };
            h.price     = p.price;
            h.daily_pct = p.daily_pct;
          }
          h.avgPrice    = h.avg_price;
          h.marketValue = h.amt * h.price;
          h.costBasis   = h.amt * h.avg_price;
          h.pl          = h.marketValue - h.costBasis;
          h.plPct       = h.costBasis > 0 ? (h.pl / h.costBasis) * 100 : 0;
        });
        setHoldings(holdingsData);
        setCashKRW(balanceData.krw);
        setCashByService(balanceData.by_service || {});
        if (!state.selectedId && holdingsData.length > 0) {
          setState(s => ({ ...s, selectedId: holdingsData[0].id }));
        }
        setLoading(false);
      });
    }).catch(() => {
      setError("데이터를 불러오지 못했습니다.");
      setLoading(false);
    });
  }

  function refreshPrices() {
    setHoldings(prev => {
      if (prev.length === 0) return prev;
      const priceGroups = {};
      prev.forEach(h => {
        if (!priceGroups[h.service]) priceGroups[h.service] = [];
        priceGroups[h.service].push(h.ticker);
      });
      fetch(`${API_BASE}/api/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priceGroups),
      })
        .then(r => r.json())
        .then(priceData => {
          if (!priceData || typeof priceData !== 'object') return;
          setHoldings(cur => cur.map(h => {
            const p = priceData[h.ticker];
            if (!p) return h;
            const price = p.price;
            const daily_pct = p.daily_pct;
            const marketValue = h.amt * price;
            const pl = marketValue - h.costBasis;
            const plPct = h.costBasis > 0 ? (pl / h.costBasis) * 100 : 0;
            return { ...h, price, daily_pct, marketValue, pl, plPct };
          }));
        });
      return prev;
    });
  }

  function dispatch(a) {
    setState(s => {
      if (a.type === "tab")      return { ...s, tab: a.tab };
      if (a.type === "goDetail") return { ...s, tab: "detail", selectedId: a.id };
      if (a.type === "set")      return { ...s, [a.key]: a.value };
      return s;
    });
  }

  // ── 조건부 렌더링 (모든 훅 이후) ──────────────────────
  if (!authed) return <TotpLock onUnlock={() => setAuthed(true)} />;

  if (loading) return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontSize:16, color:"var(--gu-fg3)"}}>
      불러오는 중...
    </div>
  );

  if (error) return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontSize:16, color:"var(--gu-down)"}}>
      {error}
    </div>
  );

  const data = { holdings, cashKRW, cashByService };

  return (
    <div className="gu-app">
      <Header
        tab={state.tab} setTab={(t) => dispatch({type:"tab", tab:t})}
        total={computeTotals(holdings, cashKRW).total}
        hideAmounts={state.hideAmounts}
        onToggleHide={() => dispatch({type:"set", key:"hideAmounts", value: !state.hideAmounts})}
      />
      {state.tab === "dash"    && <Dashboard  state={state} dispatch={dispatch} data={data} onRefresh={() => { loadData(); setTxRefreshKey(k => k + 1); }}/>}
      {state.tab === "detail"  && <AssetDetail state={state} dispatch={dispatch} data={data} onRefresh={() => { loadData(); setTxRefreshKey(k => k + 1); }}/>}
      {state.tab === "history" && <History    state={state} dispatch={dispatch} holdings={holdings} refreshKey={txRefreshKey}/>}
      {state.tab === "autobot"  && <AutoBot   dispatch={dispatch}/>}
      {state.tab === "backtest" && <Backtest  state={state} dispatch={dispatch}/>}
    </div>
  );
}
