"""
Pine Script 스타일 전략 DSL

─── 지표 ───────────────────────────────────────────────────
  SMA(n)            단순이동평균
  EMA(n)            지수이동평균
  RSI(n=14)         RSI
  BB(n=20, std=2)   볼린저밴드  →  bb.upper / bb.mid / bb.lower

─── 조건 ───────────────────────────────────────────────────
  crossover(a, b)   a가 b를 상향 돌파
  crossunder(a, b)  a가 b를 하향 돌파

─── 주문 ───────────────────────────────────────────────────
  buy()             매수
  sell()            매도 (보유 시)

─── 상태 변수 ──────────────────────────────────────────────
  mem(기본값)        이전 바 값 추적 가능 변수
    .set(값)         현재 바 값 설정
    [1]             1봉 전 값  (Pine Script의 var[1] 과 동일)

─── 차트 출력 ──────────────────────────────────────────────
  plt(지표, overlay=True, name=None)
    overlay=True   가격 차트 위에 오버레이
    overlay=False  하단 별도 패널

─── 외부 데이터 ────────────────────────────────────────────
  FGI()   코인 공포탐욕지수 (0~100, 낮을수록 공포) — 일봉 전용

─── 기본 변수 ──────────────────────────────────────────────
  close, open, high, low, volume
  position          보유 중이면 True
  position_size     보유 수량
"""
import ast
import pandas as pd
from backtesting import Strategy


# ── 공포탐욕지수 캐시 ─────────────────────────────────────
_fgi_rt_cache   = {"value": None, "ts": 0.0}
_fgi_hist_cache = {"data":  None, "ts": 0.0}

def _get_fgi_current():
    """현재 FGI 값 — 1시간 캐시"""
    import time, requests
    if time.time() - _fgi_rt_cache["ts"] < 3600 and _fgi_rt_cache["value"] is not None:
        return _fgi_rt_cache["value"]
    try:
        r = requests.get("https://api.alternative.me/fng/?limit=1", timeout=5)
        val = int(r.json()["data"][0]["value"])
    except Exception:
        val = _fgi_rt_cache["value"] or 50
    _fgi_rt_cache.update({"value": val, "ts": time.time()})
    return val

def _get_fgi_history():
    """과거 전체 FGI → {'YYYY-MM-DD': int} — 24시간 캐시"""
    import time, requests
    from datetime import datetime
    if time.time() - _fgi_hist_cache["ts"] < 86400 and _fgi_hist_cache["data"] is not None:
        return _fgi_hist_cache["data"]
    try:
        r = requests.get("https://api.alternative.me/fng/?limit=0&format=json", timeout=15)
        items = r.json()["data"]
        result = {
            datetime.fromtimestamp(int(it["timestamp"])).strftime("%Y-%m-%d"): int(it["value"])
            for it in items
        }
    except Exception:
        result = _fgi_hist_cache["data"] or {}
    _fgi_hist_cache.update({"data": result, "ts": time.time()})
    return result


# ── 지표 계산 함수 ─────────────────────────────────────────

def _sma(arr, n):
    return pd.Series(arr).rolling(n).mean()

def _ema(arr, n):
    return pd.Series(arr).ewm(span=n, adjust=False).mean()

def _rsi(arr, n=14):
    s = pd.Series(arr)
    d = s.diff()
    g = d.clip(lower=0).ewm(com=n - 1, min_periods=n).mean()
    l = (-d.clip(upper=0)).ewm(com=n - 1, min_periods=n).mean()
    return 100 - 100 / (1 + g / l)

def _bb_upper(arr, n, std):
    s = pd.Series(arr)
    return s.rolling(n).mean() + std * s.rolling(n).std()

def _bb_lower(arr, n, std):
    s = pd.Series(arr)
    return s.rolling(n).mean() - std * s.rolling(n).std()

def _bb_mid(arr, n):
    return pd.Series(arr).rolling(n).mean()

def _supertrend(high, low, close, period=10, multiplier=3.0):
    """슈퍼트렌드. 반환: (line_series, direction_series) — direction: 1=상승, -1=하락"""
    import numpy as np
    n = len(close)

    tr = np.zeros(n)
    tr[0] = high[0] - low[0]
    for i in range(1, n):
        tr[i] = max(high[i] - low[i],
                    abs(high[i] - close[i - 1]),
                    abs(low[i]  - close[i - 1]))

    atr = np.zeros(n)
    if period <= n:
        atr[period - 1] = float(np.mean(tr[:period]))
    for i in range(period, n):
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period

    hl2 = (high + low) / 2.0
    bu = hl2 + multiplier * atr
    bl = hl2 - multiplier * atr

    fu = bu.copy()
    fl = bl.copy()
    st  = np.full(n, np.nan)
    dir = np.full(n, np.nan)

    for i in range(1, n):
        fu[i] = bu[i] if (bu[i] < fu[i - 1] or close[i - 1] > fu[i - 1]) else fu[i - 1]
        fl[i] = bl[i] if (bl[i] > fl[i - 1] or close[i - 1] < fl[i - 1]) else fl[i - 1]

        if np.isnan(st[i - 1]):
            st[i],  dir[i]  = fu[i], -1.0
        elif st[i - 1] == fu[i - 1]:
            if close[i] <= fu[i]:
                st[i], dir[i] = fu[i], -1.0
            else:
                st[i], dir[i] = fl[i],  1.0
        else:
            if close[i] >= fl[i]:
                st[i], dir[i] = fl[i],  1.0
            else:
                st[i], dir[i] = fu[i], -1.0

    line_s = pd.Series(st);  line_s[:period] = float('nan')
    dir_s  = pd.Series(dir); dir_s[:period]  = float('nan')
    return line_s, dir_s


