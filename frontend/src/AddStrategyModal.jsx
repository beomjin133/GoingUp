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

export default function AddStrategyModal({ onClose, onAdded }) {
  const [strategy,  setStrategy]  = React.useState('');
  const [ticker,    setTicker]    = React.useState('');
  const [service,   setService]   = React.useState('');
  const [amount,    setAmount]    = React.useState('');
  const [cron,      setCron]      = React.useState('* * * * *');
  const [loading,   setLoading]   = React.useState(false);
  const [error,     setError]     = React.useState('');
  const [files,     setFiles]     = React.useState([]);
  const [exchanges, setExchanges] = React.useState([]);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/exchanges`)
      .then(r => r.json())
      .then(data => setExchanges(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!service) { setFiles([]); setStrategy(''); return; }
    fetch(`${API_BASE}/api/strategy-files/${service}`)
      .then(r => r.json())
      .then(data => { setFiles(Array.isArray(data) ? data : []); setStrategy(''); })
      .catch(() => setFiles([]));
  }, [service]);

  const cronDesc = CRON_PRESETS.find(p => p.value === cron)?.desc || null;

  function handleSubmit() {
    if (!strategy.trim()) { setError('파일명을 입력하세요'); return; }
    if (!ticker.trim())   { setError('티커를 입력하세요'); return; }
    if (!service)         { setError('거래소를 선택하세요'); return; }
    if (!amount || Number(amount) <= 0) { setError('투자금액을 입력하세요'); return; }
    if (!cron.trim())     { setError('실행 주기를 입력하세요'); return; }

    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/strategies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy: strategy.trim(),
        ticker: ticker.trim().toUpperCase(),
        service,
        amount: Number(amount),
        cron: cron.trim(),
        enabled: 0,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.ok) { onAdded(); onClose(); }
        else setError(data.msg || '추가 실패');
      })
      .catch(() => { setLoading(false); setError('서버 오류'); });
  }

  return (
    <div className="gu-modal-overlay" onClick={onClose}>
      <div className="gu-modal" style={{maxWidth: 480}} onClick={e => e.stopPropagation()}>
        <div className="gu-modal-head">
          <h3 className="gu-modal-title">전략 추가</h3>
          <button className="gu-modal-close" onClick={onClose}>
            <Icon name="close" size={18}/>
          </button>
        </div>

        <div className="gu-modal-body">
          {error && <div className="gu-modal-error">{error}</div>}

          <div className="gu-modal-field">
            <label className="gu-label">거래소</label>
            <select
              className="gu-input"
              value={service}
              onChange={e => setService(e.target.value)}
              style={{cursor:"pointer"}}
            >
              <option value="">선택</option>
              {exchanges.map(e => (
                <option key={e.exchange} value={e.exchange}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="gu-modal-field">
            <label className="gu-label">파일명</label>
            {files.length > 0 ? (
              <select
                className="gu-input"
                value={strategy}
                onChange={e => setStrategy(e.target.value)}
                style={{cursor:"pointer", fontFamily:"var(--gu-font-mono)"}}
              >
                <option value="">선택</option>
                {files.map(f => (
                  <option key={f} value={f}>strategies/{service}/{f}.py</option>
                ))}
              </select>
            ) : (
              <div className="gu-input" style={{color:"var(--gu-fg3)", display:"flex", alignItems:"center", height:36, padding:"0 12px", fontSize:13}}>
                {service ? '해당 거래소의 전략 파일이 없습니다' : '거래소를 먼저 선택하세요'}
              </div>
            )}
          </div>

          <div className="gu-modal-field">
            <label className="gu-label">티커</label>
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
        </div>

        <div className="gu-modal-actions">
          <button className="gu-btn gu-btn-secondary" onClick={onClose}>취소</button>
          <button className="gu-btn gu-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "추가 중..." : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
