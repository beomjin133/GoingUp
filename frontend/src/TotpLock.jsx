import React from 'react';
import { API_BASE } from './data';
import { Logo } from './components';

const AUTH_KEY    = 'gu-totp-auth';
const SETUP_KEY   = 'gu-totp-registered';
const AUTH_TTL_MS = 24 * 60 * 60 * 1000;

export function isAuthenticated() {
  try {
    const expiry = parseInt(localStorage.getItem(AUTH_KEY) || '0', 10);
    return Date.now() < expiry;
  } catch { return false; }
}

function setAuthenticated() {
  localStorage.setItem(AUTH_KEY, String(Date.now() + AUTH_TTL_MS));
}

export default function TotpLock({ onUnlock }) {
  const [digits, setDigits]     = React.useState(['', '', '', '', '', '']);
  const [error, setError]       = React.useState(false);
  const [loading, setLoading]   = React.useState(false);
  const [shake, setShake]         = React.useState(false);
  const [showSetup, setShowSetup] = React.useState(false);
  const [qr, setQr]               = React.useState(null);
  const registered = !!localStorage.getItem(SETUP_KEY);
  const inputRefs = React.useRef([]);

  React.useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  function verify(code) {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/api/totp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAuthenticated();
          onUnlock();
        } else {
          setError(true);
          setShake(true);
          setDigits(['', '', '', '', '', '']);
          setTimeout(() => { setShake(false); inputRefs.current[0]?.focus(); }, 500);
        }
      })
      .catch(() => {
        setError(true);
        setShake(true);
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => { setShake(false); inputRefs.current[0]?.focus(); }, 500);
      })
      .finally(() => setLoading(false));
  }

  function onDigitChange(i, val) {
    const ch = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    setError(false);
    if (ch && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
    if (ch && i === 5) {
      const code = next.join('');
      if (code.length === 6) verify(code);
    }
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0)  inputRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function onPaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = ['', '', '', '', '', ''];
    text.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError(false);
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (text.length === 6) verify(text);
  }

  function loadQr() {
    setShowSetup(true);
    fetch(`${API_BASE}/api/totp/setup`)
      .then(r => r.json())
      .then(d => {
        setQr(d.qr);
        localStorage.setItem(SETUP_KEY, '1');
      });
  }

  const code = digits.join('');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--gu-bg)',
      fontFamily: 'var(--gu-font-sans)',
    }}>
      <div style={{
        width: 360,
        background: 'var(--gu-surface)',
        border: '1px solid var(--gu-border)',
        borderRadius: 'var(--gu-r-xl)',
        boxShadow: 'var(--gu-shadow-lg)',
        padding: '40px 32px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
      }}>
        {/* 로고 */}
        <Logo size={24} />

        {/* 안내 */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 'var(--gu-text-lg)', fontWeight: 'var(--gu-fw-semibold)', color: 'var(--gu-fg1)' }}>
            인증이 필요합니다
          </div>
          <div style={{ fontSize: 'var(--gu-text-sm)', color: 'var(--gu-fg3)' }}>
            Google Authenticator의 6자리 코드를 입력하세요
          </div>
        </div>

        {/* 6자리 입력 박스 */}
        <div style={{
          display: 'flex', gap: 8,
          animation: shake ? 'gu-shake 0.4s ease' : 'none',
        }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => onDigitChange(i, e.target.value)}
              onKeyDown={e => onKeyDown(i, e)}
              onPaste={onPaste}
              onFocus={e => e.target.select()}
              disabled={loading}
              style={{
                width: 44, height: 52,
                textAlign: 'center',
                fontSize: 22,
                fontFamily: 'var(--gu-font-mono)',
                fontWeight: 'var(--gu-fw-semibold)',
                color: 'var(--gu-fg1)',
                background: 'var(--gu-bg)',
                border: `1.5px solid ${error ? 'var(--gu-danger)' : d ? 'var(--gu-brand-primary)' : 'var(--gu-border)'}`,
                borderRadius: 'var(--gu-r-md)',
                outline: 'none',
                transition: 'border-color var(--gu-dur-fast)',
                caretColor: 'transparent',
              }}
            />
          ))}
        </div>

        {/* 에러 메시지 */}
        <div style={{
          height: 16, marginTop: -16,
          fontSize: 'var(--gu-text-sm)',
          color: 'var(--gu-danger)',
          opacity: error ? 1 : 0,
          transition: 'opacity var(--gu-dur-fast)',
        }}>
          코드가 올바르지 않습니다
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div style={{ fontSize: 'var(--gu-text-sm)', color: 'var(--gu-fg4)' }}>
            확인 중...
          </div>
        )}

        {/* 처음 설정 — 미등록 시에만 표시 */}
        {!registered && (
          <>
            <div style={{ width: '100%', height: 1, background: 'var(--gu-divider)' }} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={loadQr}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 'var(--gu-text-sm)', color: 'var(--gu-fg3)',
                  textAlign: 'left', textDecoration: 'underline',
                  textDecorationColor: 'var(--gu-border)',
                }}
              >
                처음 설정하기 (QR 코드 보기)
              </button>
              {showSetup && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: 16,
                  background: 'var(--gu-bg-alt)',
                  borderRadius: 'var(--gu-r-lg)',
                  border: '1px solid var(--gu-border)',
                }}>
                  <div style={{ fontSize: 'var(--gu-text-xs)', color: 'var(--gu-fg3)', textAlign: 'center' }}>
                    Google Authenticator 앱으로 스캔하세요
                  </div>
                  {qr
                    ? <img src={qr} alt="QR" style={{ width: 160, height: 160, borderRadius: 'var(--gu-r-md)' }} />
                    : <div style={{ height: 160, display: 'flex', alignItems: 'center', color: 'var(--gu-fg4)', fontSize: 'var(--gu-text-sm)' }}>불러오는 중...</div>
                  }
                </div>
              )}
            </div>
          </>
        )}

      </div>

      <style>{`
        @keyframes gu-shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
