import React from 'react';
import { createChart } from 'lightweight-charts';
import Editor from '@monaco-editor/react';
import { API_BASE, fmt, fmtShortKRW } from './data';
import { Icon } from './components';

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const INTERVALS = [
  { id: 'day',       label: '일봉' },
  { id: 'minute240', label: '4시간봉' },
  { id: 'minute60',  label: '1시간봉' },
  { id: 'minute30',  label: '30분봉' },
  { id: 'week',      label: '주봉' },
];

function MonthlyReturns({ data }) {
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;

  function yearRet(yr) {
    const m = data[yr] || {};
    let c = 1;
    for (let i = 1; i <= 12; i++) if (m[i] != null) c *= (1 + m[i] / 100);
    return Math.round((c - 1) * 1000) / 10;
  }

  function cellBg(v) {
    if (v == null) return 'transparent';
    if (v === 0) return 'var(--gu-bg2)';
    const a = Math.min(0.12 + Math.abs(v) / 40, 0.85);
    return v > 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
  }

  function cellColor(v) {
    if (v == null) return 'var(--gu-fg4)';
    return v > 0 ? '#4ade80' : v < 0 ? '#f87171' : 'var(--gu-fg3)';
  }

  const th = { padding: '5px 8px', fontSize: 11, fontWeight: 600, color: 'var(--gu-fg3)',
    border: '1px solid var(--gu-border)', textAlign: 'right', background: 'var(--gu-bg2)' };
  const td = { padding: '4px 8px', fontSize: 11, border: '1px solid var(--gu-border)',
    textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <div className="gu-card">
      <div className="gu-card-head"><div className="gu-h4">월별 수익률 (%)</div></div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Year</th>
              {MONTH_LABELS.map(m => <th key={m} style={th}>{m}</th>)}
              <th style={{ ...th, color: 'var(--gu-fg1)' }}>Year</th>
            </tr>
          </thead>
          <tbody>
            {years.map(yr => {
              const m = data[yr] || {};
              const yr_v = yearRet(yr);
              return (
                <tr key={yr}>
                  <td style={{ ...td, fontWeight: 600, color: 'var(--gu-fg2)', background: 'var(--gu-bg2)', textAlign: 'left' }}>{yr}</td>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(mo => {
                    const v = m[mo];
                    return (
                      <td key={mo} style={{ ...td, background: cellBg(v), color: cellColor(v) }}>
                        {v != null ? v : ''}
                      </td>
                    );
                  })}
                  <td style={{ ...td, background: cellBg(yr_v), color: cellColor(yr_v), fontWeight: 600 }}>
                    {yr_v}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="gu-kpi" style={{ minWidth: 140 }}>
      <div className="gu-kpi-lbl">{label}</div>
      <div className="gu-kpi-val" style={{ color: color || 'var(--gu-fg1)', fontSize: 22 }}>{value}</div>
      {sub && <div className="gu-kpi-delta" style={{ color: 'var(--gu-fg3)' }}>{sub}</div>}
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function Backtest({ state, dispatch }) {
  const [services,  setServices]  = React.useState([]);
  const [service,   setService]   = React.useState('');
  const [strategy,  setStrategy]  = React.useState('');
  const [strategies, setStrategies] = React.useState([]);
  const [ticker,    setTicker]    = React.useState('BTC');
  const [start,     setStart]     = React.useState(daysAgo(365));
  const [end,       setEnd]       = React.useState(today());
  const [interval,  setInterval]  = React.useState('day');
  const [commission, setCommission] = React.useState(0.05);
  const [slippage,   setSlippage]   = React.useState(0.0);
  const [result,         setResult]         = React.useState(null);
  const [loading,        setLoading]        = React.useState(false);
  const [error,          setError]          = React.useState(null);
  const [showAllTrades,  setShowAllTrades]  = React.useState(false);
  const [priceLegend,    setPriceLegend]    = React.useState([]);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorCode, setEditorCode] = React.useState('');
  const [editorName, setEditorName] = React.useState('');
  const [saving,     setSaving]     = React.useState(false);
  const [saveMsg,    setSaveMsg]    = React.useState('');

  const [exportOpen,   setExportOpen]   = React.useState(false);
  const [exportAmount, setExportAmount] = React.useState(100000);
  const [exportCron,   setExportCron]   = React.useState('0 9 * * *');
  const [exportEnable, setExportEnable] = React.useState(true);
  const [exportMsg,    setExportMsg]    = React.useState('');

  const priceRef      = React.useRef(null);
  const equityRef     = React.useRef(null);
  const priceInst     = React.useRef(null);
  const equityInst    = React.useRef(null);
  const oscRefsMap    = React.useRef({});
  const oscInstsMap   = React.useRef({});
  const crosshairDivs     = React.useRef([]);
  const backdropMouseDown = React.useRef(null);

  function registerAutoTrade() {
    setExportMsg('');
    fetch(`${API_BASE}/api/strategies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy: strategy,
        ticker,
        service,
        amount: exportAmount,
        enabled: exportEnable ? 1 : 0,
        cron: exportCron,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setExportOpen(false); }
        else setExportMsg('오류: ' + (d.msg || '등록 실패'));
      })
      .catch(e => setExportMsg('오류: ' + e));
  }

  // 거래소 목록 로드
  React.useEffect(() => {
    fetch(`${API_BASE}/api/exchanges`)
      .then(r => r.json())
      .then(list => {
        const filtered = list.filter(e => e.kind === 'crypto');
        setServices(filtered);
        if (filtered.length > 0 && !service) setService(filtered[0].exchange);
      });
  }, []);

  // 전략 목록 로드
  React.useEffect(() => {
    if (!service) return;
    fetch(`${API_BASE}/api/strategy-files/${service}`)
      .then(r => r.json())
      .then(list => {
        setStrategies(list);
        if (list.length > 0) setStrategy(list[0]);
      });
  }, [service]);

  // 차트 초기화
  React.useEffect(() => {
    if (!result || !priceRef.current || !equityRef.current) return;

    [priceInst, equityInst].forEach(ref => {
      if (ref.current) { ref.current.remove(); ref.current = null; }
    });
    Object.values(oscInstsMap.current).forEach(c => { try { c.remove(); } catch(e) {} });
    oscInstsMap.current = {};

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg   = isDark ? '#14181D' : '#FFFFFF';
    const fg   = isDark ? '#BFC6CF' : '#454C56';
    const grid = isDark ? '#22272E' : '#EAECEF';

    const baseOpts = {
      layout: { background: { color: bg }, textColor: fg },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      timeScale: { borderColor: grid, fixLeftEdge: true, fixRightEdge: true },
      rightPriceScale: { borderColor: grid },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    };

    // ── 가격 차트 (캔들) ──
    const priceChart = createChart(priceRef.current, { ...baseOpts, height: 480 });
    const priceFormatter = v => {
      if (v >= 1e12)      return (v / 1e12).toFixed(1) + '조';
      if (v >= 1e8)       return (v / 1e8).toFixed(1) + '억';
      if (v >= 1e4)       return Math.round(v / 1e4) + '만';
      return v.toFixed(0);
    };
    const candleSeries = priceChart.addCandlestickSeries({
      upColor: '#F24147', downColor: '#1967D2',
      borderUpColor: '#F24147', borderDownColor: '#1967D2',
      wickUpColor: '#F24147', wickDownColor: '#1967D2',
      priceFormat: { type: 'custom', formatter: priceFormatter, minMove: 1 },
    });
    candleSeries.setData(result.ohlcv);

    // 오버레이 지표 (SMA, EMA, BB)
    const IND_COLORS = ['#F59E0B','#8B5CF6','#06B6D4','#EC4899','#10B981','#F97316'];
    let ci = 0;
    const legend = [];
    const indEntries = Object.entries(result.indicators || {});
    for (const [name, info] of indEntries) {
      if (!info.overlay || !info.data?.length) continue;
      const t = info.type;
      let color;
      if (t === 'BB_U' || t === 'BB_L') color = 'rgba(96,165,250,0.45)';
      else if (t === 'BB_M')            color = 'rgba(147,197,253,0.55)';
      else                              color = IND_COLORS[ci++ % IND_COLORS.length];
      const s = priceChart.addLineSeries({
        color, lineWidth: 1,
        // title 제거: 가격축에 이름 라벨이 붙어 캔들을 가리는 문제 → 좌상단 범례로 대체
        priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false,
      });
      s.setData(info.data);
      legend.push({ name, color });
    }
    setPriceLegend(legend);

    // 매수/매도 마커
    const markers = result.trades.flatMap(t => {
      const m = [{ time: t.entry_time, position: 'belowBar', color: '#F24147', shape: 'arrowUp', text: '매수' }];
      if (!t.open) m.push({ time: t.exit_time, position: 'aboveBar', color: '#1967D2', shape: 'arrowDown', text: '매도' });
      return m;
    }).sort((a, b) => a.time.localeCompare(b.time));
    candleSeries.setMarkers(markers);
    priceChart.timeScale().fitContent();
    priceInst.current = priceChart;

    // ── 수익 곡선 차트 ──
    const equityChart = createChart(equityRef.current, { ...baseOpts, height: 260 });
    const lineSeries = equityChart.addLineSeries({
      color: '#1A55F0', lineWidth: 2,
      priceFormat: { type: 'custom', formatter: fmtShortKRW },
    });
    lineSeries.setData(result.equity_curve);
    if (result.bnh_curve?.length) {
      const bnhSeries = equityChart.addLineSeries({
        color: 'rgba(156,163,175,0.6)', lineWidth: 1,
        lineStyle: 2,  // dashed
        priceFormat: { type: 'custom', formatter: fmtShortKRW },
        lastValueVisible: false, priceLineVisible: false,
      });
      bnhSeries.setData(result.bnh_curve);
    }
    equityChart.timeScale().fitContent();
    equityInst.current = equityChart;

    // ── 보조 지표 차트 (RSI 등) ──
    const oscChartsList = [];
    const chartSeriesMap = new Map([[priceChart, candleSeries], [equityChart, lineSeries]]);
    const priceDataMap  = new Map(result.ohlcv.map(d => [d.time, d.close]));
    const equityDataMap = new Map(result.equity_curve.map(d => [d.time, d.value]));
    const chartDataMap  = new Map([[priceChart, priceDataMap], [equityChart, equityDataMap]]);
    for (const [name, info] of indEntries) {
      if (info.overlay || !info.data?.length) continue;
      const el = oscRefsMap.current[name];
      if (!el) continue;
      const oscChart = createChart(el, { ...baseOpts, height: 150 });
      let primarySeries;
      if (info.type === 'RSI') {
        const rsiLine = oscChart.addLineSeries({
          color: '#A78BFA', lineWidth: 1.5,
          priceLineVisible: false, lastValueVisible: true, title: name,
        });
        rsiLine.setData(info.data);
        rsiLine.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
        const ref = info.data;
        const ob = oscChart.addLineSeries({ color: 'rgba(239,68,68,0.3)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false });
        ob.setData(ref.map(d => ({ time: d.time, value: 70 })));
        const os = oscChart.addLineSeries({ color: 'rgba(34,197,94,0.3)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false });
        os.setData(ref.map(d => ({ time: d.time, value: 30 })));
        primarySeries = rsiLine;
      } else {
        const s = oscChart.addLineSeries({ color: '#60A5FA', lineWidth: 1.5, priceLineVisible: false, title: name });
        s.setData(info.data);
        primarySeries = s;
      }
      chartSeriesMap.set(oscChart, primarySeries);
      chartDataMap.set(oscChart, new Map(info.data.map(d => [d.time, d.value])));
      oscChart.timeScale().fitContent();
      oscInstsMap.current[name] = oscChart;
      oscChartsList.push(oscChart);
    }

    // ── 모든 차트 시간축 동기화 (날짜 기준) ──
    let syncing = false;
    const allCharts = [priceChart, equityChart, ...oscChartsList];
    allCharts.forEach(chart => {
      chart.timeScale().subscribeVisibleTimeRangeChange(range => {
        if (syncing || !range) return;
        syncing = true;
        allCharts.filter(c => c !== chart).forEach(c => c.timeScale().setVisibleRange(range));
        // rAF로 지연 해제 → 비동기로 발생하는 연쇄 이벤트도 차단
        requestAnimationFrame(() => { syncing = false; });
      });
    });

    // ── 크로스헤어 세로줄 동기화 (CSS 오버레이 방식) ──
    // setCrosshairPosition 대신 CSS div를 사용해 차트 내부 이벤트를 전혀 건드리지 않음
    crosshairDivs.current.forEach(d => d.remove());
    crosshairDivs.current = [];

    const chartEls = [
      priceRef.current,
      equityRef.current,
      ...Object.values(oscRefsMap.current).filter(Boolean),
    ];
    chartEls.forEach(el => {
      el.style.position = 'relative';
      const line = document.createElement('div');
      line.style.cssText = [
        'position:absolute', 'top:0', 'bottom:0', 'width:1px',
        'background:rgba(197,203,206,0.5)', 'pointer-events:none',
        'display:none', 'z-index:10', 'transform:translateX(-50%)',
      ].join(';');
      el.appendChild(line);
      crosshairDivs.current.push(line);
    });

    const showLines = (x) => {
      crosshairDivs.current.forEach(l => {
        if (x == null) { l.style.display = 'none'; }
        else { l.style.display = 'block'; l.style.left = x + 'px'; }
      });
    };
    allCharts.forEach(chart => {
      chart.subscribeCrosshairMove(param => {
        showLines(param.point ? param.point.x : null);
      });
    });

    // ── y축 너비 동기화 (렌더링 후 실제 너비를 minimumWidth로 맞춤) ──
    const syncYWidth = () => {
      const widths = allCharts.map(c => { try { return c.priceScale('right').width(); } catch { return 0; } });
      const maxW = Math.max(...widths);
      if (maxW > 0) allCharts.forEach(c => c.applyOptions({ rightPriceScale: { minimumWidth: maxW } }));
    };
    setTimeout(syncYWidth, 50);
    setTimeout(syncYWidth, 300);

    // 리사이즈 대응
    const obs = new ResizeObserver(() => {
      if (priceRef.current)  priceChart.applyOptions({ width: priceRef.current.clientWidth });
      if (equityRef.current) equityChart.applyOptions({ width: equityRef.current.clientWidth });
      Object.entries(oscInstsMap.current).forEach(([n, c]) => {
        const el = oscRefsMap.current[n];
        if (el) c.applyOptions({ width: el.clientWidth });
      });
    });
    obs.observe(priceRef.current);
    return () => obs.disconnect();
  }, [result]);

  function openEditor(name) {
    const n = name || strategy || 'my_strategy';
    setEditorName(n);
    setEditorOpen(true);
    fetch(`${API_BASE}/api/backtest/strategy/${service}/${n}`)
      .then(r => r.json())
      .then(d => setEditorCode(d.code));
  }

  function newStrategy() {
    setEditorName('');
    setEditorOpen(true);
    fetch(`${API_BASE}/api/backtest/strategy/${service}/__template__`)
      .then(r => r.json())
      .then(d => setEditorCode(d.code));
  }

  function saveStrategy(andRun = false) {
    setSaving(true);
    setSaveMsg('');
    fetch(`${API_BASE}/api/backtest/strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, name: editorName, code: editorCode }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setSaveMsg('오류: ' + d.error); return; }
        setSaveMsg('저장 완료');
        // 전략 목록 갱신 후 선택
        fetch(`${API_BASE}/api/strategy-files/${service}`)
          .then(r => r.json())
          .then(list => {
            setStrategies(list);
            setStrategy(editorName);
          });
        if (andRun) setTimeout(() => runBacktest(editorName), 300);
      })
      .catch(e => setSaveMsg('오류: ' + e))
      .finally(() => setSaving(false));
  }

  function runBacktest(overrideStrategy) {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowAllTrades(false);
    fetch(`${API_BASE}/api/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, strategy: overrideStrategy || strategy, ticker, start, end, interval, commission, slippage }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setResult(data);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  const s = result?.stats;

  return (
    <main className="gu-page gu-fade-in">
      <div className="gu-page-head">
        <div className="gu-page-head-left">
          <div className="gu-breadcrumb">
            <button onClick={() => dispatch({ type: 'tab', tab: 'dash' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}>
              대시보드
            </button>
            <span className="gu-breadcrumb-sep"><Icon name="chevron_right" size={12} /></span>
            <span>백테스트</span>
          </div>
          <h2 className="gu-h2">백테스트</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

        {/* 설정 패널 */}
        <div className="gu-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="gu-h4">설정</div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>거래소</span>
            <select className="gu-input" value={service} onChange={e => setService(e.target.value)}>
              {services.map(s => <option key={s.exchange} value={s.exchange}>{s.name}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>전략</span>
              <button className="gu-btn gu-btn-ghost gu-btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={newStrategy} title="새 전략 만들기">
                <Icon name="add" size={13}/> 새 전략
              </button>
            </div>
            {strategies.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--gu-fg4)', padding: '8px 0', textAlign: 'center' }}>
                전략이 없습니다.<br/>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gu-accent)', fontSize: 12, padding: 0, marginTop: 4 }}
                  onClick={newStrategy}>+ 첫 번째 전략 만들기</button>
              </div>
            ) : (
              <select className="gu-input" value={strategy} onChange={e => setStrategy(e.target.value)}>
                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>종목</span>
            <input className="gu-input" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="BTC" />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>기간</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['1달', 30], ['3달', 90], ['1년', 365], ['전체', 365 * 10]].map(([label, days]) => (
                <button key={label} className="gu-btn gu-btn-ghost gu-btn-sm"
                  style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                  onClick={() => { setStart(daysAgo(days)); setEnd(today()); }}>
                  {label}
                </button>
              ))}
            </div>
            <input className="gu-input" type="date" value={start} onChange={e => setStart(e.target.value)} />
            <input className="gu-input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>실행 주기</span>
            <select className="gu-input" value={interval} onChange={e => setInterval(e.target.value)}>
              {INTERVALS.map(iv => <option key={iv.id} value={iv.id}>{iv.label}</option>)}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>수수료 (%)</span>
              <input className="gu-input" type="number" min="0" step="0.01" value={commission}
                onChange={e => setCommission(Number(e.target.value))} placeholder="0.05" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>슬리피지 (%)</span>
              <input className="gu-input" type="number" min="0" step="0.01" value={slippage}
                onChange={e => setSlippage(Number(e.target.value))} placeholder="0.00" />
            </label>
          </div>

<button className="gu-btn gu-btn-primary" style={{ justifyContent: 'center' }}
            onClick={() => runBacktest()} disabled={loading || !strategy}>
            {loading ? '실행 중...' : '▶ 백테스트 실행'}
          </button>

          <button className="gu-btn gu-btn-ghost gu-btn-sm" style={{ justifyContent: 'center' }}
            onClick={() => openEditor(strategy)}>
            <Icon name="settings" size={13}/> 전략 코드 편집
          </button>
        </div>

        {/* 결과 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div className="gu-card" style={{ color: 'var(--gu-danger)', fontSize: 13 }}>
              오류: {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="gu-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gu-fg4)' }}>
              설정 후 백테스트를 실행하세요
            </div>
          )}

          {loading && (
            <div className="gu-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gu-fg3)' }}>
              백테스트 실행 중...
            </div>
          )}

          {result && (
            <>
              {/* 통계 카드 */}
              <div className="gu-history-kpis">
                <StatCard label="총 수익률"
                  value={`${s.return_pct > 0 ? '+' : ''}${s.return_pct}%`}
                  color={s.return_pct >= 0 ? 'var(--gu-up)' : 'var(--gu-down)'} />
                <StatCard label="연 수익률"
                  value={`${s.annual_return_pct > 0 ? '+' : ''}${s.annual_return_pct}%`}
                  color={s.annual_return_pct >= 0 ? 'var(--gu-up)' : 'var(--gu-down)'} />
                <StatCard label="최대 낙폭"
                  value={`${s.max_drawdown_pct}%`}
                  color="var(--gu-down)" />
                <StatCard label="승률"
                  value={`${s.win_rate}%`} />
                <StatCard label="거래 횟수"
                  value={`${s.num_trades}회`} />
                <StatCard label="샤프 비율"
                  value={s.sharpe_ratio} />
              </div>

              {/* 자동매매 등록 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="gu-btn gu-btn-primary gu-btn-sm"
                  onClick={() => { setExportMsg(''); setExportOpen(true); }}>
                  <Icon name="plus" size={12}/>자동매매 등록
                </button>
              </div>

              {/* 월별 수익률 */}
              {result.monthly_returns && Object.keys(result.monthly_returns).length > 0 && (
                <MonthlyReturns data={result.monthly_returns} />
              )}

              {/* 가격 차트 */}
              <div className="gu-card">
                <div className="gu-card-head">
                  <div className="gu-h4">{ticker} 가격</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--gu-fg3)', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F24147', display: 'inline-block' }}/> 매수
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1967D2', display: 'inline-block' }}/> 매도
                    </span>
                  </div>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div ref={priceRef} style={{ width: '100%' }} />
                  {priceLegend.length > 0 && (
                    <div style={{
                      position: 'absolute', top: 8, left: 10, zIndex: 5,
                      display: 'flex', flexDirection: 'column', gap: 2,
                      pointerEvents: 'none',
                    }}>
                      {priceLegend.map(({ name, color }) => (
                        <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 600, color: 'var(--gu-fg2)',
                          textShadow: '0 0 3px var(--gu-bg1), 0 0 3px var(--gu-bg1)' }}>
                          <span style={{ width: 14, height: 2, background: color, display: 'inline-block', borderRadius: 1 }}/>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 보조 지표 차트 (RSI 등) */}
              {Object.entries(result.indicators || {})
                .filter(([, v]) => !v.overlay && v.data?.length)
                .map(([name, info]) => (
                  <div className="gu-card" key={name}>
                    <div className="gu-card-head">
                      <div className="gu-h4">{name}</div>
                    </div>
                    <div ref={el => { if (el) oscRefsMap.current[name] = el; }} style={{ width: '100%' }} />
                  </div>
                ))
              }

              {/* 수익 곡선 */}
              <div className="gu-card">
                <div className="gu-card-head">
                  <div className="gu-h4">수익 곡선</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--gu-fg3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 20, height: 2, background: '#1A55F0', display: 'inline-block' }}/>
                      전략
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 20, height: 2, background: 'rgba(156,163,175,0.6)', display: 'inline-block', borderTop: '2px dashed rgba(156,163,175,0.6)' }}/>
                      단순보유
                    </span>
                  </div>
                </div>
                <div ref={equityRef} style={{ width: '100%' }} />
              </div>

              {/* 거래 내역 */}
              <div className="gu-card">
                <div className="gu-card-head" style={{ cursor: result.trades.length > 5 ? 'pointer' : 'default' }}
                  onClick={() => result.trades.length > 5 && setShowAllTrades(v => !v)}>
                  <div className="gu-h4">거래 내역 ({result.trades.length}건)</div>
                  {result.trades.length > 5 && (
                    <span style={{ fontSize: 11, color: 'var(--gu-fg4)' }}>
                      {showAllTrades ? '접기' : `+${result.trades.length - 5}건 더보기`}
                    </span>
                  )}
                </div>
                <table className="gu-table">
                  <thead>
                    <tr>
                      <th>진입일</th>
                      <th>청산일</th>
                      <th>진입가</th>
                      <th>청산가</th>
                      <th>수량</th>
                      <th>손익</th>
                      <th>수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gu-fg3)', padding: 32 }}>거래 없음</td></tr>
                    ) : (showAllTrades ? result.trades : result.trades.slice(-5)).map((t, i) => (
                      <tr key={i} style={t.open ? { opacity: 0.7 } : {}}>
                        <td style={{ color: 'var(--gu-fg3)', fontSize: 12 }}>{t.entry_time}</td>
                        <td style={{ color: 'var(--gu-fg3)', fontSize: 12 }}>
                          {t.open ? <span style={{ color: 'var(--gu-warn, #F59E0B)', fontSize: 11 }}>보유중</span> : t.exit_time}
                        </td>
                        <td>₩{fmt(t.entry_price)}</td>
                        <td>{t.open ? '-' : `₩${fmt(t.exit_price)}`}</td>
                        <td style={{ color: 'var(--gu-fg3)' }}>{t.size}</td>
                        <td className={t.pnl >= 0 ? 'gu-up' : 'gu-down'} style={{ fontWeight: 600 }}>
                          {t.open ? '-' : `${t.pnl >= 0 ? '+' : ''}₩${fmt(t.pnl)}`}
                        </td>
                        <td className={t.pnl_pct >= 0 ? 'gu-up' : 'gu-down'}>
                          {t.open ? '-' : `${t.pnl_pct >= 0 ? '+' : ''}${t.pnl_pct}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 전략 에디터 */}
      {editorOpen && (
        <div className="gu-card" style={{ marginTop: 16 }}>
          <div className="gu-card-head">
            <div className="gu-h4">{editorName ? `전략 편집 — ${editorName}` : '새 전략 만들기'}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="gu-input"
                style={{ width: 160, fontSize: 13 }}
                placeholder="전략 이름 (영문, 필수)"
                value={editorName}
                onChange={e => setEditorName(e.target.value)}
              />
              <button className="gu-btn gu-btn-ghost gu-btn-sm"
                onClick={() => saveStrategy(false)} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
              <button className="gu-btn gu-btn-primary gu-btn-sm"
                onClick={() => saveStrategy(true)} disabled={saving || loading}>
                저장 & 실행
              </button>
              {saveMsg && (
                <span style={{ fontSize: 12, color: saveMsg.startsWith('오류') ? 'var(--gu-danger)' : 'var(--gu-success)' }}>
                  {saveMsg}
                </span>
              )}
              <button onClick={() => setEditorOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gu-fg4)', marginLeft: 4 }}>
                <Icon name="close" size={16}/>
              </button>
            </div>
          </div>
          <div style={{ border: '1px solid var(--gu-border)', borderRadius: 'var(--gu-r-md)', overflow: 'hidden' }}>
            <Editor
              height="480px"
              language="python"
              theme={state.theme === 'dark' ? 'vs-dark' : 'light'}
              value={editorCode}
              onChange={v => setEditorCode(v || '')}
              options={{
                fontSize: 13,
                fontFamily: 'var(--gu-font-mono)',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                tabSize: 4,
                wordWrap: 'on',
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gu-fg4)', lineHeight: 1.7 }}>
            지표: <code>SMA(n)</code> · <code>EMA(n)</code> · <code>RSI(n)</code> · <code>BB(n, std)</code> · <code>SUPERT(period, mult)</code> · <code>FGI()</code>
            &nbsp;|&nbsp;
            추가 지표: <code>ATR(n)</code> · <code>ADX(n)</code>→.adx/.plus_di/.minus_di · <code>MACD(f,s,sig)</code>→.macd/.signal/.hist · <code>DONCHIAN(n)</code>→.upper/.lower/.mid · <code>KELTNER(n,mult)</code>→.upper/.lower/.mid · <code>STOCH(k,d)</code>→.k/.d · <code>ZIGZAG(dev)</code>→.dir/.pivot/.prev/.leg (엘리어트 스윙)
            &nbsp;|&nbsp;
            차트: <code>plt(지표)</code> · <code>plt(지표, overlay=False)</code>
            &nbsp;|&nbsp;
            조건: <code>crossover(a, b)</code> · <code>crossunder(a, b)</code>
            &nbsp;|&nbsp;
            주문: <code>buy()</code> · <code>sell()</code>
            &nbsp;|&nbsp;
            변수: <code>close</code> · <code>open</code> · <code>high</code> · <code>low</code> · <code>position</code>
          </div>
        </div>
      )}

      {/* 자동매매 등록 모달 */}
      {exportOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onMouseDown={e => {
            backdropMouseDown.current = e.target === e.currentTarget
              ? { x: e.clientX, y: e.clientY } : null;
          }}
          onClick={e => {
            const down = backdropMouseDown.current;
            if (!down || e.target !== e.currentTarget) return;
            if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) setExportOpen(false);
          }}
        >
          <div className="gu-card" style={{ width: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="gu-card-head">
              <div className="gu-h4">자동매매 등록</div>
              <button onClick={() => setExportOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gu-fg4)' }}>
                <Icon name="close" size={16}/>
              </button>
            </div>

            {/* 읽기 전용 정보 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['전략', strategy], ['종목', ticker], ['거래소', service]].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--gu-fg3)' }}>{lbl}</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--gu-border)', margin: 0 }}/>

            {/* 설정 */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>투자금액 (원)</span>
              <input className="gu-input" type="number" value={exportAmount}
                onChange={e => setExportAmount(Number(e.target.value))} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--gu-fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>실행 주기</span>
              <select className="gu-input" value={exportCron} onChange={e => setExportCron(e.target.value)}>
                <option value="0 9 * * *">매일 오전 9시</option>
                <option value="0 0 * * *">매일 자정</option>
                <option value="0 * * * *">매시간</option>
                <option value="0 9 * * 1">매주 월요일 오전 9시</option>
                <option value="* * * * *">매분 (테스트)</option>
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={exportEnable} onChange={e => setExportEnable(e.target.checked)} />
              <span>등록 즉시 활성화</span>
            </label>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="gu-btn gu-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={registerAutoTrade} disabled={!!exportMsg.startsWith('✓')}>
                <Icon name="rocket_launch" size={14}/> 등록하기
              </button>
              <button className="gu-btn gu-btn-ghost" onClick={() => setExportOpen(false)}>
                취소
              </button>
            </div>

            {exportMsg && (
              <div style={{ fontSize: 13, color: exportMsg.startsWith('✓') ? 'var(--gu-success, #22c55e)' : 'var(--gu-danger)', textAlign: 'center' }}>
                {exportMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
