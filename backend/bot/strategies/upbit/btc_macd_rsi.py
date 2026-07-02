# ════════════════════════════════════════════════════════════
#  BTC MACD + RSI 매매법 (법칙① + 법칙② 결합)
#
#  법칙① MACD 크로스: 골든크로스 + RSI 50~70 (또는 정배열 중 RSI 50 돌파)
#  법칙② RSI 하락 다이버전스: 가격 고점↑ 인데 RSI 고점↓(매수에너지 약화)이
#         나온 뒤, 조정·바닥을 지나 MACD 골든크로스가 다시 뜰 때 진입
#         (이때는 강한 시세라 RSI 과열권이어도 진입 허용)
#
#  ── 다이버전스 구현 방식 ──────────────────────────────────
#    ZIGZAG으로 스윙 고점을 잡고, 각 상승 스윙의 '최고가'와 '그때의 RSI'를
#    mem에 기억 → 직전 스윙 고점과 비교해 (가격 HH & RSI LH)면 다이버전스로
#    판정(diverg=1). 그 뒤 첫 MACD 골든크로스에서 매수.
#
#  ── 엔진 한계로 각색한 부분 ───────────────────────────────
#    · 부분 익절(절반 매도) 불가 → 전량 매도
#    · 청산은 두 법칙 공통으로: 전저점(최근10봉) 손절 / MACD 데드크로스 /
#      RSI 50 붕괴 중 하나 (2R 전량익절 대신 추세를 끝까지 활용)
#
#  성과 (수수료 0.05%, 일봉, 2017-09~2026-06 분할검증)
#    구간              연수익   최대낙폭   승률    샤프
#    전반 IS(17~22)   120.5%   -46.0%   38.5%   1.14
#    후반 OOS(22~26)   16.2%   -22.9%   36.0%   0.70
#    전체(17~26)       59.1%   -46.0%   36.5%   1.02   (거래 104회)
#
#  ※ 솔직한 평가: 다이버전스 진입을 추가하면 수익은 오르지만(법칙①만이면
#    연47%·MDD-32%) 낙폭이 -46%로 커지고 OOS 견고성은 개선되지 않습니다.
#    다이버전스는 단독으론 신뢰도 낮은 신호라, '수익↑·위험↑'의 트레이드오프로
#    이해하세요. 위험을 줄이려면 법칙①만(다이버전스 제외) 쓰는 게 낫습니다.
# ════════════════════════════════════════════════════════════

macd = MACD(12, 26, 9)
rsi  = RSI(14)
zz   = ZIGZAG(0.07)   # 스윙 피벗 (7% 편차) — 다이버전스 판정용
dc   = DONCHIAN(10)   # 전저점 = 최근 10봉 최저가

cur_p  = mem(0)   # 현재 상승 스윙의 최고가
cur_r  = mem(0)   # 그 최고가 때 RSI
prev_p = mem(0)   # 직전 스윙 고점 가격
prev_r = mem(0)   # 직전 스윙 고점 RSI
diverg = mem(0)   # 하락 다이버전스 대기 플래그
stop   = mem(0)   # 손절가(전저점)

plt(macd, overlay=False)
plt(rsi, overlay=False)

low_conf  = zz.dir == 1 and zz.dir.prev == -1    # 저점 확정 → 새 상승스윙 시작
high_conf = zz.dir == -1 and zz.dir.prev == 1    # 고점 확정

# 상승 스윙 중 최고가 + 그때의 RSI 추적
if high > cur_p[0]:
    cur_p.set(high)
    cur_r.set(float(rsi))

# 고점 확정 → 직전 고점과 비교: 가격 고점↑ & RSI 고점↓ = 하락 다이버전스
if high_conf:
    if prev_p[0] > 0 and cur_p[0] > prev_p[0] and cur_r[0] < prev_r[0]:
        diverg.set(1)
    prev_p.set(cur_p[0])
    prev_r.set(cur_r[0])

# 저점 확정 → 새 상승스윙 위해 현재 고점 추적 리셋
if low_conf:
    cur_p.set(high)
    cur_r.set(float(rsi))

bull = macd.macd > macd.signal
gc   = crossover(macd.macd, macd.signal)
dead = crossunder(macd.macd, macd.signal)

# ── 진입 ──
#   법칙①: 골든크로스 + RSI 50~70  또는  정배열 중 RSI 50 상향돌파
#   법칙②: 하락 다이버전스 대기 중 골든크로스 (RSI 과열권 허용)
rule1 = (gc and rsi >= 50 and rsi < 70) or (bull and crossover(rsi, 50))
rule2 = diverg[0] == 1 and gc
if not position and (rule1 or rule2):
    buy()
    stop.set(dc.lower)
    diverg.set(0)

# ── 청산: 전저점 손절 / MACD 데드크로스 / RSI 50 붕괴 ──
if position and (close <= stop[0] or dead or rsi < 50):
    sell()
