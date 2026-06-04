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

─── 기본 변수 ──────────────────────────────────────────────
  close, open, high, low, volume
  position          보유 중이면 True
  position_size     보유 수량
"""
import ast
import pandas as pd
from backtesting import Strategy


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


# ── 지표 프록시 ────────────────────────────────────────────

def _num(x):
    return float(x) if isinstance(x, (_Ind, _Mem)) else x

class _Ind:
    """지표 배열 래퍼. 비교·사칙연산·min/max 모두 자연스럽게 동작합니다."""
    def __init__(self, arr, data=None):
        self._arr = arr
        self._data = data  # backtesting data ref → len(data.Close)-1 = 현재 봉 절대 인덱스

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
                    s._user_cache[key] = _Ind(arr, s.data)
                return s._user_cache[key]

            def EMA(n, source=None):
                key = ('EMA', n, id(source) if source is not None else 'close')
                if key not in s._user_cache:
                    arr = _ema(_to_np(source) if source else _to_np(s.data.Close), n).to_numpy()
                    s._user_cache[key] = _Ind(arr, s.data)
                return s._user_cache[key]

            def RSI(n=14):
                key = ('RSI', n)
                if key not in s._user_cache:
                    arr = _rsi(_to_np(s.data.Close), n).to_numpy()
                    s._user_cache[key] = _Ind(arr, s.data)
                return s._user_cache[key]

            def BB(n=20, std=2):
                ku, km, kl = ('BB_U', n, std), ('BB_M', n), ('BB_L', n, std)
                if ku not in s._user_cache:
                    c = _to_np(s.data.Close)
                    s._user_cache[ku] = _Ind(_bb_upper(c, n, std).to_numpy(), s.data)
                    s._user_cache[km] = _Ind(_bb_mid(c, n).to_numpy(),         s.data)
                    s._user_cache[kl] = _Ind(_bb_lower(c, n, std).to_numpy(),  s.data)
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
                    s._user_cache[key_l] = _Ind(line_s.to_numpy(), s.data)
                    s._user_cache[key_d] = _Ind(dir_s.to_numpy(),  s.data)
                return _ST(s._user_cache[key_l], s._user_cache[key_d])

            def mem(default):
                idx = s._mem_counter; s._mem_counter += 1
                if idx not in s._mems:
                    s._mems[idx] = _Mem(default)
                return s._mems[idx]

            ns = {
                'SMA': SMA, 'EMA': EMA, 'RSI': RSI, 'BB': BB, 'SUPERT': SUPERT,
                'sma': SMA, 'ema': EMA, 'rsi': RSI, 'bb': BB, 'supert': SUPERT,
                'mem': mem,
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
                            if isinstance(v, (_Ind, _BB, _Mem))}
            type(self)._ind_snapshot = dict(s._user_cache)

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
            def mem(default):
                idx = s._mem_counter; s._mem_counter += 1
                return s._mems.get(idx, _Mem(default))

            def _buy():  s.buy()
            def _sell():
                if s.position:
                    for trade in s.trades:
                        trade.close()

            has_pos = bool(s.position)

            ns = {
                'SMA': SMA, 'EMA': EMA, 'RSI': RSI, 'BB': BB, 'SUPERT': SUPERT,
                'sma': SMA, 'ema': EMA, 'rsi': RSI, 'bb': BB, 'supert': SUPERT,
                'mem': mem,
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


def live_run(script: str, ticker: str, adapter) -> dict:
    """DSL 전략 스크립트를 실시간 데이터로 실행해 매매 시그널을 반환합니다."""
    import math
    import pyupbit
    import numpy as np

    df = pyupbit.get_ohlcv(f"KRW-{ticker}", interval="day", count=200)
    if df is None or len(df) < 20:
        return {'signal': 'none', 'reason': '데이터 부족'}

    close = df['close'].to_numpy(dtype=float)
    open_ = df['open'].to_numpy(dtype=float)
    high  = df['high'].to_numpy(dtype=float)
    low   = df['low'].to_numpy(dtype=float)
    vol   = df['volume'].to_numpy(dtype=float)

    # 현재 포지션 확인
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
        def __float__(self): return float(self._v)
        def __bool__(self): return bool(self._v)

    mem_counter = [0]
    mems = {}
    def mem(default):
        idx = mem_counter[0]; mem_counter[0] += 1
        if idx not in mems: mems[idx] = _Mem(default)
        return mems[idx]

    ns = {
        'SMA': SMA, 'EMA': EMA, 'RSI': RSI, 'BB': BB, 'SUPERT': SUPERT,
        'sma': SMA, 'ema': EMA, 'rsi': RSI, 'bb': BB, 'supert': SUPERT,
        'mem': mem,
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
        return {'signal': 'none', 'error': str(e)}

    return {'signal': signals[-1] if signals else 'none'}


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