def _true_range(high, low, close):
    import numpy as np
    high = np.asarray(high, dtype=float); low = np.asarray(low, dtype=float); close = np.asarray(close, dtype=float)
    n = len(close)
    tr = np.zeros(n)
    tr[0] = high[0] - low[0]
    for i in range(1, n):
        tr[i] = max(high[i] - low[i], abs(high[i] - close[i - 1]), abs(low[i] - close[i - 1]))
    return tr

def _atr(high, low, close, n=14):
    """ATR — Wilder 평활(지수)"""
    tr = _true_range(high, low, close)
    return pd.Series(tr).ewm(alpha=1.0 / n, adjust=False).mean()

def _adx(high, low, close, n=14):
    """ADX, +DI, -DI 반환. ADX 높을수록 추세 강함."""
    import numpy as np
    high = np.asarray(high, dtype=float); low = np.asarray(low, dtype=float); close = np.asarray(close, dtype=float)
    nlen = len(close)
    tr = _true_range(high, low, close)
    plus_dm = np.zeros(nlen); minus_dm = np.zeros(nlen)
    for i in range(1, nlen):
        up = high[i] - high[i - 1]
        dn = low[i - 1] - low[i]
        plus_dm[i]  = up if (up > dn and up > 0) else 0.0
        minus_dm[i] = dn if (dn > up and dn > 0) else 0.0
    atr = pd.Series(tr).ewm(alpha=1.0 / n, adjust=False).mean()
    pdi = 100 * pd.Series(plus_dm).ewm(alpha=1.0 / n, adjust=False).mean() / atr
    mdi = 100 * pd.Series(minus_dm).ewm(alpha=1.0 / n, adjust=False).mean() / atr
    dx  = 100 * (pdi - mdi).abs() / (pdi + mdi).replace(0, float('nan'))
    adx = dx.ewm(alpha=1.0 / n, adjust=False).mean()
    return adx, pdi, mdi

def _macd(close, fast=12, slow=26, signal=9):
    """MACD선, 시그널선, 히스토그램 반환."""
    s = pd.Series(close)
    macd = s.ewm(span=fast, adjust=False).mean() - s.ewm(span=slow, adjust=False).mean()
    sig  = macd.ewm(span=signal, adjust=False).mean()
    return macd, sig, macd - sig

def _donchian(high, low, n=20):
    """돈치안 채널: 상단(N봉 최고가), 하단(N봉 최저가), 중간. shift(1)로 현재봉 제외."""
    hh  = pd.Series(high).rolling(n).max().shift(1)
    ll  = pd.Series(low).rolling(n).min().shift(1)
    return hh, ll, (hh + ll) / 2

def _keltner(high, low, close, n=20, mult=2.0):
    """켈트너 채널: EMA(중간) ± mult*ATR"""
    mid = pd.Series(close).ewm(span=n, adjust=False).mean()
    atr = _atr(high, low, close, n)
    return mid + mult * atr, mid - mult * atr, mid

def _stoch(high, low, close, k=14, d=3):
    """스토캐스틱 %K(평활), %D 반환 (0~100)."""
    h = pd.Series(high).rolling(k).max()
    l = pd.Series(low).rolling(k).min()
    raw = 100 * (pd.Series(close) - l) / (h - l).replace(0, float('nan'))
    kline = raw.rolling(d).mean()
    return kline, kline.rolling(d).mean()

def _zigzag(high, low, close, dev=0.1):
    """인과적 ZigZag (엘리어트 파동 근사용 스윙 피벗).

    핵심: '미확정' 피벗은 절대 노출하지 않음 → repaint/미래참조 없음.
    피벗은 가격이 직전 극값에서 dev(비율)만큼 역행해야 비로소 '확정'됨.

    반환: (dir_s, piv_s, prev_s, leg_s)
      dir : 현재 진행 중인 다리 방향 (+1 상승, -1 하락).
            부호 전환(prev와 다름) = 직전 피벗이 막 확정된 시점.
      piv : 마지막으로 확정된 피벗 가격
      prev: 그 직전 확정 피벗 가격 (piv와 함께 직전 '다리'를 정의)
      leg : 확정된 다리 번호(파동 카운트 근사). 피벗 확정마다 1씩 증가.
    """
    import numpy as np
    high = np.asarray(high, float); low = np.asarray(low, float); close = np.asarray(close, float)
    n = len(close)
    dir_arr = np.full(n, 1.0); piv_arr = np.full(n, close[0])
    prev_arr = np.full(n, close[0]); leg_arr = np.zeros(n)
    direction = 1
    ext = high[0]
    confirmed = close[0]; prev_conf = close[0]; leg = 0
    for i in range(n):
        if direction == 1:
            if high[i] > ext:
                ext = high[i]
            elif low[i] <= ext * (1 - dev):       # 고점에서 dev만큼 하락 → 고점 피벗 확정
                prev_conf, confirmed = confirmed, ext
                direction = -1; ext = low[i]; leg += 1
        else:
            if low[i] < ext:
                ext = low[i]
            elif high[i] >= ext * (1 + dev):       # 저점에서 dev만큼 상승 → 저점 피벗 확정
                prev_conf, confirmed = confirmed, ext
                direction = 1; ext = high[i]; leg += 1
        dir_arr[i] = direction; piv_arr[i] = confirmed
        prev_arr[i] = prev_conf; leg_arr[i] = leg
    return pd.Series(dir_arr), pd.Series(piv_arr), pd.Series(prev_arr), pd.Series(leg_arr)


