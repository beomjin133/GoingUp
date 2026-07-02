import React from 'react';
import { Icon } from './components';
import { API_BASE } from './data';

const CRON_PRESETS = [
  { label: '매분',      value: '* * * * *',   desc: '매 분마다' },
  { label: '매시간',    value: '0 * * * *',   desc: '매 정시마다' },
  { label: '매일 9시',  value: '0 9 * * *',   desc: '매일 오전 9시' },
  { label: '매일 16시', value: '0 16 * * *',  desc: '매일 오후 4시' },
  { label: '매주 월',   value: '0 9 * * 1',   desc: '매주 월요일 9시' },
];

export default function EditStrategyModal({ strategy, onClose, onSaved }) {
  const [ticker, setTicker] = React.useState(strategy.ticker || '');
  const [amount, setAmount] = React.useState(String(strategy.amount ?? ''));
  const [cron,   setCron]   = React.useState(strategy.cron || '* * * * *');
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState('');

  const cronDesc = CRON_PRESETS.find(p => p.value === cron)?.desc || null;

  function handleSubmit() {
    if (!ticker.trim()) { setError('티커를 입력하세요'); return; }
    if (!amount || Number(amount) <= 0) { setError('투자금액을 입력하세요'); return; }
    if (!cron.trim())   { setError('실행 주기를 입력하세요'); return; }

    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/strategies/${strategy.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(),
        amount: Number(amount),
        cron: cron.trim(),
      }),
    })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.ok) { onSaved && onSaved(); onClose(); }
        else setError(data.msg || '수정 실패');
      })
      .catch(() => { setLoading(false); setError('서버 오류'); });
  }

  return (
    <div className="gu-modal-overlay" onClick={onClose}>
      <div className="gu-modal" style={{maxWidth: 480}} onClick={e => e.stopPropagation()}>
        <div className="gu-modal-head">
          <h3 className="gu-modal-title">전략 수정</h3>
          <button className="gu-modal-close" onClick={onClose}>
            <Icon name="close" size={18}/>
          </button>
        </div>

        <div className="gu-modal-body">
          {error && <div className="gu-modal-error">{error}</div>}

          {/* 전략 파일·거래소는 변경 불가 (읽기 전용) */}
          <div className="gu-modal-field">
            <label className="gu-label">전략</label>
            <div className="gu-input" style={{color:"var(--gu-fg2)", display:"flex", alignItems:"center", height:36, padding:"0 12px", fontSize:13, fontFamily:"var(--gu-font-mono)"}}>
              {strategy.service}/{strategy.strategy}.py
            </div>
          </div>

          <div className="gu-modal-field">
            <label className="gu-label">종목 (티커)</label>
            <input className="gu-input"
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              style={{fontFamily:"var(--gu-font-mono)"}}
            />
          </div>

          <div className="gu-modal-field">
            <label className="gu-label">투자금액 (KRW)</label>
            <div className="gu-input-affix">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{flex:1, border:"none", background:"none", outline:"none", padding:"0 12px", height:36, fontFamily:"var(--gu-font-mono)", fontSize:14, textAlign:"right", color:"var(--gu-fg1)"}}
              />
              <div className="gu-input-affix-suf">KRW</div>
            </div>
          </div>

          <div className="gu-modal-field">
            <label className="gu-label">실행 주기</label>
            <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8}}>
              {CRON_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setCron(p.value)}
                  style={{
                    padding:"4px 10px",
                    borderRadius:6,
                    border:"1px solid",
                    borderColor: cron === p.value ? "var(--gu-brand-primary)" : "var(--gu-divider)",
                    background: cron === p.value ? "var(--gu-brand-primary)" : "var(--gu-bg2)",
                    color: cron === p.value ? "#fff" : "var(--gu-fg2)",
                    fontSize:12,
                    cursor:"pointer",
                    fontFamily:"var(--gu-font-sans)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="gu-input-affix">
              <input
                value={cron}
                onChange={e => setCron(e.target.value)}
                style={{flex:1, border:"none", background:"none", outline:"none", padding:"0 12px", height:36, fontFamily:"var(--gu-font-mono)", fontSize:13, color:"var(--gu-fg1)"}}
              />
              {cronDesc && (
                <div className="gu-input-affix-suf" style={{color:"var(--gu-fg3)", fontSize:12}}>{cronDesc}</div>
              )}
            </div>
          </div>

          <div style={{fontSize:12, color:"var(--gu-fg4)", lineHeight:1.6}}>
            ※ 수익률은 체결 내역으로 자동 계산되어 수정 대상이 아닙니다.
          </div>
        </div>

        <div className="gu-modal-actions">
          <button className="gu-btn gu-btn-secondary" onClick={onClose}>취소</button>
          <button className="gu-btn gu-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
