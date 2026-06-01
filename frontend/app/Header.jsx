// Header / Top Nav

function Header({ tab, setTab, total, hideAmounts }) {
  const tabs = [
    { id: "dash", label: "대시보드" },
    { id: "detail", label: "거래" },
    { id: "history", label: "거래내역" },
    { id: "autobot", label: "자동매매" },
  ];
  return (
    <header className="gu-header">
      <div className="gu-header-left">
        <Logo size={22} />
        <nav className="gu-topnav">
          {tabs.map(t => (
            <button key={t.id}
              className={"gu-topnav-item" + (tab === t.id ? " is-active" : "")}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
      </div>
      <div className="gu-header-right">
        <div className="gu-header-balance">
          <span style={{fontSize: 10, color: "var(--gu-fg3)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase"}}>총 자산</span>
          <span className={"gu-num" + (hideAmounts ? " gu-blur-amt" : "")}
                style={{fontSize:13, fontWeight:700, color: "var(--gu-fg1)"}}>
            ₩{fmt(total)}
          </span>
        </div>

        <button className="gu-btn gu-btn-secondary gu-btn-sm">
          <Icon name="plus" size={12}/>입금
        </button>
        <button className="gu-btn gu-btn-primary gu-btn-sm">출금</button>
      </div>
    </header>
  );
}

window.Header = Header;
