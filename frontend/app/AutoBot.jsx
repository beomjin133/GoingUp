// Auto-trading strategy manager

const MOCK_STRATEGIES = [
  {
    id: 1, name: "BTC RSI 과매도", ticker: "BTC", service: "Upbit", kind: "crypto",
    enabled: true, status: "running",
    desc: "RSI 30 이하 진입 / 70 이상 청산",
    lastRun: "2026-05-14 08:42",
  },
  {
    id: 2, name: "ETH 변동성 돌파", ticker: "ETH", service: "Upbit", kind: "crypto",
    enabled: false, status: "idle",
    desc: "전일 변동폭 × 0.5 돌파 시 매수",
    lastRun: "2026-05-13 22:10",
  },
  {
    id: 3, name: "삼성전자 이평선 크로스", ticker: "005930", service: "KIS", kind: "equity",
    enabled: false, status: "idle",
    desc: "5일선 > 20일선 골든크로스 매수",
    lastRun: null,
  },
];

function AutoBot({ dispatch }) {
  const [strategies, setStrategies] = React.useState(MOCK_STRATEGIES);

  function toggleStrategy(id) {
    setStrategies(prev => prev.map(s =>
      s.id === id
        ? { ...s, enabled: !s.enabled, status: !s.enabled ? "running" : "idle" }
        : s
    ));
  }

  const runningCount = strategies.filter(s => s.enabled).length;

  return (
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
          <button className="gu-btn gu-btn-primary gu-btn-sm" disabled>
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
          <div className="gu-kpi-delta" style={{color:"var(--gu-fg3)"}}>
            전체 {strategies.length}개
          </div>
        </div>
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">오늘 자동 매수</div>
          <div className="gu-kpi-val">—</div>
          <div className="gu-kpi-delta" style={{color:"var(--gu-fg3)"}}>API 연동 후 집계</div>
        </div>
        <div className="gu-kpi">
          <div className="gu-kpi-lbl">오늘 자동 매도</div>
          <div className="gu-kpi-val">—</div>
          <div className="gu-kpi-delta" style={{color:"var(--gu-fg3)"}}>API 연동 후 집계</div>
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
              <th style={{textAlign:"left"}}>전략명 / 조건</th>
              <th>거래소</th>
              <th>종목</th>
              <th>마지막 실행</th>
              <th>상태</th>
              <th>실행</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map(s => (
              <tr key={s.id} style={{cursor:"default"}}>
                <td style={{fontFamily:"var(--gu-font-sans)"}}>
                  <div style={{fontWeight:600, fontSize:13, color:"var(--gu-fg1)", marginBottom:2}}>{s.name}</div>
                  <div style={{fontSize:11, color:"var(--gu-fg3)"}}>{s.desc}</div>
                </td>
                <td style={{textAlign:"center"}}>
                  <span className={"gu-hold-kind is-" + s.kind} style={{fontFamily:"var(--gu-font-sans)"}}>
                    {s.service}
                  </span>
                </td>
                <td>
                  <span style={{fontFamily:"var(--gu-font-mono)", fontSize:12}}>{s.ticker}</span>
                </td>
                <td>
                  <span style={{fontSize:11, color:"var(--gu-fg3)"}}>
                    {s.lastRun ?? "—"}
                  </span>
                </td>
                <td style={{textAlign:"center"}}>
                  <span className={"gu-bot-status is-" + s.status}>
                    {s.status === "running" ? "실행 중" : "대기 중"}
                  </span>
                </td>
                <td style={{textAlign:"center"}}>
                  <div
                    className={"gu-switch" + (s.enabled ? " is-on" : "")}
                    onClick={() => toggleStrategy(s.id)}
                    style={{display:"inline-block"}}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {strategies.length === 0 && (
          <div style={{textAlign:"center", color:"var(--gu-fg3)", padding:"40px 0", fontSize:13}}>
            등록된 전략이 없습니다
          </div>
        )}
      </div>

      <div style={{
        padding:"14px 18px", borderRadius:10,
        background:"var(--gu-bg-panel)", border:"1px solid var(--gu-border)",
        fontSize:12, color:"var(--gu-fg3)", lineHeight:1.6,
        borderLeft:"3px solid var(--gu-brand-primary)",
      }}>
        자동매매 전략은 API 서버에서 실행됩니다. 전략 DB 연동 후 실제 조건 및 이력이 여기에 표시됩니다.
      </div>
    </main>
  );
}

window.AutoBot = AutoBot;
