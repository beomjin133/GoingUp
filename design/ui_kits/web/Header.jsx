function Header({ tab, setTab }) {
  const tabs = [
    { id: "trade", label: "거래소", icon: "../../assets/icons/orderbook.svg" },
    { id: "dash", label: "내 자산", icon: "../../assets/icons/portfolio.svg" },
    { id: "deposit", label: "입출금", icon: "../../assets/icons/deposit.svg" },
    { id: "history", label: "거래내역", icon: "../../assets/icons/chart.svg" },
  ];
  return (
    <header className="gu-header">
      <div className="gu-header-left">
        <img src="../../assets/logo.svg" alt="GoingUp" className="gu-logo" />
        <nav className="gu-topnav">
          {tabs.map(t => (
            <button key={t.id}
              className={"gu-topnav-item" + (tab === t.id ? " is-active" : "")}
              onClick={() => setTab(t.id)}>
              <img src={t.icon} className="gu-topnav-icon" alt="" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="gu-header-right">
        <div className="gu-header-balance">
          <span className="gu-label">총 자산</span>
          <span className="gu-num" style={{fontSize:14, fontWeight:600}}>₩128,490,210</span>
        </div>
        <button className="gu-btn gu-btn-secondary gu-btn-sm">
          <img src="../../assets/icons/deposit.svg" width="14" height="14" alt="" /> 입금
        </button>
        <button className="gu-btn gu-btn-primary gu-btn-sm">
          <img src="../../assets/icons/withdraw.svg" width="14" height="14" alt="" style={{filter:"invert(1) brightness(2)"}} /> 출금
        </button>
        <button className="gu-icon-btn" title="알림">
          <img src="../../assets/icons/bell.svg" width="18" height="18" alt="" />
        </button>
        <div className="gu-avatar">김</div>
      </div>
    </header>
  );
}
window.Header = Header;
