import React from 'react';
import { Icon } from './components';
import { API_BASE } from './data';

const today = () => new Date().toISOString().slice(0, 10);

export default function CashFlowModal({ onClose, onChanged }) {
  const [flows, setFlows]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [msg, setMsg]       = React.useState('');

  const [type,   setType]   = React.useState('deposit');
  const [amount, setAmount] = React.useState('');
  const [service, setService] = React.useState('kis');
  const [flowDate, setFlowDate] = React.useState(today());

  function load() {
    setLoading(true);
    fetch(`${API_BASE}/api/cash-flows`)
      .then(r => r.json())
      .then(d => { setFlows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }
  React.useEffect(load, []);

  function sync() {
    setSyncing(true); setMsg('');
    fetch(`${API_BASE}/api/cash-flows/sync`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        setSyncing(false);
        setMsg(d.ok ? `✓ 거래소 동기화 완료 (${d.synced}건)` : '동기화 실패');
        load(); onChanged && onChanged();
      })
      .catch(() => { setSyncing(false); setMsg('동기화 오류'); });
  }

  function add() {
    if (!amount || Number(amount) <= 0) { setMsg('금액을 입력하세요'); return; }
    fetch(`${API_BASE}/api/cash-flows`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount: Number(amount), service, flow_date: flowDate }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setAmount(''); setMsg('✓ 추가됨'); load(); onChanged && onChanged(); }
        else setMsg(d.msg || '추가 실패');
      })
      .catch(() => setMsg('오류'));
  }

  function remove(id) {
    fetch(`${API_BASE}/api/cash-flows/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(() => { load(); onChanged && onChanged(); })
      .catch(() => {});
  }

  return (
    <div className="gu-modal-overlay" onClick={onClose}>
      <div className="gu-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="gu-modal-head">
          <h3 className="gu-modal-title">입출금 관리</h3>
          <button className="gu-modal-close" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="gu-modal-body">
          <div style={{ fontSize: 12, color: 'var(--gu-fg4)', lineHeight: 1.6, marginBottom: 4 }}>
            입출금(자본 유입)이 자산 곡선에 성과처럼 잡히지 않도록 기록합니다.
            업비트는 자동 동기화, 한투 등은 수동으로 입력하세요.
          </div>

          {/* 동기화 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="gu-btn gu-btn-secondary gu-btn-sm" onClick={sync} disabled={syncing}>
              <Icon name="refresh" size={13} /> {syncing ? '동기화 중...' : '업비트 자동 동기화'}
            </button>
            {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? 'var(--gu-up)' : 'var(--gu-down)' }}>{msg}</span>}
          </div>

          {/* 수동 입력 */}
          <div className="gu-modal-field" style={{ marginTop: 8 }}>
            <label className="gu-label">수동 입력 (한투 등)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="gu-input" value={type} onChange={e => setType(e.target.value)} style={{ width: 90, cursor: 'pointer' }}>
                <option value="deposit">입금</option>
                <option value="withdraw">출금</option>
              </select>
              <select className="gu-input" value={service} onChange={e => setService(e.target.value)} style={{ width: 90, cursor: 'pointer' }}>
                <option value="kis">한투</option>
                <option value="upbit">업비트</option>
                <option value="manual">기타</option>
              </select>
              <input className="gu-input" type="date" value={flowDate} onChange={e => setFlowDate(e.target.value)} style={{ width: 150 }} />
              <input className="gu-input" type="number" placeholder="금액(KRW)" value={amount}
                onChange={e => setAmount(e.target.value)} style={{ flex: 1, minWidth: 110, textAlign: 'right', fontFamily: 'var(--gu-font-mono)' }} />
              <button className="gu-btn gu-btn-primary gu-btn-sm" onClick={add}>추가</button>
            </div>
          </div>

          {/* 목록 */}
          <div className="gu-modal-field">
            <label className="gu-label">기록 ({flows.length}건)</label>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--gu-divider)', borderRadius: 8 }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--gu-fg3)', fontSize: 13 }}>불러오는 중...</div>
              ) : flows.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--gu-fg3)', fontSize: 13 }}>기록이 없습니다</div>
              ) : flows.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                  borderBottom: '1px solid var(--gu-divider)', fontSize: 13 }}>
                  <span style={{ width: 40, color: f.type === 'deposit' ? 'var(--gu-up)' : 'var(--gu-down)', fontWeight: 600 }}>
                    {f.type === 'deposit' ? '입금' : '출금'}
                  </span>
                  <span style={{ width: 90, color: 'var(--gu-fg3)', fontSize: 12 }}>{f.flow_date}</span>
                  <span style={{ width: 60, color: 'var(--gu-fg3)', fontSize: 12 }}>{f.service}</span>
                  <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--gu-font-mono)' }}>
                    ₩{Number(f.amount).toLocaleString('ko-KR')}
                  </span>
                  <button onClick={() => remove(f.id)} title="삭제"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gu-fg4)', lineHeight: 0 }}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gu-modal-actions">
          <button className="gu-btn gu-btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
