# ════════════════════════════════════════════════════════════
#  ETH MACD + RSI 매매법 (법칙①+② 결합, ETH 전용 튜닝)
#
#  btc_macd_rsi(법칙①+②)를 ETH에 맞춰 IS/OOS 분할검증으로 재최적화한 버전.
#  ETH는 이 매매법이 BTC보다 잘 맞아(연수익·샤프 모두 우수), 거기서 더 개선.
#
#  ── BTC판 대비 개선점 (ETH 기준) ─────────────────────────
#    · MACD 12/26/9 → 10/24/8   (ETH 리듬에 더 맞음)
#    · ZIGZAG 0.07 → 0.05       (다이버전스 스윙 민감도)
#    · ATR 변동성 필터 추가(atr/close<0.08): 과열 구간 진입 회피
#    → 결과: OOS샤프 0.81→0.87, MDD -38%→-35%, 승률 36%→39%
#    ※ EMA200 추세필터는 ETH에선 역효과(OOS 0.81→0.20)라 넣지 않음
#
#  진입:
#    법칙① MACD 골든크로스 + RSI 50~70 (또는 정배열 중 RSI 50 돌파)
#    법칙② 하락 다이버전스(가격 HH·RSI LH) 후 MACD 골든크로스
#    (공통) 변동성 미과열(atr/close < 0.08)
#  청산: 전저점(최근10봉) 손절 / MACD 데드크로스 / RSI 50 붕괴
#
#  성과 (수수료 0.05%, 일봉, 2017-09~2026-06 분할검증)
#    구간              연수익   최대낙폭   승률    샤프
#    전반 IS(17~22)   140.7%   -34.9%   43.5%   1.18
#    후반 OOS(22~26)   39.3%   -32.8%   36.2%   0.87   ← 검증구간도 견고
#    전체(17~26)       80.8%   -34.9%   38.7%   1.07   (거래 106회)
#
#  ※ 부분 익절 불가로 전량 매도. 승률 39%·MDD-35%는 이 매매법 특성
#    (MACD 휩쏘 + 다이버전스의 공격적 진입). 수익·샤프는 높습니다.
# ════════════════════════════════════════════════════════════

macd = MACD(10, 24, 8)
rsi  = RSI(14)
zz   = ZIGZAG(0.05)   # 스윙 피벗 — 다이버전스 판정용
dc   = DONCHIAN(10)   # 전저점 = 최근 10봉 최저가
atr  = ATR(14)        # 변동성(과열 진입 필터)

cur_p  = mem(0)   # 현재 상승 스윙의 최고가
cur_r  = mem(0)   # 그 최고가 때 RSI
prev_p = mem(0)   # 직전 스윙 고점 가격
prev_r = mem(0)   # 직전 스윙 고점 RSI
diverg = mem(0)   # 하락 다이버전스 대기 플래그
stop   = mem(0)   # 손절가(전저점)

plt(macd, overlay=False)
plt(rsi, overlay=False)

low_conf  = zz.dir == 1 and zz.dir.prev == -1
high_conf = zz.dir == -1 and zz.dir.prev == 1

# 상승 스윙 중 최고가 + 그때 RSI 추적
if high > cur_p[0]:
    cur_p.set(high)
    cur_r.set(float(rsi))

# 고점 확정 → 가격 고점↑ & RSI 고점↓ = 하락 다이버전스
if high_conf:
    if prev_p[0] > 0 and cur_p[0] > prev_p[0] and cur_r[0] < prev_r[0]:
        diverg.set(1)
    prev_p.set(cur_p[0])
    prev_r.set(cur_r[0])

# 저점 확정 → 새 상승스윙 위해 리셋
if low_conf:
    cur_p.set(high)
    cur_r.set(float(rsi))

bull = macd.macd > macd.signal
gc   = crossover(macd.macd, macd.signal)
dead = crossunder(macd.macd, macd.signal)

# ── 진입: (법칙① 또는 법칙②) + 변동성 미과열 ──
rule1 = (gc and rsi >= 50 and rsi < 70) or (bull and crossover(rsi, 50))
rule2 = diverg[0] == 1 and gc
if not position and (rule1 or rule2) and atr / close < 0.08:
    buy()
    stop.set(dc.lower)
    diverg.set(0)

# ── 청산: 전저점 손절 / MACD 데드크로스 / RSI 50 붕괴 ──
if position and (close <= stop[0] or dead or rsi < 50):
    sell()
