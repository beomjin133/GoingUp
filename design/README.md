# GoingUp Design System

> **GoingUp (고잉업)** — 코인, 주식 등 포트폴리오를 통합적으로 관리하고 매매할 수 있도록 해주는 웹 플랫폼.
> A unified Korean-market web platform for managing and trading both crypto assets and equities from a single portfolio view.

---

## Product Context

GoingUp sits at the intersection of two product categories that Korean retail investors juggle today:
- **Crypto exchanges** (Upbit, Bithumb, Coinone) — 24/7 order books, orderbook-first trading, heavy real-time.
- **Equity brokerages** (Kiwoom, Toss Securities, Korea Investment) — market-hours trading, structured filings, KOSPI/KOSDAQ.

Rather than duplicate either, GoingUp acts as a **unified portfolio + execution layer** across both. Users connect crypto and equity accounts, see a single net-worth number, rebalance across asset classes, and place orders in either market from one interface.

**Audience:** Korean-speaking retail investors (primary), with a secondary English surface for inbound/expat users. Default copy is Korean; English is always secondary.

**Competitive / reference surfaces:**
- **Upbit** (upbit.com) — the dominant visual reference for orderbook, candlestick chart, buy/sell panel.
- **Bithumb** (bithumb.com) — reference for asset list, deposit/withdrawal flows, neutrals-first restraint.

**Sources we were given:** no codebase, no Figma, no slide deck. Design direction was inferred from the stated references. Flag this to the user — a real codebase import or Figma link would materially sharpen the kit.

---

## CONTENT FUNDAMENTALS

GoingUp is a **Korean-first** product. Copy is written in Korean with short English equivalents for globally recognised terms (BTC, ETH, KRW, volume).

### Tone & voice
- **Calm, precise, factual.** Money is at stake — no hype, no exclamation marks, no "🚀", no "to the moon."
- **Informative over promotional.** Tell the user what happened: "주문이 체결되었습니다" (Your order has been filled), not "축하합니다! 🎉".
- **Short sentences.** Dashboards have no room for long copy. A label is usually 2–6 characters in Korean (보유자산, 거래내역, 입출금).
- **Reserved** — in the Korean design sense of 절제된. Whitespace and restraint signal trust.

### Person & formality
- **Polite-neutral** — 합쇼체 / 해요체 for user-facing confirmations ("주문이 체결되었습니다", "로그인되었습니다").
- Never use informal/banmal (반말).
- "당신" is almost never used — Korean product copy addresses the user implicitly. English copy uses "you" sparingly.

### Casing
- Korean has no case; weight and size carry hierarchy.
- English headings: **Sentence case**, not Title Case ("Top movers today", not "Top Movers Today").
- Ticker symbols and codes: UPPERCASE (BTC, ETH, KOSPI, 005930).
- Unit labels (KRW, USD, USDT): UPPERCASE, mono font.

### Numbers
- Korean number formatting: **comma-separated groups of three**, with 만 / 억 / 조 suffixes for large values in display contexts.
  - Dashboard hero: `₩1,284,500,000` or `12.8억` (contextual).
  - Table cells: always `1,284,500,000` (no suffix) for alignment.
- Currency symbol `₩` precedes KRW; `$` precedes USD; crypto tickers are suffixes (`0.0142 BTC`).
- Percentages: one decimal place, always signed (`+2.5%`, `−0.6%`). Use the real minus sign (U+2212), not hyphen.
- Prices always in tabular mono (`IBM Plex Mono`).

### Emoji
- **Do not use emoji** in product UI. Exception: the brand mark/star (⭐) as a favourite-indicator glyph is acceptable because it reads as an icon, not an emoji.
- Do not use emoji as list bullets, status indicators, or decoration.

### Specific examples
| Situation | ✅ Do | ❌ Don't |
|---|---|---|
| Order filled | 주문이 체결되었습니다 · 0.0142 BTC @ ₩94,210,000 | 🎉 주문 성공! 축하드려요 🚀 |
| Market up | KOSPI +1.24% | KOSPI 급등 중! 🔥 |
| Balance | 총 자산 ₩128,490,210 | 당신의 총 자산은 ₩128,490,210 입니다 |
| Warning | 유의 종목입니다. 체결 전 확인해주세요. | 위험해요!! 조심하세요!! |

---

## VISUAL FOUNDATIONS

