import React from 'react';
import { API_BASE, computeTotals, makeEquityCurve, fmt, fmtPrice, fmtPct, fmtSigned, fmtShortKRW } from './data';
import { Icon, AssetLogo, KindTag, AreaChart, Donut } from './components';
import ConnectAssetModal from './ConnectAssetModal';
import CashFlowModal from './CashFlowModal';

// 스냅샷(일 단위)을 타임프레임 단위로 묶기 위한 그룹 키.
// 같은 키끼리 묶고 각 구간의 마지막(종가) 값만 남긴다.
function bucketKey(dateStr, tf) {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  if (tf === '1W') {
    const off = (d.getDay() + 6) % 7;              // 월요일 시작 주
    d.setDate(d.getDate() - off);
    return 'W' + d.toISOString().slice(0, 10);
  }
  if (tf === '1M') return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (tf === '3M') return `${y}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (tf === '1Y') return `${y}`;
  return dateStr;                                   // 1D, ALL → 일 단위(그대로)
}

// 각 구간의 대표 라벨(구간 기준값). 주는 시작일(월), 월/분기/연은 해당 기간.
function bucketLabel(dateStr, tf) {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const p = n => String(n).padStart(2, '0');
  if (tf === '1W') {
    const off = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - off);                   // 그 주 월요일
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  if (tf === '1M') return `${y}-${p(d.getMonth() + 1)}`;
  if (tf === '3M') return `${y}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (tf === '1Y') return `${y}`;
  return dateStr;                                   // 1D, ALL
}