# ── 지표 프록시 ────────────────────────────────────────────

def _num(x):
    return float(x) if isinstance(x, (_Ind, _Mem)) else x

class _Ind:
    """지표 배열 래퍼. 비교·사칙연산·min/max 모두 자연스럽게 동작합니다."""
    def __init__(self, arr, data=None, key=None):
        self._arr = arr
        self._data = data  # backtesting data ref → len(data.Close)-1 = 현재 봉 절대 인덱스
        self._key = key

    def _bar(self):
        if self._data is not None:
            return len(self._data.Close) - 1
        return len(self._arr) - 1

    @property
    def curr(self):
        i = self._bar()
        v = self._arr[i]
        return float(v)
    @property
    def prev(self):
        i = self._bar() - 1
        return float(self._arr[i]) if i >= 0 else self.curr

    def __float__(self):   return self.curr
    def __int__(self):     return int(self.curr)
    def __bool__(self):    return bool(self.curr)
    def __neg__(self):     return -self.curr
    def __abs__(self):     return abs(self.curr)
    def __gt__(self, o):   return self.curr > _num(o)
    def __lt__(self, o):   return self.curr < _num(o)
    def __ge__(self, o):   return self.curr >= _num(o)
    def __le__(self, o):   return self.curr <= _num(o)
    def __eq__(self, o):   return self.curr == _num(o)
    def __ne__(self, o):   return self.curr != _num(o)
    def __add__(self, o):  return self.curr + _num(o)
    def __radd__(self, o): return _num(o) + self.curr
    def __sub__(self, o):  return self.curr - _num(o)
    def __rsub__(self, o): return _num(o) - self.curr
    def __mul__(self, o):  return self.curr * _num(o)
    def __rmul__(self, o): return _num(o) * self.curr
    def __truediv__(self, o): return self.curr / _num(o)
    def __rtruediv__(self, o): return _num(o) / self.curr
    def __repr__(self):    return f"{self.curr:.4f}"


class _BB:
    def __init__(self, upper, mid, lower):
        self.upper = upper
        self.mid   = mid
        self.lower = lower

class _ST:
    def __init__(self, line, direction):
        self.line      = line
        self.direction = direction

class _MACD:
    def __init__(self, macd, signal, hist):
        self.macd   = macd
        self.signal = signal
        self.hist   = hist

class _ADX:
    def __init__(self, adx, plus_di, minus_di):
        self.adx      = adx
        self.plus_di  = plus_di
        self.minus_di = minus_di

class _Chan:
    """채널형 지표 (돈치안·켈트너): upper / lower / mid"""
    def __init__(self, upper, lower, mid):
        self.upper = upper
        self.lower = lower
        self.mid   = mid

class _Stoch:
    def __init__(self, k, d):
        self.k = k
        self.d = d

class _ZZ:
    """ZigZag 스윙 피벗 (엘리어트 근사). dir/pivot/prev/leg 모두 _Ind."""
    def __init__(self, direction, pivot, prev, leg):
        self.dir   = direction   # +1 상승 다리 / -1 하락 다리
        self.pivot = pivot        # 마지막 확정 피벗 가격
        self.prev  = prev         # 직전 확정 피벗 가격
        self.leg   = leg          # 확정 다리 수(파동 카운트 근사)


# ── 상태 변수 (mem) ────────────────────────────────────────

class _Mem:
    """
    Pine Script의 series 변수와 유사합니다.

    예시:
        flag = mem(0)
        flag.set(1)     # 현재 봉 값 설정
        flag[1]         # 이전 봉 값
    """
    def __init__(self, default):
        self._val  = default
        self._hist = [default]

    def _snapshot(self):
        self._hist.append(self._val)

    def set(self, v):
        self._val = v

    def __getitem__(self, n):
        if n == 0: return self._val
        return self._hist[-n] if len(self._hist) >= n else self._hist[0]

    def __float__(self):   return float(self._val)
    def __int__(self):     return int(self._val)
    def __bool__(self):    return bool(self._val)
    def __eq__(self, o):   return self._val == _num(o)
    def __ne__(self, o):   return self._val != _num(o)
    def __gt__(self, o):   return self._val > _num(o)
    def __lt__(self, o):   return self._val < _num(o)
    def __ge__(self, o):   return self._val >= _num(o)
    def __le__(self, o):   return self._val <= _num(o)
    def __add__(self, o):  return self._val + _num(o)
    def __radd__(self, o): return _num(o) + self._val
    def __sub__(self, o):  return self._val - _num(o)
    def __repr__(self):    return repr(self._val)


# ── crossover / crossunder ────────────────────────────────

def _xover(a, b):
    ap = a.prev if isinstance(a, _Ind) else _num(a)
    ac = a.curr if isinstance(a, _Ind) else _num(a)
    bp = b.prev if isinstance(b, _Ind) else _num(b)
    bc = b.curr if isinstance(b, _Ind) else _num(b)
    return ap < bp and ac >= bc

def _xunder(a, b):
    ap = a.prev if isinstance(a, _Ind) else _num(a)
    ac = a.curr if isinstance(a, _Ind) else _num(a)
    bp = b.prev if isinstance(b, _Ind) else _num(b)
    bc = b.curr if isinstance(b, _Ind) else _num(b)
    return ap > bp and ac <= bc