### Core visual motifs
- **Density + whitespace.** Tables are dense (6–9px vertical padding on rows); surrounding whitespace is generous. Data breathes, chrome disappears.
- **Neutrals-first, color for meaning.** 90% of the UI is white / grey-neutral. Color only appears where it carries semantic weight: direction (red/blue), brand (signal blue), status.
- **Mono for numbers, sans for everything else.** Every price, balance, volume, timestamp uses IBM Plex Mono with tabular figures. This is the single strongest visual cue.
- **Korean market candle convention.** **Red = up, blue = down.** This is inverted from Western convention and is non-negotiable. Reverse it and Korean users will misread their portfolio.

### Colors
See `colors_and_type.css` for the full token list. Summary:
- **Brand Primary:** `#1A55F0` (signal blue) — CTAs, links, focus, brand moments. Distinct from the "down" blue so they never collide in the same view.
- **Up (상승):** `#F24147` with tint `#FFF5F5` for cell backgrounds.
- **Down (하락):** `#1967D2` with tint `#F3F7FE`.
- **Flat:** `#6B7684`.
- **Neutrals:** 11 steps from `#FFFFFF` through `#0F1419`.
- **Accent:** `#FFB020` (honey) — used sparingly for premium / featured / starred.
- **Dark theme:** true dark (`#0B0D10`), not grey — traders often use dark mode and deep black reduces eye strain in long sessions.

### Type
- **Pretendard Variable** — product sans. De facto Korean UI font; excellent at small sizes, handles Korean + Latin together without falling back.
- **IBM Plex Mono** — tabular numerics. Sharp zero, tabular figures, reads clearly at 11px.
- **Space Grotesk** — display/marketing sans for hero numerics and landing page. Shares Pretendard's geometry.
- Default body: 13–14px. Dashboard tables: 12–13px. Hero numerics: 24–64px.

### Spacing
4px base grid. Step scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 80. Dashboards stick to 8–16; marketing pages use 48–80.

### Backgrounds
- **No gradients as scenery.** The brand gradient (`#0E44D5 → #1A55F0`) appears on the logo mark and occasional hero CTA surfaces only.
- **No hand-drawn illustrations, no patterns, no textures.** Data is the artwork.
- **No full-bleed photography** in product UI. Landing page may use one restrained hero image.
- Panels sit on `#FBFCFD` (bg-panel) floating on `#F7F8FA` (bg-alt). The gap between these two neutrals is what gives the UI structure.

### Animation
- **Short, purposeful.** 120–280ms with `cubic-bezier(0.2, 0, 0, 1)` standard ease.
- **Fade + small-offset translate** for entry (8px rise + fade, 180ms). No bounces, no springs.
- **Number count-up** on price changes (200ms, ease-out) with a brief flash of tint background (red or blue) that fades over 400ms. This is the signature interaction.
- **Price-tick flash:** the row/cell background flashes `--gu-up-weak` or `--gu-down-weak` for ~400ms on every tick. Never flash the number itself.
- **No skeleton shimmers that move**; use a static grey placeholder that fades out.

### Hover states
- Surfaces: `--gu-surface` → `--gu-surface-hover` (`#F4F6F9`). Pure neutral shift, no color tint on hover.
- Buttons: darken 8–10% in L (e.g. primary `#1A55F0` → `#0E44D5`).
- Table rows: background shifts to `#FBFCFD`; no transform, no shadow.

### Press states
- Buttons: further darken (primary → `#0937B5`) and reduce scale to `0.98` for 80ms.
- Table rows: brief flash of `--gu-divider`.

### Borders
- **Hairline borders everywhere** — 1px of `--gu-border` (`#EAECEF`). This is the structural language.
- Stronger `--gu-border-strong` (`#D8DCE2`) for inputs and form controls.
- **No double borders**, no outset/inset 3D borders.

### Shadows / elevation
- Four steps: xs (chips, hover), sm (cards), md (dropdowns/popovers), lg (modals).
- All shadows are **colored with `rgba(15,20,25,x)`** — never pure black. This matches the fg1 text color.
- **Focus ring:** 3px `rgba(26,85,240,0.25)` — always used on keyboard focus; never removed.

### Protection gradients vs capsules
- **Capsules** (pills) are the primary way to group small pieces of metadata (tickers, filters, status).
- **No dark protection gradients** over hero images — the product UI doesn't use hero images.

### Layout rules
- Trading screens: **fixed left rail** (240px) + **fixed right rail** (320px) + fluid center. Header 56px fixed. Footer absent on trading screens.
- Marketing: 1280px max content width, centered.
- Tables are always full-width inside their container.
- Modals: 480px (confirmations), 640px (forms), 960px (detail).

### Transparency and blur
- **Sparingly.** Sticky headers use `rgba(255,255,255,0.92)` + `backdrop-filter: blur(10px)` when scrolled under data.
- Order-book depth bars use `rgba(242,65,71,0.10)` / `rgba(25,103,210,0.10)` — 10% alpha over neutrals.
- No frosted panes in the main UI.

