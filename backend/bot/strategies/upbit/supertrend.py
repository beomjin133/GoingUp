st = SUPERT()

plt(st)

# ─── 매매 조건 ──────────────────────────────
if close >= st.line and not position:
    buy()

if close <= st.line and position:
    sell()