# ── 컴파일러 ──────────────────────────────────────────────

def compile_script(script: str) -> type:
    # 파라미터 추출
    params = {}
    try:
        for node in ast.parse(script).body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1:
                if isinstance(node.targets[0], ast.Name):
                    try:
                        val = ast.literal_eval(node.value)
                        if isinstance(val, (int, float)):
                            params[node.targets[0].id] = val
                    except Exception:
                        pass
    except Exception:
        pass

    class ScriptStrategy(Strategy):
        _script      = script
        _user_params = dict(params)
        _user_cache  : dict = {}
        _user_inds   : dict = {}
        _mems        : dict = {}
        _mem_counter : int  = 0

        def init(self):
            self._user_cache  = {}
            self._user_inds   = {}
            self._mems        = {}
            self._mem_counter = 0
            s = self

            import numpy as np

            def _to_np(src):
                return np.array(src._arr if isinstance(src, _Ind) else src)

            def SMA(n, source=None):
                key = ('SMA', n, id(source) if source is not None else 'close')
                if key not in s._user_cache:
                    arr = _sma(_to_np(source) if source else _to_np(s.data.Close), n).to_numpy()
                    s._user_cache[key] = _Ind(arr, s.data, key=key)
                return s._user_cache[key]

            def EMA(n, source=None):
                key = ('EMA', n, id(source) if source is not None else 'close')
                if key not in s._user_cache:
                    arr = _ema(_to_np(source) if source else _to_np(s.data.Close), n).to_numpy()
                    s._user_cache[key] = _Ind(arr, s.data, key=key)
                return s._user_cache[key]

            def RSI(n=14):
                key = ('RSI', n)
                if key not in s._user_cache:
                    arr = _rsi(_to_np(s.data.Close), n).to_numpy()
                    s._user_cache[key] = _Ind(arr, s.data, key=key)
                return s._user_cache[key]

            def BB(n=20, std=2):
                ku, km, kl = ('BB_U', n, std), ('BB_M', n), ('BB_L', n, std)
                if ku not in s._user_cache:
                    c = _to_np(s.data.Close)
                    s._user_cache[ku] = _Ind(_bb_upper(c, n, std).to_numpy(), s.data, key=ku)
                    s._user_cache[km] = _Ind(_bb_mid(c, n).to_numpy(),         s.data, key=km)
                    s._user_cache[kl] = _Ind(_bb_lower(c, n, std).to_numpy(),  s.data, key=kl)
                return _BB(s._user_cache[ku], s._user_cache[km], s._user_cache[kl])

            def SUPERT(period=10, multiplier=3.0):
                key_l = ('SUPERT_LINE', period, multiplier)
                key_d = ('SUPERT_DIR',  period, multiplier)
                if key_l not in s._user_cache:
                    import numpy as np
                    h  = _to_np(s.data.High)
                    lo = _to_np(s.data.Low)
                    c  = _to_np(s.data.Close)
                    line_s, dir_s = _supertrend(h, lo, c, period, multiplier)
                    s._user_cache[key_l] = _Ind(line_s.to_numpy(), s.data, key=key_l)
                    s._user_cache[key_d] = _Ind(dir_s.to_numpy(),  s.data, key=key_d)
                return _ST(s._user_cache[key_l], s._user_cache[key_d])

            def ATR(n=14):
                key = ('ATR', n)
                if key not in s._user_cache:
                    arr = _atr(_to_np(s.data.High), _to_np(s.data.Low), _to_np(s.data.Close), n).to_numpy()
                    s._user_cache[key] = _Ind(arr, s.data, key=key)
                return s._user_cache[key]

            def ADX(n=14):
                ka, kp, km = ('ADX', n), ('PDI', n), ('MDI', n)
                if ka not in s._user_cache:
                    a, p, m = _adx(_to_np(s.data.High), _to_np(s.data.Low), _to_np(s.data.Close), n)
                    s._user_cache[ka] = _Ind(a.to_numpy(), s.data, key=ka)
                    s._user_cache[kp] = _Ind(p.to_numpy(), s.data, key=kp)
                    s._user_cache[km] = _Ind(m.to_numpy(), s.data, key=km)
                return _ADX(s._user_cache[ka], s._user_cache[kp], s._user_cache[km])

            def MACD(fast=12, slow=26, signal=9):
                km, ks, kh = ('MACD', fast, slow, signal), ('MACDsig', fast, slow, signal), ('MACDhist', fast, slow, signal)
                if km not in s._user_cache:
                    m, sg, h = _macd(_to_np(s.data.Close), fast, slow, signal)
                    s._user_cache[km] = _Ind(m.to_numpy(),  s.data, key=km)
                    s._user_cache[ks] = _Ind(sg.to_numpy(), s.data, key=ks)
                    s._user_cache[kh] = _Ind(h.to_numpy(),  s.data, key=kh)
                return _MACD(s._user_cache[km], s._user_cache[ks], s._user_cache[kh])

            def DONCHIAN(n=20):
                ku, kl, kc = ('DC_U', n), ('DC_L', n), ('DC_M', n)
                if ku not in s._user_cache:
                    hh, ll, mid = _donchian(_to_np(s.data.High), _to_np(s.data.Low), n)
                    s._user_cache[ku] = _Ind(hh.to_numpy(),  s.data, key=ku)
                    s._user_cache[kl] = _Ind(ll.to_numpy(),  s.data, key=kl)
                    s._user_cache[kc] = _Ind(mid.to_numpy(), s.data, key=kc)
                return _Chan(s._user_cache[ku], s._user_cache[kl], s._user_cache[kc])

            def KELTNER(n=20, mult=2.0):
                ku, kl, kc = ('KC_U', n, mult), ('KC_L', n, mult), ('KC_M', n)
                if ku not in s._user_cache:
                    up, lo, mid = _keltner(_to_np(s.data.High), _to_np(s.data.Low), _to_np(s.data.Close), n, mult)
                    s._user_cache[ku] = _Ind(up.to_numpy(),  s.data, key=ku)
                    s._user_cache[kl] = _Ind(lo.to_numpy(),  s.data, key=kl)
                    s._user_cache[kc] = _Ind(mid.to_numpy(), s.data, key=kc)
                return _Chan(s._user_cache[ku], s._user_cache[kl], s._user_cache[kc])

            def STOCH(k=14, d=3):
                kk, kd = ('STOCH_K', k, d), ('STOCH_D', k, d)
                if kk not in s._user_cache:
                    kline, dline = _stoch(_to_np(s.data.High), _to_np(s.data.Low), _to_np(s.data.Close), k, d)
                    s._user_cache[kk] = _Ind(kline.to_numpy(), s.data, key=kk)
                    s._user_cache[kd] = _Ind(dline.to_numpy(), s.data, key=kd)
                return _Stoch(s._user_cache[kk], s._user_cache[kd])

            def ZIGZAG(dev=0.1):
                kd_, kp, kv, kl = ('ZZ_DIR', dev), ('ZZ_PIV', dev), ('ZZ_PREV', dev), ('ZZ_LEG', dev)
                if kd_ not in s._user_cache:
                    d_, p_, pv_, lg_ = _zigzag(_to_np(s.data.High), _to_np(s.data.Low), _to_np(s.data.Close), dev)
                    s._user_cache[kd_] = _Ind(d_.to_numpy(),  s.data, key=kd_)
                    s._user_cache[kp]  = _Ind(p_.to_numpy(),  s.data, key=kp)
                    s._user_cache[kv]  = _Ind(pv_.to_numpy(), s.data, key=kv)
                    s._user_cache[kl]  = _Ind(lg_.to_numpy(), s.data, key=kl)
                return _ZZ(s._user_cache[kd_], s._user_cache[kp], s._user_cache[kv], s._user_cache[kl])

            def mem(default):
                idx = s._mem_counter; s._mem_counter += 1
                if idx not in s._mems:
                    s._mems[idx] = _Mem(default)
                return s._mems[idx]

            def FGI():
                key = ('FGI',)
                if key not in s._user_cache:
                    import numpy as np
                    history  = _get_fgi_history()
                    date_idx = getattr(type(s), '_date_index', [])
                    arr = np.array([float(history.get(d, np.nan)) for d in date_idx], dtype=float)
                    s._user_cache[key] = _Ind(arr, s.data, key=key)
                return s._user_cache[key]

            local_plt_calls = []

            def plt(indicator, overlay=True, name=None):
                """차트에 지표를 표시합니다. overlay=True: 가격 차트, False: 하단 패널"""
                if isinstance(indicator, _Ind):
                    k = getattr(indicator, '_key', None)
                    if k is None:
                        return
                    if name is None:
                        t = k[0]
                        if   t == 'SMA':  name = f'SMA({k[1]})'
                        elif t == 'EMA':  name = f'EMA({k[1]})'
                        elif t == 'RSI':  name = f'RSI({k[1]})'
                        elif t == 'SUPERT_LINE': name = f"SUPERT({k[1]},{k[2]})"
                        elif t == 'FGI':  name = 'FGI'
                        elif t == 'ATR':  name = f'ATR({k[1]})'
                        elif t == 'ADX':  name = f'ADX({k[1]})'
                        elif t == 'ZZ_PIV':  name = 'ZigZag'
                        elif t == 'ZZ_PREV': name = 'ZigZag prev'
                        else: name = str(k)
                    local_plt_calls.append({'key': k, 'name': name,
                                            'overlay': overlay, 'type': 'ind'})
                elif isinstance(indicator, _BB):
                    for sub_label, sub_ind in [('BB상단', indicator.upper),
                                               ('BB중간', indicator.mid),
                                               ('BB하단', indicator.lower)]:
                        k = getattr(sub_ind, '_key', None)
                        if k is None: continue
                        n_val = k[1] if k else ''
                        sname = name or (f'{sub_label}({n_val})' if n_val else sub_label)
                        local_plt_calls.append({'key': k, 'name': sname,
                                                'overlay': overlay, 'type': 'ind'})
                elif isinstance(indicator, _ST):
                    k = getattr(indicator.line, '_key', None)
                    if k is None:
                        return
                    if name is None:
                        name = f"SUPERT({k[1]},{k[2]})"
                    local_plt_calls.append({'key': k, 'name': name,
                                            'overlay': overlay, 'type': 'supert'})
                elif isinstance(indicator, _MACD):
                    for lbl, sub in [('MACD', indicator.macd), ('Signal', indicator.signal)]:
                        k = getattr(sub, '_key', None)
                        if k is None: continue
                        local_plt_calls.append({'key': k, 'name': name or lbl,
                                                'overlay': False, 'type': 'ind'})
                elif isinstance(indicator, _ADX):
                    k = getattr(indicator.adx, '_key', None)
                    if k is None: return
                    local_plt_calls.append({'key': k, 'name': name or f'ADX({k[1]})',
                                            'overlay': False, 'type': 'ind'})
                elif isinstance(indicator, _Chan):
                    for lbl, sub in [('상단', indicator.upper), ('중간', indicator.mid), ('하단', indicator.lower)]:
                        k = getattr(sub, '_key', None)
                        if k is None: continue
                        local_plt_calls.append({'key': k, 'name': name or f'{k[0]}_{lbl}',
                                                'overlay': overlay, 'type': 'ind'})
                elif isinstance(indicator, _Stoch):
                    for lbl, sub in [('%K', indicator.k), ('%D', indicator.d)]:
                        k = getattr(sub, '_key', None)
                        if k is None: continue
                        local_plt_calls.append({'key': k, 'name': name or f'Stoch {lbl}',
                                                'overlay': False, 'type': 'ind'})

            ns = {
                'SMA': SMA, 'EMA': EMA, 'RSI': RSI, 'BB': BB, 'SUPERT': SUPERT, 'FGI': FGI,
                'ATR': ATR, 'ADX': ADX, 'MACD': MACD, 'DONCHIAN': DONCHIAN, 'KELTNER': KELTNER, 'STOCH': STOCH,
                'atr': ATR, 'adx': ADX, 'macd': MACD, 'donchian': DONCHIAN, 'keltner': KELTNER, 'stoch': STOCH,
                'ZIGZAG': ZIGZAG, 'zigzag': ZIGZAG,
                'sma': SMA, 'ema': EMA, 'rsi': RSI, 'bb': BB, 'supert': SUPERT, 'fgi': FGI,
                'mem': mem, 'plt': plt,
                'close': s.data.Close, 'open': s.data.Open,
                'high':  s.data.High,  'low':  s.data.Low,
                'volume': s.data.Volume,
                'crossover': lambda a, b: False,
                'crossunder': lambda a, b: False,
                'buy': lambda: None, 'sell': lambda: None,
                'position': False, 'position_size': 0,
                **s._user_params,
            }
            exec(s._script, ns)
            s._user_inds = {k: v for k, v in ns.items()
                            if isinstance(v, (_Ind, _BB, _Mem, _ST, _MACD, _ADX, _Chan, _Stoch, _ZZ))}
            type(self)._ind_snapshot = dict(s._user_cache)
            type(self)._plt_calls    = local_plt_calls

        def next(self):
            s = self
            for m in s._mems.values():
                m._snapshot()
            s._mem_counter = 0

            def SMA(n, source=None):
                return s._user_cache.get(('SMA', n, id(source) if source is not None else 'close'))
            def EMA(n, source=None):
                return s._user_cache.get(('EMA', n, id(source) if source is not None else 'close'))
            def RSI(n=14):
                return s._user_cache.get(('RSI', n))
            def BB(n=20, std=2):
                return _BB(s._user_cache.get(('BB_U', n, std)),
                           s._user_cache.get(('BB_M', n)),
                           s._user_cache.get(('BB_L', n, std)))
            def SUPERT(period=10, multiplier=3.0):
                return _ST(s._user_cache.get(('SUPERT_LINE', period, multiplier)),
                           s._user_cache.get(('SUPERT_DIR',  period, multiplier)))
            def ATR(n=14):
                return s._user_cache.get(('ATR', n))
            def ADX(n=14):
                return _ADX(s._user_cache.get(('ADX', n)),
                            s._user_cache.get(('PDI', n)),
                            s._user_cache.get(('MDI', n)))
            def MACD(fast=12, slow=26, signal=9):
                return _MACD(s._user_cache.get(('MACD', fast, slow, signal)),
                             s._user_cache.get(('MACDsig', fast, slow, signal)),
                             s._user_cache.get(('MACDhist', fast, slow, signal)))
            def DONCHIAN(n=20):
                return _Chan(s._user_cache.get(('DC_U', n)),
                             s._user_cache.get(('DC_L', n)),
                             s._user_cache.get(('DC_M', n)))
            def KELTNER(n=20, mult=2.0):
                return _Chan(s._user_cache.get(('KC_U', n, mult)),
                             s._user_cache.get(('KC_L', n, mult)),
                             s._user_cache.get(('KC_M', n)))
            def STOCH(k=14, d=3):
                return _Stoch(s._user_cache.get(('STOCH_K', k, d)),
                              s._user_cache.get(('STOCH_D', k, d)))
            def ZIGZAG(dev=0.1):
                return _ZZ(s._user_cache.get(('ZZ_DIR', dev)),
                           s._user_cache.get(('ZZ_PIV', dev)),
                           s._user_cache.get(('ZZ_PREV', dev)),
                           s._user_cache.get(('ZZ_LEG', dev)))
            def mem(default):
                idx = s._mem_counter; s._mem_counter += 1
                return s._mems.get(idx, _Mem(default))

            def _buy():  s.buy()
            def _sell():
                if s.position:
                    for trade in s.trades:
                        trade.close()

            has_pos = bool(s.position)

            def FGI():
                return s._user_cache.get(('FGI',))

            ns = {
                'SMA': SMA, 'EMA': EMA, 'RSI': RSI, 'BB': BB, 'SUPERT': SUPERT, 'FGI': FGI,
                'ATR': ATR, 'ADX': ADX, 'MACD': MACD, 'DONCHIAN': DONCHIAN, 'KELTNER': KELTNER, 'STOCH': STOCH,
                'atr': ATR, 'adx': ADX, 'macd': MACD, 'donchian': DONCHIAN, 'keltner': KELTNER, 'stoch': STOCH,
                'ZIGZAG': ZIGZAG, 'zigzag': ZIGZAG,
                'sma': SMA, 'ema': EMA, 'rsi': RSI, 'bb': BB, 'supert': SUPERT, 'fgi': FGI,
                'mem': mem, 'plt': lambda *a, **k: None,
                'close':  float(s.data.Close[-1]),
                'open':   float(s.data.Open[-1]),
                'high':   float(s.data.High[-1]),
                'low':    float(s.data.Low[-1]),
                'volume': float(s.data.Volume[-1]),
                'crossover': _xover, 'crossunder': _xunder,
                'buy': _buy, 'sell': _sell,
                'position':      has_pos,
                'position_size': float(s.position.size) if s.position else 0.0,
                **s._user_inds,
                **s._user_params,
            }
            exec(s._script, ns)

    for k, v in params.items():
        setattr(ScriptStrategy, k, v)

    return ScriptStrategy


