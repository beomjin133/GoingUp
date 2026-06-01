import React from 'react';
import { Icon } from './components';
import { API_BASE } from './data';
import AddStrategyModal from './AddStrategyModal';

export default function AutoBot({ dispatch }) {
  const [strategies, setStrategies] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);

  function loadStrategies(silent = false) {
    if (!silent) setLoading(true);
    fetch(`${API_BASE}/api/strategies`)
      .then(r => r.json())
      .then(data => { setStrategies(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  function toggleStrategy(id, currentEnabled) {
    const next = currentEnabled ? 0 : 1;
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, enabled: next } : s));
    fetch(`${API_BASE}/api/strategies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => {
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, enabled: currentEnabled } : s));
    });
  }

  function deleteStrategy(id) {
    if (!window.confirm('이 전략을 삭제하시겠습니까?')) return;
    setStrategies(prev => prev.filter(s => s.id !== id));
    fetch(`${API_BASE}/api/strategies/${id}`, { method: 'DELETE' })
      .catch(() => loadStrategies());
  }

  React.useEffect(() => { loadStrategies(); }, []);

  React.useEffect(() => {
    const id = setInterval(() => loadStrategies(true), 30000);
    return () => clearInterval(id);
  }, []);

  const [autoStats, setAutoStats] = React.useState({ today_buys: 0, today_sells: 0, today_buy_amt: 0, today_sell_amt: 0 });

  function loadAutoStats() {
    fetch(`${API_BASE}/api/logs/auto-stats`)
      .then(r => r.json())
      .then(data => setAutoStats(data))
      .catch(() => {});
  }

  React.useEffect(() => { loadAutoStats(); }, []);
  React.useEffect(() => {
    const id = setInterval(loadAutoStats, 30000);
    return () => clearInterval(id);
  }, []);

  const runningCount = strategies.filter(s => s.enabled).length;

  return (
    <>
    {showAdd && <AddStrategyModal onClose={() => setShowAdd(false)} onAdded={loadStrategies}/>}
    <main className="gu-page gu-fade-in">
      <div className="gu-page-head">
        <div className="gu-page-head-left">
          <div className="gu-breadcrumb">
            <button onClick={() => dispatch({type:"tab", tab:"dash"})} style={{background:"none", border:"none", cursor:"pointer", color:"inherit", textDecoration:"underline"}}>대시보드</button>
            <span className="gu-breadcrumb-sep"><Icon name="chevron_right" size={12}/></span>
            <span>자동매매</span>
          </div>
          <h2 className="gu-h2">자동매매</h2>
        </div>
        <div className="gu-page-actions">
          <button className="gu-btn gu-btn-ghost gu-btn-sm" onClick={loadStrategies}>
            <Icon name="refresh" size={13}/>
          </button>
          <button className="gu-btn gu-btn-primary gu-btn-sm" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={12}/> 전략 추가
          </button>
        </div>
      </div>

      <div className="gu-kpi-grid" style={{gridTemplateColumns: "repeat(3, 1fr)"}}>
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">실행 중인 전략</div>
          <div className="gu-kpi-val" style={{color: runningCount > 0 ? "var(--gu-brand-primary)" : "var(--gu-fg1)"}}>
            {runningCount}
          </div>
          <div className="gu-kpi-delta" style={{color:"var(--gu-fg3)"}}>전체 {strategies.length}개</div>
        </div>
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">오늘 자동 매수</div>
          <div className="gu-kpi-val gu-up">{autoStats.today_buys}건</div>
          <div className="gu-kpi-delta" style={{color:"var(--gu-fg3)"}}>
            ₩{Number(autoStats.today_buy_amt).toLocaleString('ko-KR', {maximumFractionDigits:0})}
          </div>
        </div>
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">오늘 자동 매도</div>
          <div className="gu-kpi-val gu-down">{autoStats.today_sells}건</div>
          <div className="gu-kpi-delta" style={{color:"var(--gu-fg3)"}}>
            ₩{Number(autoStats.today_sell_amt).toLocaleString('ko-KR', {maximumFractionDigits:0})}
          </div>
        </div>
      </div>

      <div className="gu-card">
        <div className="gu-card-head">
          <div className="gu-h4">전략 목록</div>
          <span className="gu-caption">전략을 켜면 조건 충족 시 자동으로 주문이 실행됩니다</span>
        </div>
        <table className="gu-table">
          <thead>
            <tr>
              <th>파일</th>
              <th style={{textAlign:"center"}}>종목</th>
              <th>투자금액</th>
              <th style={{textAlign:"center"}}>주기</th>
              <th style={{textAlign:"center"}}>상태</th>
              <th style={{textAlign:"center"}}>실행</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && strategies.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign:"center", color:"var(--gu-fg3)", padding:32}}>불러오는 중...</td></tr>
            ) : strategies.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign:"center", color:"var(--gu-fg3)", padding:32}}>등록된 전략이 없습니다</td></tr>
            ) : strategies.map(s => (
              <tr key={s.id} style={{cursor:"default"}}>
                <td>
                  <span style={{fontFamily:"var(--gu-font-mono)", fontSize:13, color:"var(--gu-fg3)"}}>{s.service}/</span>
                  <span style={{fontFamily:"var(--gu-font-mono)", fontSize:13}}>{s.strategy}.py</span>
                </td>
                <td style={{textAlign:"center"}}>
                  <span style={{fontFamily:"var(--gu-font-mono)", fontSize:12}}>{s.ticker}</span>
                </td>
                <td>
                  <span style={{fontFamily:"var(--gu-font-mono)", fontSize:12}}>
                    ₩{Number(s.amount).toLocaleString("ko-KR")}
                  </span>
                </td>
                <td style={{textAlign:"center"}}>
                  <span style={{fontFamily:"var(--gu-font-mono)", fontSize:11, color:"var(--gu-fg3)"}}>{s.cron || '—'}</span>
                </td>
                <td style={{textAlign:"center"}}>
                  <span className={"gu-bot-status is-" + (s.has_position ? "running" : "idle")}>
                    {s.has_position ? "매수 중" : "대기 중"}
                  </span>
                </td>
                <td style={{textAlign:"center"}}>
                  <div
                    className={"gu-switch" + (s.enabled ? " is-on" : "")}
                    onClick={() => toggleStrategy(s.id, s.enabled)}
                    style={{display:"inline-block", cursor:"pointer"}}
                  />
                </td>
                <td>
                  <button
                    onClick={() => deleteStrategy(s.id)}
                    style={{background:"none", border:"none", cursor:"pointer", color:"var(--gu-fg3)", padding:"4px 6px", borderRadius:4, lineHeight:0}}
                    title="삭제"
                    onMouseEnter={e => e.currentTarget.style.color = "var(--gu-down)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--gu-fg3)"}
                  >
                    <Icon name="trash" size={14}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
    </>
  );
}
