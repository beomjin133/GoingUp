"""
백테스트 하니스 — 과적합 방지를 위한 in-sample / out-of-sample 분할 검증.

- 데이터: bot/_btc_day.csv (BTC 일봉 약 5.5년)
- 전반부(IS)로 전략/파라미터를 고르고, 후반부(OOS)로 검증한다.
- 앱과 동일한 compile_script 엔진 + FractionalBacktest 를 사용한다.
"""
import os, sys, math, warnings
warnings.filterwarnings("ignore")

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)          # script_runner
sys.path.insert(0, os.path.join(HERE, '..'))

import pandas as pd
import numpy as np
from backtesting.lib import FractionalBacktest
from script_runner import compile_script

CSV = os.path.join(HERE, '_btc_day.csv')
CASH = 1_000_000
COMMISSION = 0.0005   # 0.05%

_df_full = pd.read_csv(CSV, index_col=0, parse_dates=True)


def split(frac=0.5):
    n = len(_df_full)
    cut = int(n * frac)
    return _df_full.iloc[:cut].copy(), _df_full.iloc[cut:].copy()


def run(code, df):
    """전략 코드를 df에 백테스트. 통계 dict 반환."""
    Strat = compile_script(code)
    Strat._date_index = [dt.strftime("%Y-%m-%d") for dt in df.index]
    bt = FractionalBacktest(df, Strat, cash=CASH, commission=COMMISSION,
                            exclusive_orders=True, finalize_trades=True)
    s = bt.run()

    def sf(v, d=0.0):
        try:
            f = float(v)
            return d if (math.isnan(f) or math.isinf(f)) else f
        except Exception:
            return d

    return {
        "ret":    sf(s["Return [%]"]),
        "ann":    sf(s.get("Return (Ann.) [%]", 0)),
        "mdd":    sf(s["Max. Drawdown [%]"]),
        "win":    sf(s.get("Win Rate [%]", 0)),
        "trades": int(s["# Trades"]),
        "sharpe": sf(s.get("Sharpe Ratio", 0)),
        "bh":     sf(s.get("Buy & Hold Return [%]", 0)),
    }


def evaluate(name, code, verbose=True):
    is_df, oos_df = split(0.5)
    r_is  = run(code, is_df)
    r_oos = run(code, oos_df)
    if verbose:
        print(f"\n=== {name} ===")
        hdr = f"{'':6} {'Ann%':>8} {'Ret%':>8} {'MDD%':>8} {'Win%':>7} {'Trades':>7} {'Sharpe':>7} {'B&H%':>8}"
        print(hdr)
        for lbl, r in [("IS", r_is), ("OOS", r_oos)]:
            print(f"{lbl:6} {r['ann']:8.1f} {r['ret']:8.1f} {r['mdd']:8.1f} "
                  f"{r['win']:7.1f} {r['trades']:7d} {r['sharpe']:7.2f} {r['bh']:8.1f}")
    return r_is, r_oos


if __name__ == "__main__":
    a, b = split(0.5)
    print("FULL :", _df_full.index[0].date(), "->", _df_full.index[-1].date(), len(_df_full))
    print("IS   :", a.index[0].date(), "->", a.index[-1].date(), len(a))
    print("OOS  :", b.index[0].date(), "->", b.index[-1].date(), len(b))
