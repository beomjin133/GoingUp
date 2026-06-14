import React from 'react';
import { createChart } from 'lightweight-charts';
import { Icon } from './components';
import { API_BASE, fmt } from './data';

function Stat({ label, value, color, sub }) {
  return (
    <div className="gu-kpi" style={{ minWidth: 110 }}>
      <div className="gu-kpi-lbl">{label}</div>
      <div className="gu-kpi-val" style={{ color: color || 'var(--gu-fg1)', fontSize: 20 }}>{value}</div>
      {sub && <div className="gu-kpi-delta" style={{ color: 'var(--gu-fg3)' }}>{sub}</div>}
    </div>
  );
}

export default function StrategyDetailModal({ strategy, onClose }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const chartRef = React.useRef(null);
  const chartInst = React.useRef(null);

  React.useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/strategies/${strategy.id}/detail`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [strategy.id]);

  React.useEffect(() => {
    if (!data || !data.equity_curve?.length || !chartRef.current) return;
    if (chartInst.current) { chartInst.current.remove(); chartInst.current = null; }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const grid = isDark ? '#22272E' : '#EAECEF';
    const chart = createChart(chartRef.current, {
      height: 220, width: chartRef.current.clientWidth,
      layout: { background: { color: 'transparent' }, textColor: isDark ? '#BFC6CF' : '#454C56' },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      timeScale: { borderColor: grid }, rightPriceScale: { borderColor: grid },
      crosshair: { mode: 1 },
    });
    const s = chart.addLineSeries({ color: '#1A55F0', lineWidth: 2 });
    s.setData(data.equity_curve);
    chart.timeScale().fitContent();
    chartInst.current = chart;
    const obs = new ResizeObserver(() => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); });
    obs.observe(chartRef.current);
    return () => obs.disconnect();
  }, [data]);

  const s = data?.stats;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gu-card" style={{ width: 760, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="gu-card-head">
          <div className="gu-h4">
            <span style={{ fontFamily: 'var(--gu-font-mono)' }}>{strategy.strategy}.py</span>
            <span style={{ color: 'var(--gu-fg3)', marginLeft: 8 }}>· {strategy.ticker}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gu-fg4)' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gu-fg3)' }}>불러오는 중...</div>
        ) : !s ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gu-fg3)' }}>아직 자동매매 체결 기록이 없습니다</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <Stat label="총 수익률" value={`${s.total_return_pct >= 0 ? '+' : ''}${s.total_return_pct}%`}
                color={s.total_return_pct >= 0 ? 'var(--gu-up)' : 'var(--gu-down)'}
                sub={`${s.total_pnl >= 0 ? '+' : '−'}₩${Math.abs(s.total_pnl).toLocaleString('ko-KR')}`} />
              <Stat label="연 수익률" value={`${s.annual_return_pct >= 0 ? '+' : ''}${s.annual_return_pct}%`}
                color={s.annual_return_pct >= 0 ? 'var(--gu-up)' : 'var(--gu-down)'} />
              <Stat label="최대 낙폭" value={`${s.max_drawdown_pct}%`} color="var(--gu-down)" />
              <Stat label="승률" value={`${s.win_rate}%`} />
              <Stat label="거래 횟수" value={`${s.num_trades}회`} />
              <Stat label="샤프 비율" value={s.sharpe_ratio} />
            </div>

            {data.equity_curve?.length > 0 && (
              <div className="gu-card" style={{ padding: 12 }}>
                <div className="gu-h4" style={{ marginBottom: 8 }}>누적 수익곡선</div>
                <div ref={chartRef} style={{ width: '100%' }} />
              </div>
            )}

            <div className="gu-card" style={{ padding: 0 }}>
              <div className="gu-card-head"><div className="gu-h4">체결 내역 ({data.trades.length}건)</div></div>
              <table className="gu-table">
                <thead>
                  <tr>
                    <th>진입</th><th>청산</th><th>진입가</th><th>청산가</th><th>손익</th><th>수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--gu-fg3)' }}>없음</td></tr>
                  ) : data.trades.map((t, i) => (
                    <tr key={i} style={t.open ? { opacity: 0.75 } : {}}>
                      <td style={{ fontSize: 12, color: 'var(--gu-fg3)' }}>{t.entry_time}</td>
                      <td style={{ fontSize: 12, color: 'var(--gu-fg3)' }}>
                        {t.open ? <span style={{ color: 'var(--gu-warn, #F59E0B)', fontSize: 11 }}>보유중</span> : t.exit_time}
                      </td>
                      <td>₩{fmt(t.entry_price)}</td>
                      <td>{t.open ? '-' : `₩${fmt(t.exit_price)}`}</td>
                      <td className={t.pnl >= 0 ? 'gu-up' : 'gu-down'} style={{ fontWeight: 600 }}>
                        {t.pnl >= 0 ? '+' : '−'}₩{Math.abs(t.pnl).toLocaleString('ko-KR')}
                      </td>
                      <td className={t.pnl_pct >= 0 ? 'gu-up' : 'gu-down'}>
                        {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct}%
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
  );
}