def live_run(script: str, ticker: str, adapter, *,
             position: bool = None, mem_state: dict = None) -> dict:
    """DSL 전략 스크립트를 실시간 데이터로 실행해 매매 시그널을 반환합니다.

    Args:
        position:  lots 테이블 기준 포지션 보유 여부. None이면 거래소 API로 확인.
        mem_state: 이전 실행에서 저장된 mem 인덱스→값 dict. 없으면 초기값 사용.
    Returns:
        {'signal': 'buy'|'sell'|'none', 'mem_state': {0: val, ...}, 'error': str}
    """
    import math
    import pyupbit
    import numpy as np

    df = pyupbit.get_ohlcv(f"KRW-{ticker}", interval="day", count=501)
    if df is None or len(df) < 20:
        return {'signal': 'none', 'reason': '데이터 부족', 'mem_state': mem_state or {}}
    df = df.iloc[:-1]  # 당일 미완성 봉 제외 — 완성된 봉 기준으로 시그널 판단

    close = df['close'].to_numpy(dtype=float)
    open_ = df['open'].to_numpy(dtype=float)
    high  = df['high'].to_numpy(dtype=float)
    low   = df['low'].to_numpy(dtype=float)
    vol   = df['volume'].to_numpy(dtype=float)

    # 현재 포지션 확인 (lots 테이블 기준값 우선, 없으면 거래소 API 폴백)
    if position is None:
        try:
            holdings = adapter.get_holdings()
            position = any(h['ticker'] == ticker and float(h.get('amt', 0)) > 0
                           for h in holdings)
        except Exception:
            position = False

    # ── 지표 값 래퍼 (curr / prev 지원) ──────────────────────────
    class _V:
        def __init__(self, curr, prev=None):
            def _f(v):
                fv = float(v) if v is not None else 0.0
                return 0.0 if (math.isnan(fv) or math.isinf(fv)) else fv
            self.curr = _f(curr)
            self.prev = _f(prev) if prev is not None else self.curr
        def __float__(self):   return self.curr
        def __int__(self):     return int(self.curr)
        def __bool__(self):    return bool(self.curr)
        def __neg__(self):     return -self.curr
        def __gt__(self, o):   return self.curr > float(o)
        def __lt__(self, o):   return self.curr < float(o)
        def __ge__(self, o):   return self.curr >= float(o)
        def __le__(self, o):   return self.curr <= float(o)
        def __eq__(self, o):   return self.curr == float(o)
        def __add__(self, o):  return self.curr + float(o)
        def __radd__(self, o): return float(o) + self.curr
        def __sub__(self, o):  return self.curr - float(o)
        def __rsub__(self, o): return float(o) - self.curr
        def __mul__(self, o):  return self.curr * float(o)
        def __rmul__(self, o): return float(o) * self.curr
        def __repr__(self):    return f"{self.curr:.4f}"

    def _last2(series):
        return float(series.iloc[-1]), (float(series.iloc[-2]) if len(series) >= 2 else float(series.iloc[-1]))

    def SMA(n, source=None):
        vals = pd.Series(close).rolling(n).mean()
        c, p = _last2(vals); return _V(c, p)

    def EMA(n, source=None):
        vals = pd.Series(close).ewm(span=n, adjust=False).mean()
        c, p = _last2(vals); return _V(c, p)

    def RSI(n=14):
        d = pd.Series(close).diff()
        g = d.clip(lower=0).ewm(com=n - 1, min_periods=n).mean()
        l = (-d.clip(upper=0)).ewm(com=n - 1, min_periods=n).mean()
        vals = 100 - 100 / (1 + g / l)
        c, p = _last2(vals); return _V(c, p)

    class _BB:
        def __init__(self, n, std):
            m = pd.Series(close).rolling(n).mean()
            s = pd.Series(close).rolling(n).std()
            self.upper = _V(float((m + std * s).iloc[-1]))
            self.mid   = _V(float(m.iloc[-1]))
            self.lower = _V(float((m - std * s).iloc[-1]))

    def BB(n=20, std=2): return _BB(n, std)

    def SUPERT(period=10, multiplier=3.0):
        line_s, dir_s = _supertrend(high, low, close, period, multiplier)
        cl, pl = _last2(line_s)
        cd, pd_ = _last2(dir_s)
        return _ST(_V(cl, pl), _V(cd, pd_))

    def ATR(n=14):
        c, p = _last2(_atr(high, low, close, n)); return _V(c, p)

    def ADX(n=14):
        a, pdi, mdi = _adx(high, low, close, n)
        ca, pa = _last2(a); cp, pp = _last2(pdi); cm, pm = _last2(mdi)
        return _ADX(_V(ca, pa), _V(cp, pp), _V(cm, pm))

    def MACD(fast=12, slow=26, signal=9):
        m, sg, h = _macd(close, fast, slow, signal)
        cm, pm = _last2(m); cs, ps = _last2(sg); ch, ph = _last2(h)
        return _MACD(_V(cm, pm), _V(cs, ps), _V(ch, ph))

    def DONCHIAN(n=20):
        hh, ll, mid = _donchian(high, low, n)
        cu, pu = _last2(hh); cl_, pl_ = _last2(ll); cmi, pmi = _last2(mid)
        return _Chan(_V(cu, pu), _V(cl_, pl_), _V(cmi, pmi))

    def KELTNER(n=20, mult=2.0):
        up, lo, mid = _keltner(high, low, close, n, mult)
        cu, pu = _last2(up); cl_, pl_ = _last2(lo); cmi, pmi = _last2(mid)
        return _Chan(_V(cu, pu), _V(cl_, pl_), _V(cmi, pmi))

    def STOCH(k=14, d=3):
        kline, dline = _stoch(high, low, close, k, d)
        ck, pk = _last2(kline); cd_, pd_ = _last2(dline)
        return _Stoch(_V(ck, pk), _V(cd_, pd_))

    def ZIGZAG(dev=0.1):
        d_, p_, pv_, lg_ = _zigzag(high, low, close, dev)
        cd_, pd2 = _last2(d_); cp, pp = _last2(p_)
        cv, pv = _last2(pv_); cl, pl = _last2(lg_)
        return _ZZ(_V(cd_, pd2), _V(cp, pp), _V(cv, pv), _V(cl, pl))

    def _xover(a, b):
        ac = a.curr if isinstance(a, _V) else float(a)
        ap = a.prev if isinstance(a, _V) else ac
        bc = b.curr if isinstance(b, _V) else float(b)
        bp = b.prev if isinstance(b, _V) else bc
        return ap < bp and ac >= bc

    def _xunder(a, b):
        ac = a.curr if isinstance(a, _V) else float(a)
        ap = a.prev if isinstance(a, _V) else ac
        bc = b.curr if isinstance(b, _V) else float(b)
        bp = b.prev if isinstance(b, _V) else bc
        return ap > bp and ac <= bc

    signals = []
    def _buy():  signals.append('buy')
    def _sell(): signals.append('sell')

    class _Mem:
        def __init__(self, d): self._v = d
        def set(self, v): self._v = v
        def __getitem__(self, n): return self._v
        def __float__(self):   return float(self._v)
        def __int__(self):     return int(self._v)
        def __bool__(self):    return bool(self._v)
        def __eq__(self, o):   return self._v == (o._v if isinstance(o, _Mem) else o)
        def __ne__(self, o):   return self._v != (o._v if isinstance(o, _Mem) else o)
        def __gt__(self, o):   return self._v >  (o._v if isinstance(o, _Mem) else o)
        def __lt__(self, o):   return self._v <  (o._v if isinstance(o, _Mem) else o)
        def __ge__(self, o):   return self._v >= (o._v if isinstance(o, _Mem) else o)
        def __le__(self, o):   return self._v <= (o._v if isinstance(o, _Mem) else o)
        def __repr__(self):    return repr(self._v)

    mem_counter = [0]
    loaded = mem_state or {}
    mems = {int(k): _Mem(v) for k, v in loaded.items()}
    def mem(default):
        idx = mem_counter[0]; mem_counter[0] += 1
        if idx not in mems: mems[idx] = _Mem(default)
        return mems[idx]

    def FGI():
        v = _get_fgi_current()
        return _V(v, v)

    ns = {
        'SMA': SMA, 'EMA': EMA, 'RSI': RSI, 'BB': BB, 'SUPERT': SUPERT, 'FGI': FGI,
        'ATR': ATR, 'ADX': ADX, 'MACD': MACD, 'DONCHIAN': DONCHIAN, 'KELTNER': KELTNER, 'STOCH': STOCH,
        'atr': ATR, 'adx': ADX, 'macd': MACD, 'donchian': DONCHIAN, 'keltner': KELTNER, 'stoch': STOCH,
        'ZIGZAG': ZIGZAG, 'zigzag': ZIGZAG,
        'sma': SMA, 'ema': EMA, 'rsi': RSI, 'bb': BB, 'supert': SUPERT, 'fgi': FGI,
        'mem': mem, 'plt': lambda *a, **k: None,
        'close': float(close[-1]), 'open': float(open_[-1]),
        'high': float(high[-1]),   'low': float(low[-1]),
        'volume': float(vol[-1]),
        'crossover': _xover, 'crossunder': _xunder,
        'buy': _buy, 'sell': _sell,
        'position': position, 'position_size': 0.0,
    }
    try:
        exec(script, ns)
    except Exception as e:
        return {'signal': 'none', 'error': str(e), 'mem_state': {k: m._v for k, m in mems.items()}}

    return {'signal': signals[-1] if signals else 'none',
            'mem_state': {k: m._v for k, m in mems.items()}}


SCRIPT_TEMPLATE = """\
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
"""