### Imagery vibe
- **Cool, flat, neutral.** If imagery is used (landing page), it's cool-toned, slightly desaturated, never warm or grainy.
- No stock-photo traders. No abstract crypto art. No 3D coins.

### Corner radii
- 4 (chips) / 6 (inputs) / 8 (default buttons, small cards) / 12 (main cards) / 16 (hero cards, modals) / 999 (pills, avatars).
- Default radius is **8**.

### Cards
- Border: 1px `#EAECEF`. Radius: 12. Padding: 16–20px. Shadow: sm (very subtle).
- Dark theme: no shadow, border alone defines the card.
- No colored left-border accents. No emoji decorations. No angular clipped corners.

---

## ICONOGRAPHY

GoingUp uses a **custom icon set** (`assets/icons/`) — 16 bespoke SVG icons tuned to the product's vocabulary (coin, stock, wallet, 입금/출금, orderbook, rebalance, etc.), plus **[Lucide](https://lucide.dev)** as a fallback for generic icons not in the custom set.

- **Grid:** 24×24.
- **Stroke width:** 1.75px, round caps and joins.
- **Sizes:** 16 / 20 / 24 / 32 (default is 20 in dense UI, 24 in nav/headers).
- **Color:** always inherits `currentColor` — never hard-coded.
- **Delivery:** static SVG files in `assets/icons/`. Use as `<img src="...">` for simple cases, or inline the SVG when you need `currentColor` recoloring.

### Custom icons (`assets/icons/`)
| File | Purpose |
|---|---|
| `coin.svg` | Crypto asset class — rounded coin with W serif |
| `stock.svg` | Equity asset class — twin candlesticks |
| `portfolio.svg` | Pie/portfolio view |
| `wallet.svg` | Wallet / 지갑 |
| `deposit.svg` · `withdraw.svg` | 입금 / 출금 — arrows into/out of tray |
| `swap.svg` | Swap / convert between assets |
| `rebalance.svg` | Cross-asset rebalance (two-way sync) |
| `orderbook.svg` | Orderbook view |
| `chart.svg` | Candlestick chart |
| `trending-up.svg` · `trending-down.svg` | Directional indicators (color red/blue at use site) |
| `krw.svg` | KRW / 원 currency mark |
| `star.svg` | Watchlist / favourite |
| `bell.svg` · `shield.svg` · `x.svg` | Notifications, security, close/dismiss |

### Custom marks
- **Logo mark** (`assets/logo-mark.svg`) — rounded-square with ascending arrow/chart trajectory. Expresses "going up."
- **Brand coin glyphs** — not drawn by us. Use real token logos from [cryptocurrency-icons](https://github.com/spothq/cryptocurrency-icons) (CC0) or upstream token-list SVGs for BTC, ETH, XRP, etc. Do **not** hand-draw coin icons.
- **KOSPI/KOSDAQ/NASDAQ** — use text label, not a mark.

### Emoji / unicode
- **No emoji in product UI.**
- Unicode arrow glyphs (▲ ▼) and minus (−, U+2212) are used in direction labels, colored red/blue. This is a Korean-market norm — the filled triangles have strong visual presence in dense tables.
- The `★` / `☆` glyphs are used for the starring/watchlist affordance.

---

## Files in this system

```
/
├── README.md                    ← you are here
├── SKILL.md                     ← skill manifest (also works as an Agent Skill)
├── colors_and_type.css          ← every token; import this
├── assets/
│   ├── logo.svg                 ← full wordmark
│   ├── logo-mark.svg            ← just the mark (favicon / app icon / small spaces)
│   └── logo-inverse.svg         ← for dark / brand-colored backgrounds
├── preview/                     ← design-system preview cards (~15 small cards)
└── ui_kits/
    └── web/                     ← GoingUp web platform kit
        ├── README.md
        ├── index.html           ← interactive demo of the trading dashboard
        └── *.jsx                ← component modules
```

## Index of UI kits
- **`ui_kits/web/`** — the GoingUp web trading platform. Header, left nav, coin list, candle chart, orderbook, buy/sell panel, order history. Click-through interactive.

---

## Caveats & known gaps
- No real codebase, Figma, or slide deck was provided — the system is grounded in the stated Upbit/Bithumb references plus Korean-market conventions, not in ground-truth files.
- **Pretendard** is served from CDN. Drop OTFs into `fonts/` and update `@import` for fully offline builds.
- **Lucide** stands in for the real in-house icon set.
- **Coin glyphs** are not bundled — reference `cryptocurrency-icons` if needed.
- The kit currently covers the web platform. A mobile app kit would be a natural next step.
