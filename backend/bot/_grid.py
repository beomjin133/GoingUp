"""그리드 서치 — IS에서 후보 탐색, 상위 후보를 OOS로 검증."""
import os, sys, math, warnings, contextlib, io
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
from _harness import run, split

IS_DF, OOS_DF = split(0.5)

@contextlib.contextmanager
def quiet():
    with contextlib.redirect_stderr(io.StringIO()):
        yield

def score(r):
    """낮은 MDD + 높은 연수익 + 높은 승률 종합. Calmar 가중 + 승률."""
    mdd = abs(r["mdd"]) or 1e-9
    calmar = r["ann"] / mdd
    return calmar + r["win"] / 100.0

def test(code):
    with quiet():
        return run(code, IS_DF), run(code, OOS_DF)

def fmt(r):
    return (f"ann={r['ann']:6.1f} ret={r['ret']:7.1f} mdd={r['mdd']:6.1f} "
            f"win={r['win']:5.1f} tr={r['trades']:3d} shp={r['sharpe']:5.2f}")

def grid(name, template, combos):
    print(f"\n########## {name} ##########")
    rows = []
    for params in combos:
        code = template(*params)
        with quiet():
            r_is = run(code, IS_DF)
        rows.append((params, r_is, code))
    # IS 점수 상위 정렬
    rows.sort(key=lambda x: score(x[1]), reverse=True)
    print(f"{'params':28} | IS  " + " "*44 + "| OOS")
    for params, r_is, code in rows[:8]:
        with quiet():
            r_oos = run(code, OOS_DF)
        print(f"{str(params):28} | {fmt(r_is)} | {fmt(r_oos)}  sc={score(r_is):.2f}")
    return rows
