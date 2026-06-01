# GoingUp Web UI Kit

Interactive click-through recreation of the GoingUp trading dashboard.

**Open `index.html`** for the full interactive demo. Click coins in the sidebar to switch markets, toggle BUY/SELL in the trade panel, use the timeframe pills on the chart, and switch between the dashboard / trade / portfolio tabs.

## Components
- `Shell.jsx` — 3-column trading layout (header + left nav + main + right rail)
- `Header.jsx` — top bar with logo, account balance, nav
- `MarketList.jsx` — left rail scrollable market list with search + filters
- `PriceHeader.jsx` — symbol header with last price, change, 24h stats
- `CandleChart.jsx` — SVG-rendered candle chart with timeframe pills
- `OrderBook.jsx` — bid/ask depth with inline bars
- `TradePanel.jsx` — buy/sell form with % quick-fills
- `TradeHistory.jsx` — live tape
- `PortfolioSummary.jsx` — KPI cards for total + crypto + equities
- `Holdings.jsx` — detailed holdings table
