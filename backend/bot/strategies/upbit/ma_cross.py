# ─── 파라미터 ──────────────────────────────
n_fast = 5
n_slow = 20

# ─── 지표 ───────────────────────────────────
fast = SMA(n_fast)
slow = SMA(n_slow)

# ─── 매매 조건 ──────────────────────────────
if crossover(fast, slow):
    buy()

if crossunder(fast, slow):
    sell()