export default function Dashboard({ state, dispatch, data, onRefresh }) {
  const { holdings, cashKRW, cashByService = {} } = data;
  const { total, byKind } = computeTotals(holdings, cashKRW);
  const dayDelta = holdings.reduce((s, h) => s + (h.marketValue * h.daily_pct / 100), 0);
  const dayPct = (dayDelta / total) * 100;
  const totalPL = holdings.reduce((s, h) => s + h.pl, 0);
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalPLPct = (totalPL / totalCost) * 100;
  const [tf, setTf] = React.useState("1D");
  const [snapshots, setSnapshots] = React.useState([]);
  const [netFlow, setNetFlow] = React.useState(0);  // 기준일 이후 순입금 (오늘 지점 보정용)
  const [chartRefresh, setChartRefresh] = React.useState(0);

  // 전체 기록을 한 번에 받아두고, 타임프레임은 '묶는 단위'로만 사용한다.
  React.useEffect(() => {
    fetch(`${API_BASE}/api/portfolio/chart?days=3650`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.points)) {
          setSnapshots(data.points);
          setNetFlow(data.net_flow_today || 0);
        } else { setSnapshots([]); setNetFlow(0); }
      });
  }, [chartRefresh]);

  // 곡선은 '입출금 효과 제거' 보정값. 오늘 지점도 순입금만큼 차감해 계단 제거.
  // 실제 스냅샷이 없으면 가짜 곡선(makeEquityCurve) 대신 현재 총자산 평평선으로 정직하게 표시.
  // 선택한 단위로 스냅샷을 묶어 각 구간의 마지막(종가) 값만 남긴다.
  const bucketed = React.useMemo(() => {
    if (!snapshots.length) return [];
    const m = new Map();
    for (const s of snapshots) m.set(bucketKey(s.date, tf), s);  // 오름차순 → 마지막이 종가
    return [...m.values()].map(s => ({ value: s.value, label: bucketLabel(s.date, tf) }));
  }, [snapshots, tf]);

  const equity = React.useMemo(() => {
    if (bucketed.length >= 1) return [...bucketed.map(d => d.value), total - netFlow];
    return [total, total];
  }, [bucketed, total, netFlow]);

  const equityLabels = React.useMemo(() => {
    if (bucketed.length >= 1) return [...bucketed.map(d => d.label), '오늘'];
    return [];
  }, [bucketed]);

  const [cashExpanded, setCashExpanded] = React.useState(false);
  const [showConnectModal, setShowConnectModal] = React.useState(false);
  const [showCashFlow, setShowCashFlow] = React.useState(false);
  const [connections, setConnections] = React.useState([]);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hidden = state.hideAmounts;
  const isUp = dayDelta >= 0;

  const formatTime = (date) => {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} KST`;
  };

  const allocSlices = [
    { label: "코인",    value: byKind.crypto, color: "#F59E0B" },
    { label: "한국주식", value: byKind.equity, color: "#1A55F0" },
    { label: "해외주식", value: byKind.us,     color: "#8B5CF6" },
    { label: "예수금",   value: byKind.cash,   color: "#9AA4B0" },
  ];

  return (
    <main className="gu-page gu-fade-in">
      <div className="gu-page-head">
        <div className="gu-page-head-left">
          <div className="gu-breadcrumb">
            <span>{formatTime(currentTime)} · 실시간</span>
          </div>
          <h2 className="gu-h2">포트폴리오 대시보드</h2>
        </div>
        <div className="gu-page-actions">
          <button className="gu-btn gu-btn-ghost gu-btn-sm" onClick={onRefresh}><Icon name="refresh" size={13}/> 새로고침</button>
          <button className="gu-btn gu-btn-ghost gu-btn-sm" onClick={() => setShowCashFlow(true)}>
            <Icon name="download" size={13}/> 입출금
          </button>
          <button className="gu-btn gu-btn-secondary gu-btn-sm" onClick={() => setShowConnectModal(true)}>
            <Icon name="link" size={13}/> 자산 연결
          </button>
        </div>
      </div>

      <div className="gu-hero">
        <div className={"gu-hero-main " + (isUp ? "is-up" : "is-down")}>
          <div className="gu-hero-tfpills">
            {["1D","1W","1M","3M","1Y","ALL"].map(t => (
              <button key={t} className={tf === t ? "is-active" : ""} onClick={() => setTf(t)}>{t}</button>
            ))}
          </div>
          <div className="gu-hero-label">총 자산</div>
          <div className={"gu-hero-num" + (hidden ? " gu-blur-amt" : "")}>
            <span className="gu-ccy">₩</span>{fmt(total)}
          </div>
          <div className="gu-hero-delta-row">
            <span className={"gu-hero-delta-chip " + (isUp ? "is-up" : "is-down")}>
              {isUp ? "▲" : "▼"} {fmtPct(dayPct)}
            </span>
            <span className={isUp ? "gu-up" : "gu-down"}>
              <span className={hidden ? "gu-blur-amt" : ""}>{fmtSigned(dayDelta)}</span>
              {' '}<span style={{color: "var(--gu-fg3)", fontWeight: 400}}>오늘</span>
            </span>
            <span style={{color: "var(--gu-fg3)", fontWeight: 500, fontSize: 12}}>
              총 수익 <span className={(totalPL >= 0 ? "gu-up" : "gu-down") + (hidden ? " gu-blur-amt" : "")}>
                {fmtSigned(totalPL)} ({fmtPct(totalPLPct)})
              </span>
            </span>
          </div>
          <AreaChart data={equity} height={130} color={isUp ? "#F24147" : "#1967D2"} fillOpacity={0.10} labels={equityLabels} />
        </div>

        <div className="gu-hero-aside">
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
            <div className="gu-h4">자산 배분</div>
            <div className="gu-caption">{holdings.length}개 종목</div>
          </div>
          <div className="gu-alloc-top">
            <Donut slices={allocSlices} size={140} thickness={22}
              centerLabel="총 자산" centerValue={hidden ? "••••" : fmtShortKRW(total)}/>
            <div className="gu-alloc-legend">
              {allocSlices.map((s, i) => (
                <div key={i} className="gu-alloc-row">
                  <span className="gu-alloc-dot" style={{background: s.color}}/>
                  <span className="gu-alloc-lbl">{s.label}</span>
                  <span className="gu-alloc-val">{((s.value / total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="gu-kpi-grid">
        {[
          { label: "코인",    v: byKind.crypto, pct: byKind.crypto / total * 100, color: "#F59E0B" },
          { label: "한국주식", v: byKind.equity, pct: byKind.equity / total * 100, color: "#1A55F0" },
          { label: "해외주식", v: byKind.us,     pct: byKind.us / total * 100,     color: "#8B5CF6" },
        ].map((k, i) => (
          <div key={i} className="gu-kpi">
            <div className="gu-kpi-lbl" style={{display: "flex", alignItems: "center", gap: 6}}>
              <span style={{width: 8, height: 8, background: k.color, borderRadius: 2, display: "inline-block"}}/>
              {k.label}
            </div>
            <div className={"gu-kpi-val" + (hidden ? " gu-blur-amt" : "")}>₩{fmt(k.v)}</div>
            <div className="gu-kpi-delta" style={{color: "var(--gu-fg3)"}}>비중 {k.pct.toFixed(1)}%</div>
          </div>
        ))}

        <div className={"gu-kpi gu-kpi-clickable" + (cashExpanded ? " is-expanded" : "")}
          onClick={() => setCashExpanded(v => !v)}>
          <div className="gu-kpi-lbl" style={{display: "flex", alignItems: "center", gap: 6}}>
            <span style={{width: 8, height: 8, background: "#6B7684", borderRadius: 2, display: "inline-block"}}/>
            예수금
            <span className={"gu-kpi-chevron" + (cashExpanded ? " is-open" : "")}>▾</span>
          </div>
          <div className={"gu-kpi-val" + (hidden ? " gu-blur-amt" : "")}>₩{fmt(byKind.cash)}</div>
          <div className="gu-kpi-delta" style={{color: "var(--gu-fg3)"}}>비중 {(byKind.cash / total * 100).toFixed(1)}%</div>
          {cashExpanded && (
            <div className="gu-kpi-breakdown">
              {Object.entries(cashByService).filter(([, v]) => v > 0).map(([svc, v]) => (
                <div key={svc} className="gu-kpi-breakdown-row">
                  <span className="gu-kpi-breakdown-dot" style={{background: SERVICE_COLORS[svc] || "#9AA4B0"}}/>
                  <span className="gu-kpi-breakdown-label">{SERVICE_LABEL[svc] || svc}</span>
                  <span className={"gu-kpi-breakdown-val" + (hidden ? " gu-blur-amt" : "")}>₩{fmt(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AssetDonutSection holdings={holdings} total={total} hidden={hidden} cashKRW={cashKRW} cashByService={cashByService} />

      <HoldingsTable state={state} dispatch={dispatch} holdings={holdings} cashKRW={cashKRW} onRefresh={onRefresh} />

      {showConnectModal && (
        <ConnectAssetModal
          onClose={() => setShowConnectModal(false)}
          connections={connections}
          onConnect={(data) => setConnections(prev => [...prev, data])}
          onRemoveConnection={(idx) => setConnections(prev => prev.filter((_, i) => i !== idx))}
        />
      )}
      {showCashFlow && (
        <CashFlowModal
          onClose={() => setShowCashFlow(false)}
          onChanged={() => setChartRefresh(c => c + 1)}
        />
      )}
    </main>
  );
}

const SERVICE_COLORS = {
  upbit: "#F59E0B",
  kis:   "#1A55F0",
};
const SERVICE_LABEL = {
  upbit: "업비트",
  kis:   "한국투자",
};

function AssetDonutSection({ holdings, total, hidden, cashKRW, cashByService = {} }) {
  const KINDS = [
    { id: "crypto", label: "코인",    color: "#F59E0B" },
    { id: "equity", label: "한국주식", color: "#1A55F0" },
    { id: "us",     label: "해외주식", color: "#8B5CF6" },
  ];
  const cashColor = "#9AA4B0";
  const cashEntries = Object.entries(cashByService).filter(([, v]) => v > 0);

  return (
    <div className="gu-donut-grid">
      {KINDS.map(k => {
        const items = holdings.filter(h => h.kind === k.id).sort((a, b) => b.marketValue - a.marketValue);
        const kindTotal = items.reduce((s, h) => s + h.marketValue, 0);

        if (items.length === 0) return (
          <div key={k.id} className="gu-donut-card gu-donut-card-empty">
            <div className="gu-donut-card-title">
              <span className="gu-donut-card-dot" style={{background: k.color}}/>{k.label}
            </div>
            <span>보유 종목 없음</span>
          </div>
        );

        const TOP = 5;
        const topItems  = items.slice(0, TOP);
        const restItems = items.slice(TOP);
        const restTotal = restItems.reduce((s, h) => s + h.marketValue, 0);
        const slices = [
          ...topItems.map(h => ({ label: h.name, value: h.marketValue, color: h.color })),
          ...(restTotal > 0 ? [{ label: "기타", value: restTotal, color: "var(--gu-fg4, #555)" }] : []),
        ];

        return (
          <div key={k.id} className="gu-donut-card">
            <div className="gu-donut-card-title">
              <span className="gu-donut-card-dot" style={{background: k.color}}/>{k.label}
              <span className="gu-donut-card-count">{items.length}종목</span>
            </div>
            <div className="gu-donut-card-body">
              <Donut slices={slices} size={110} thickness={17}
                centerLabel={k.label} centerValue={hidden ? "••••" : fmtShortKRW(kindTotal)}/>
              <div className="gu-donut-legend">
                {topItems.map((h, i) => (
                  <div key={i} className="gu-donut-legend-row">
                    <span className="gu-donut-legend-dot" style={{background: h.color}}/>
                    <span className="gu-donut-legend-name" title={h.name}>{h.name}</span>
                    <span className="gu-donut-legend-pct">{((h.marketValue / kindTotal) * 100).toFixed(1)}%</span>
                  </div>
                ))}
                {restItems.length > 0 && (
                  <div className="gu-donut-legend-row">
                    <span className="gu-donut-legend-dot" style={{background: "var(--gu-fg4, #555)"}}/>
                    <span className="gu-donut-legend-name">기타 {restItems.length}종목</span>
                    <span className="gu-donut-legend-pct">{((restTotal / kindTotal) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="gu-donut-card-footer">
              <span style={{color: "var(--gu-fg3)"}}>전체 비중</span>
              <span style={{fontFamily: "var(--gu-font-mono)", fontWeight: 700, color: k.color}}>
                {((kindTotal / total) * 100).toFixed(1)}%
              </span>
              <span className={"gu-donut-card-footer-total" + (hidden ? " gu-blur-amt" : "")}>
                ₩{fmt(kindTotal)}
              </span>
            </div>
          </div>
        );
      })}

      {cashKRW > 0 ? (
        <div className="gu-donut-card">
          <div className="gu-donut-card-title">
            <span className="gu-donut-card-dot" style={{background: cashColor}}/> 예수금
            <span className="gu-donut-card-count">{cashEntries.length}개 거래소</span>
          </div>
          <div className="gu-donut-card-body">
            <Donut
              slices={cashEntries.map(([svc, v]) => ({
                label: SERVICE_LABEL[svc] || svc,
                value: v,
                color: SERVICE_COLORS[svc] || cashColor,
              }))}
              size={110} thickness={17}
              centerLabel="예수금" centerValue={hidden ? "••••" : fmtShortKRW(cashKRW)}
            />
            <div className="gu-donut-legend">
              {cashEntries.map(([svc, v]) => (
                <div key={svc} className="gu-donut-legend-row">
                  <span className="gu-donut-legend-dot" style={{background: SERVICE_COLORS[svc] || cashColor}}/>
                  <span className="gu-donut-legend-name">{SERVICE_LABEL[svc] || svc}</span>
                  <span className="gu-donut-legend-pct">{((v / cashKRW) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gu-donut-card-footer">
            <span style={{color:"var(--gu-fg3)"}}>전체 비중</span>
            <span style={{fontFamily:"var(--gu-font-mono)", fontWeight:700, color: cashColor}}>
              {((cashKRW / total) * 100).toFixed(1)}%
            </span>
            <span className={"gu-donut-card-footer-total" + (hidden ? " gu-blur-amt" : "")}>
              ₩{fmt(cashKRW)}
            </span>
          </div>
        </div>
      ) : (
        <div className="gu-donut-card gu-donut-card-empty">
          <div className="gu-donut-card-title">
            <span className="gu-donut-card-dot" style={{background: cashColor}}/> 예수금
          </div>
          <span>예수금 없음</span>
        </div>
      )}
    </div>
  );
}

function HoldingsTable({ state, dispatch, holdings, cashKRW, onRefresh }) {
  const [filter, setFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("weight");
  const [expanded, setExpanded] = React.useState(() => new Set());
  const { total } = computeTotals(holdings, cashKRW);
  const hidden = state.hideAmounts;
  const [lotSell, setLotSell] = React.useState(null);
  const [lotResult, setLotResult] = React.useState(null);
  const SERVICE_MAP = { crypto: 'upbit', equity: 'kis', us: 'kis' };

  function executeLotSell() {
    if (!lotSell) return;
    const { lot, h, reload } = lotSell;
    setLotSell(null); setLotResult(null);
    fetch(`${API_BASE}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: SERVICE_MAP[h.kind] || h.kind,
        side: 'sell', ticker: h.ticker, name: h.name,
        kind: h.kind, price: h.price, qty: parseFloat(lot.amt),
      }),
    })
      .then(r => r.json())
      .then(res => {
        setLotResult(res);
        if (res.success) {
          fetch(`${API_BASE}/api/lots/${lot.id}`, { method: 'DELETE' });
          reload();
          if (onRefresh) onRefresh();
        }
      })
      .catch(e => setLotResult({ success: false, msg: String(e) }));
  }

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const rows = holdings
    .filter(h => filter === "all" ? true : h.kind === filter)
    .sort((a, b) => {
      if (sortBy === "weight") return b.marketValue - a.marketValue;
      if (sortBy === "pl")     return b.plPct - a.plPct;
      if (sortBy === "day")    return b.daily_pct - a.daily_pct;
      return 0;
    });

  return (
    <>
    <div className="gu-card">
      <div className="gu-card-head">
        <div>
          <div className="gu-h4">보유 종목</div>
          <div className="gu-card-sub" style={{marginTop: 2}}>{rows.length}개 · 클릭하면 상세 보기</div>
        </div>
        <div className="gu-filters">
          {[
            {id:"all", label:"전체"}, {id:"crypto", label:"코인"},
            {id:"equity", label:"한국주식"}, {id:"us", label:"해외주식"},
          ].map(f => (
            <button key={f.id}
              className={"gu-pill gu-pill-outline" + (filter === f.id ? " is-active" : "")}
              onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
          <div style={{width: 8}}/>
          <select className="gu-input" style={{width: 130, height: 30, fontSize: 12, paddingRight: 8}}
                  value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="weight">비중 높은순</option>
            <option value="pl">수익률 높은순</option>
            <option value="day">오늘 변동</option>
          </select>
        </div>
      </div>
      <div className="gu-holdings-wrap">
        <table className="gu-table">
          <thead>
            <tr>
              <th style={{width: "26%"}}>종목</th>
              <th>보유수량</th><th>평균가</th><th>현재가</th>
              <th>평가금액</th><th>평가손익</th><th>오늘</th><th>비중</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(h => {
              const isUp = h.pl >= 0;
              const dayUp = h.daily_pct >= 0;
              const big = Math.abs(h.daily_pct) >= 3;
              const isOpen = expanded.has(h.id);
              return (
                <React.Fragment key={h.id}>
                <tr className={(isUp ? "is-up" : "is-down") + (big ? " is-big" : "") + (isOpen ? " is-open" : "")}
                    onClick={(e) => {
                      if (e.target.closest("[data-expand]")) return;
                      dispatch({type: "goDetail", id: h.id});
                    }}>
                  <td>
                    <div className="gu-hold-name">
                      <button data-expand onClick={(e) => { e.stopPropagation(); toggleExpand(h.id); }}
                              className="gu-expand-btn" aria-label="매수 이력 보기"
                              style={{transform: isOpen ? "rotate(90deg)" : "rotate(0deg)"}}>
                        <Icon name="chevron_right" size={14}/>
                      </button>
                      <AssetLogo h={h}/>
                      <div className="gu-hold-text">
                        <div className="gu-hold-name-main">{h.name}</div>
                        <div className="gu-hold-name-tkr">
                          <KindTag kind={h.kind}/><span>{h.ticker}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{h.amt.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}</td>
                  <td style={{color: "var(--gu-fg3)"}}>{fmtPrice(h.avgPrice)}</td>
                  <td style={{fontWeight: 600}}>{fmtPrice(h.price)}</td>
                  <td className={hidden ? "gu-blur-amt" : ""}>{fmt(h.marketValue)}</td>
                  <td className={"gu-pl-td " + (isUp ? "is-up gu-up" : "is-down gu-down")}>
                    <div className="gu-pl-cell">
                      <span className={"gu-pl-abs" + (hidden ? " gu-blur-amt" : "")}>{fmtSigned(h.pl)}</span>
                      <span className="gu-pl-pct">{fmtPct(h.plPct)}</span>
                    </div>
                  </td>
                  <td className={dayUp ? "gu-up" : "gu-down"} style={{fontWeight: 600}}>
                    {fmtPct(h.daily_pct)}
                  </td>
                  <td>
                    <div className="gu-weight-cell">
                      <span className="gu-weight-pct">{((h.marketValue / total) * 100).toFixed(1)}%</span>
                      <div className="gu-weight-bar">
                        <div className="gu-weight-bar-fill" style={{
                          width: ((h.marketValue / total) * 100 * 2.5) + "%",
                          background: h.color,
                        }}/>
                      </div>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="gu-lots-row">
                    <td colSpan={8} style={{padding: 0, background: "var(--gu-bg-panel)"}}>
                      <LotsPanel h={h} hidden={hidden} onSellLot={(lot, reload) => {
                        setLotResult(null);
                        setLotSell({ lot, h, reload });
                      }}/>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {lotSell && (
      <div className="gu-modal-overlay" onClick={() => setLotSell(null)}>
        <div className="gu-modal gu-order-confirm-modal" onClick={e => e.stopPropagation()}>
          <div className="gu-modal-head">
            <div className="gu-h4">주문 확인</div>
            <button className="gu-modal-close" onClick={() => setLotSell(null)}>
              <Icon name="close" size={16}/>
            </button>
          </div>
          <div className="gu-order-confirm-body">
            <div className="gu-order-confirm-badge" style={{background:'rgba(25,103,210,.1)', color:'#1967D2'}}>
              시장가 매도
            </div>
            <div className="gu-order-confirm-asset">
              <span className="gu-order-confirm-name">{lotSell.h.name}</span>
              <span className="gu-order-confirm-ticker">{lotSell.h.ticker}</span>
            </div>
            <div className="gu-order-confirm-rows">
              <div><span>수량</span><span>{parseFloat(lotSell.lot.amt).toLocaleString('ko-KR', {maximumFractionDigits:8})} {lotSell.h.ticker}</span></div>
              <div><span>현재가</span><span>₩{fmtPrice(lotSell.h.price)}</span></div>
              <div className="gu-order-confirm-total">
                <span>예상금액</span>
                <span>₩{fmt(parseFloat(lotSell.lot.amt) * lotSell.h.price)}</span>
              </div>
            </div>
            <p className="gu-order-confirm-warn">실제 거래소에 주문이 접수됩니다.</p>
          </div>
          <div className="gu-modal-actions">
            <button className="gu-btn gu-btn-ghost" style={{maxWidth:'none'}} onClick={() => setLotSell(null)}>취소</button>
            <button className="gu-btn gu-btn-lg gu-btn-down" style={{maxWidth:'none', flex:1}} onClick={executeLotSell}>
              매도 확인
            </button>
          </div>
        </div>
      </div>
    )}
    {lotResult && (
      <div className={'gu-order-result ' + (lotResult.success ? 'is-success' : 'is-error')}
        style={{position:'fixed', bottom:32, right:32, zIndex:200, minWidth:240}}>
        {lotResult.success ? '✓' : '✗'} {lotResult.msg}
      </div>
    )}
    </>
  );
}

export function LotsPanel({ h, hidden, onSellLot }) {
  const [lots, setLots] = React.useState(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);

  function deleteLot(id) {
    fetch(`${API_BASE}/api/lots/${id}`, { method: 'DELETE' })
      .then(() => setLots(prev => prev.filter(l => l.id !== id)));
    setDeleteConfirm(null);
  }

  function loadLots() {
    fetch(`${API_BASE}/api/holdings/${h.ticker}/lots`)
      .then(r => r.json())
      .then(setLots);
  }

  React.useEffect(() => { loadLots(); }, [h.ticker]);

  if (!lots) return <div style={{padding: 20, color: "var(--gu-fg3)"}}>불러오는 중...</div>;
  if (lots.length === 0) return <div style={{padding: 20, color: "var(--gu-fg3)"}}>매수 이력 없음</div>;

  return (
    <div className="gu-lots-panel">
      <div className="gu-lots-head">
        <div className="gu-label" style={{color:"var(--gu-fg2)"}}>매수 이력</div>
        <div className="gu-caption">{lots.length}건 · FIFO · 가장 최근 순</div>
      </div>
      <div className="gu-lots-table">
        <div className="gu-lots-grid-head">
          <div>LOT ID</div><div>매수일</div>
          <div style={{textAlign:"right"}}>수량</div>
          <div style={{textAlign:"right"}}>매수가</div>
          <div style={{textAlign:"right"}}>매수금액</div>
          <div style={{textAlign:"right"}}>현재 평가</div>
          <div style={{textAlign:"right"}}>평가손익</div>
          <div/>
        </div>
        {lots.map(l => {
          const price = parseFloat(l.price);
          const amt   = parseFloat(l.amt);
          const cost  = amt * price;
          const value = amt * h.price;
          const pl    = value - cost;
          const plPct = (pl / cost) * 100;
          const up    = pl >= 0;
          return (
            <div key={l.id} className="gu-lots-grid-row">
              <div className="gu-lot-id" title={l.id}>
                <span className="gu-lot-id-dot" style={{background: l.source === 'auto' ? 'rgb(34,170,119)' : 'rgb(34,102,221)'}}/>
                <code>{l.id.slice(0, 8)}…</code>
              </div>
              <div className="gu-num" style={{color:"var(--gu-fg2)", fontSize:11}}>
                {l.date.slice(5)}<span style={{color:"var(--gu-fg4)", marginLeft:6}}>{l.time}</span>
              </div>
              <div className="gu-num" style={{textAlign:"right"}}>{amt.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}</div>
              <div className="gu-num" style={{textAlign:"right", color:"var(--gu-fg2)"}}>{fmtPrice(price)}</div>
              <div className={"gu-num" + (hidden ? " gu-blur-amt" : "")} style={{textAlign:"right"}}>{fmt(cost)}</div>
              <div className={"gu-num" + (hidden ? " gu-blur-amt" : "")} style={{textAlign:"right", fontWeight:600}}>{fmt(value)}</div>
              <div className={"gu-num " + (up ? "gu-up" : "gu-down")} style={{textAlign:"right", fontWeight:600}}>
                <span className={hidden ? "gu-blur-amt" : ""}>{fmtSigned(pl)}</span>{' '}
                <span style={{fontWeight:500, opacity:0.85}}>({fmtPct(plPct)})</span>
              </div>
              <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:4}}>
                {onSellLot && l.source !== 'auto' && (
                  <button className="gu-btn gu-btn-sm gu-btn-blue"
                    style={{padding:"2px 7px", fontSize:11}}
                    onClick={() => { setDeleteConfirm(null); onSellLot(l, loadLots); }}>
                    매도
                  </button>
                )}
                {l.source !== 'auto' && (deleteConfirm === l.id ? (
                  <button className="gu-btn gu-btn-sm gu-btn-down"
                    style={{padding:"2px 7px", fontSize:11}}
                    onClick={() => deleteLot(l.id)}>
                    확인
                  </button>
                ) : (
                  <button className="gu-btn gu-btn-sm gu-btn-ghost"
                    style={{padding:"2px 6px", fontSize:11, color:'var(--gu-fg3)'}}
                    onClick={() => setDeleteConfirm(l.id)}>
                    ✕
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
