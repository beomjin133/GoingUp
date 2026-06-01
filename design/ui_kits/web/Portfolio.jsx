function PortfolioSummary() {
  const cards = [
    { title: "총 자산", val: 128490210, delta: 3120000, deltaPct: 2.48, up: true, spark: "0,22 20,24 40,18 60,20 80,14 100,16 120,10 140,12 160,6 180,8 200,4" },
    { title: "코인",    val: 42108000, delta: -412800, deltaPct: -0.97, up: false, spark: "0,6 20,8 40,14 60,12 80,16 100,14 120,20 140,22 160,18 180,24 200,22" },
    { title: "주식",    val: 86382210, delta: 3532800, deltaPct: 4.28, up: true, spark: "0,24 20,20 40,22 60,16 80,18 100,10 120,12 140,8 160,10 180,4 200,2" },
    { title: "예수금",  val: 12840210, delta: 0, deltaPct: 0, up: null, spark: "0,16 20,16 40,16 60,16 80,16 100,16 120,16 140,16 160,16 180,16 200,16" },
  ];
  return (
    <div className="gu-portfolio-summary">
      {cards.map((c, i) => (
        <div key={i} className="gu-card">
          <div className="gu-label">{c.title}</div>
          <div className="gu-num-lg" style={{fontSize: 26, marginTop: 6}}>₩{fmt(c.val)}</div>
          <div className={"gu-num " + (c.up === null ? "gu-fg3" : c.up ? "gu-up" : "gu-down")}
               style={{fontSize: 12, marginTop: 4}}>
            {c.up === null ? "변동 없음" : `${c.up ? "▲" : "▼"} ${fmtSigned(c.delta)} (${fmtPct(c.deltaPct)})`}
          </div>
          <svg className="gu-spark" viewBox="0 0 200 32" preserveAspectRatio="none">
            <polyline fill="none"
              stroke={c.up === null ? "#9AA4B0" : c.up ? "#F24147" : "#1967D2"}
              strokeWidth="2" points={c.spark} />
          </svg>
        </div>
      ))}
    </div>
  );
}

function Holdings() {
  const holdings = [
    { name: "비트코인",   ticker: "BTC",    amt: "0.0418",    avg: 91200000, price: 94210000, pl: 2.54 },
    { name: "이더리움",   ticker: "ETH",    amt: "3.2145",    avg: 4560000,  price: 4812500,  pl: 5.54 },
    { name: "솔라나",     ticker: "SOL",    amt: "42.18",     avg: 312000,   price: 348200,   pl: 11.60 },
    { name: "리플",       ticker: "XRP",    amt: "5,240",     avg: 3280,     price: 3124,     pl: -4.76 },
    { name: "삼성전자",   ticker: "005930", amt: "420",       avg: 80100,    price: 82400,    pl: 2.87 },
    { name: "SK하이닉스", ticker: "000660", amt: "112",       avg: 224000,   price: 248000,   pl: 10.71 },
  ];
  return (
    <div className="gu-card" style={{padding:0, overflow:"hidden"}}>
      <div className="gu-card-head">
        <div className="gu-h4">보유 자산</div>
        <div className="gu-caption">6 종목 · 업데이트 방금 전</div>
      </div>
      <table className="gu-table">
        <thead>
          <tr>
            <th>종목</th>
            <th>보유수량</th>
            <th>평균매수가</th>
            <th>현재가</th>
            <th>평가손익</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={i}>
              <td className="gu-td-name">
                <span className="gu-holding-name">{h.name}</span>
                <span className="gu-holding-tkr">{h.ticker}</span>
              </td>
              <td className="gu-num">{h.amt}</td>
              <td className="gu-num gu-fg3">{fmt(h.avg)}</td>
              <td className="gu-num">{fmt(h.price)}</td>
              <td className={"gu-num " + (h.pl >= 0 ? "gu-up" : "gu-down")}>
                {fmtPct(h.pl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

window.PortfolioSummary = PortfolioSummary;
window.Holdings = Holdings;
