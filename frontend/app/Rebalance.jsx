// Rebalance simulator

function Rebalance({ state, dispatch }) {
  const { total, byKind } = computeTotals();
  const hidden = state.hideAmounts;
  const currentPct = {
    crypto: byKind.crypto / total * 100,
    equity: byKind.equity / total * 100,
    us:     byKind.us     / total * 100,
    cash:   byKind.cash   / total * 100,
  };
  const [targets, setTargets] = React.useState(state.targets || DEFAULT_TARGETS);
  const sum = targets.crypto + targets.equity + targets.us + targets.cash;
  const balanced = Math.abs(sum - 100) < 0.5;

  const items = [
    { id: "crypto", label: "코인",     color: "#F59E0B" },
    { id: "equity", label: "한국주식", color: "#1A55F0" },
    { id: "us",     label: "해외주식", color: "#8B5CF6" },
    { id: "cash",   label: "예수금",   color: "#9AA4B0" },
  ];

  function setOne(id, v) {
    setTargets(t => ({ ...t, [id]: v }));
  }

  function normalize() {
    const f = 100 / sum;
    setTargets(t => ({
      crypto: Math.round(t.crypto * f),
      equity: Math.round(t.equity * f),
      us:     Math.round(t.us * f),
      cash:   100 - Math.round(t.crypto * f) - Math.round(t.equity * f) - Math.round(t.us * f),
    }));
  }

  // Compute trades needed
  const trades = items.map(it => {
    const targetVal = total * targets[it.id] / 100;
    const currVal = byKind[it.id];
    const diff = targetVal - currVal;
    return { ...it, target: targets[it.id], curr: currPctFixed(currentPct[it.id]), diff };
  });
  const buys = trades.filter(t => t.diff > 0);
  const sells = trades.filter(t => t.diff < 0);

  return (
    <main className="gu-page gu-fade-in">
      <div className="gu-page-head">
        <div className="gu-page-head-left">
          <div className="gu-breadcrumb">
            <a onClick={() => dispatch({type:"tab", tab:"dash"})}>대시보드</a>
            <span className="gu-breadcrumb-sep"><Icon name="chevron_right" size={12}/></span>
            <span>리밸런싱</span>
          </div>
          <h2 className="gu-h2">리밸런싱 시뮬레이션</h2>
        </div>
        <div className="gu-page-actions">
          <button className="gu-btn gu-btn-ghost gu-btn-sm" onClick={() => setTargets(DEFAULT_TARGETS)}>
            초기화
          </button>
          <button className="gu-btn gu-btn-secondary gu-btn-sm" onClick={normalize} disabled={balanced}>
            100%로 맞추기
          </button>
        </div>
      </div>

      <div className="gu-rebal-grid">
        {/* Donuts */}
        <div className="gu-rebal-donuts">
          <div className="gu-rebal-donut-side">
            <span className="gu-label">현재</span>
            <Donut
              slices={items.map(it => ({ value: byKind[it.id], color: it.color }))}
              size={160} thickness={26}
              centerLabel="실제"
              centerValue={hidden ? "••••" : fmtShortKRW(total)}
            />
            <div className="gu-rebal-legend-inline">
              {items.map(it => (
                <div key={it.id}>
                  <span className="dot" style={{background: it.color}}/>
                  <span className="lbl">{it.label}</span>
                  <span className="val">{currentPct[it.id].toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gu-rebal-donut-side">
            <span className="gu-label">목표</span>
            <Donut
              slices={items.map(it => ({ value: Math.max(targets[it.id], 0.01), color: it.color }))}
              size={160} thickness={26}
              centerLabel="목표"
              centerValue={sum.toFixed(0) + "%"}
            />
            <div className="gu-rebal-legend-inline">
              {items.map(it => (
                <div key={it.id}>
                  <span className="dot" style={{background: it.color}}/>
                  <span className="lbl">{it.label}</span>
                  <span className="val">{targets[it.id]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Target sliders */}
        <div className="gu-rebal-targets">
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
            <div className="gu-h4">목표 비중 조정</div>
            <div className={"gu-caption " + (balanced ? "" : "gu-up")} style={{fontFamily: "var(--gu-font-mono)", fontWeight: 600}}>
              합계 {sum}% {balanced ? "✓" : "— 100%로 맞춰주세요"}
            </div>
          </div>
          {items.map(it => (
            <div key={it.id} className="gu-rebal-target-row">
              <div className="gu-rebal-target-head">
                <div className="gu-rebal-target-name">
                  <span style={{width: 10, height: 10, background: it.color, borderRadius: 3, display: "inline-block"}}/>
                  {it.label}
                  <span className="gu-rebal-target-cur">현재 {currentPct[it.id].toFixed(1)}%</span>
                </div>
                <div className="gu-rebal-target-pct" style={{color: it.color}}>
                  {targets[it.id]}%
                </div>
              </div>
              <div className="gu-rebal-slider-wrap">
                <input type="range" min="0" max="100" step="1"
                       value={targets[it.id]}
                       onChange={e => setOne(it.id, +e.target.value)}
                       className="gu-rebal-slider"
                       style={{accentColor: it.color}}/>
                <div className="gu-rebal-slider-marker" style={{left: currentPct[it.id] + "%"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="gu-rebal-actions">
        <div className="gu-rebal-action-copy">
          목표 비중에 맞추려면 <strong>{buys.length}건 매수, {sells.length}건 매도</strong>가 필요합니다.
          시뮬레이션이며 실제 주문 전 확인하세요.
        </div>
        <div style={{display: "flex", gap: 8}}>
          <button className="gu-btn gu-btn-secondary">내보내기</button>
          <button className="gu-btn gu-btn-primary" disabled={!balanced}>
            주문 생성 ({trades.filter(t => Math.abs(t.diff) > 100).length}건)
          </button>
        </div>
      </div>

      {/* Trade plan */}
      <div className="gu-card gu-rebal-trades">
        <div className="gu-card-head">
          <div className="gu-h4">제안 주문</div>
          <div className="gu-card-sub">목표 비중 기준</div>
        </div>
        <table className="gu-table">
          <thead>
            <tr>
              <th style={{width: "26%"}}>분류</th>
              <th>현재 비중</th>
              <th>목표 비중</th>
              <th>현재 금액</th>
              <th>목표 금액</th>
              <th>차이</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => {
              const targetVal = total * t.target / 100;
              const currVal = byKind[t.id];
              const action = Math.abs(t.diff) < 100 ? "유지" : (t.diff > 0 ? "매수" : "매도");
              return (
                <tr key={t.id}>
                  <td>
                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                      <span style={{width: 10, height: 10, background: t.color, borderRadius: 3}}/>
                      <span style={{fontWeight: 600}}>{t.label}</span>
                    </div>
                  </td>
                  <td style={{color: "var(--gu-fg3)"}}>{currentPct[t.id].toFixed(1)}%</td>
                  <td style={{fontWeight: 600}}>{t.target}%</td>
                  <td className={hidden ? "gu-blur-amt" : ""}>{fmt(currVal)}</td>
                  <td className={hidden ? "gu-blur-amt" : ""}>{fmt(targetVal)}</td>
                  <td className={t.diff > 0 ? "gu-up" : (t.diff < 0 ? "gu-down" : "gu-flat")}
                      style={{fontWeight: 600}}>
                    {t.diff === 0 ? "—" : fmtSigned(t.diff)}
                  </td>
                  <td>
                    <span className={"gu-history-side " + (action === "매수" ? "is-buy" : (action === "매도" ? "is-sell" : ""))}
                          style={action === "유지" ? {background: "var(--gu-surface-hover)", color: "var(--gu-fg3)"} : {}}>
                      {action}
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

function currPctFixed(n) { return n.toFixed(1); }

window.Rebalance = Rebalance;
