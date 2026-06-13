import React from 'react';
import { Logo, Icon } from './components';
import { fmt } from './data';

export default function Header({ tab, setTab, total, hideAmounts, onToggleHide }) {
  const tabs = [
    { id: "dash",      label: "대시보드" },
    { id: "detail",    label: "거래" },
    { id: "history",   label: "거래내역" },
    { id: "autobot",   label: "자동매매" },
    { id: "backtest",  label: "백테스트" },
  ];
  return (
    <header className="gu-header">
      <div className="gu-header-left">
        <div onClick={() => setTab("dash")} style={{cursor:"pointer"}}>
          <Logo size={22} />
        </div>
        <nav className="gu-topnav">
          {tabs.map(t => (
            <button key={t.id}
              className={"gu-topnav-item" + (tab === t.id ? " is-active" : "")}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
      </div>
      <div className="gu-header-right">
        <div className="gu-header-balance" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <button onClick={onToggleHide}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gu-fg4)', padding: 0, display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
            <Icon name={hideAmounts ? "visibility_off" : "visibility"} size={14}/>
            숨김
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
            <span style={{fontSize: 10, color: "var(--gu-fg3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase"}}>총 자산</span>
            <span className={"gu-num" + (hideAmounts ? " gu-blur-amt" : "")}
                  style={{fontSize:13, fontWeight:700, color: "var(--gu-fg1)"}}>
              ₩{fmt(total)}
            </span>
          </div>
        </div>
        <button className="gu-btn gu-btn-secondary gu-btn-sm">
          <Icon name="plus" size={12}/>입금
        </button>
        <button className="gu-btn gu-btn-primary gu-btn-sm">출금</button>
      </div>
    </header>
  );
}
