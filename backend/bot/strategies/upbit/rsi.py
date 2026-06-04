# ─── 파라미터 ──────────────────────────────
n      = 14
buy_th = 45
sell_th = 55

# ─── 지표 ───────────────────────────────────
rsi_val = RSI(n)

# ─── 매매 조건 ──────────────────────────────
if rsi_val < buy_th and not position:
    buy()

if rsi_val > sell_th and position:
    sell()
