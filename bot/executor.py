import sys
import os
import json as _json
import importlib
import importlib.util
from datetime import datetime
from croniter import croniter

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'bot'))

from database import get_conn
from exchanges import ADAPTERS


def load_adapter_map():
    print("[executor] 어댑터 로드 중...")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT service, access_key, secret_key, memo FROM api_keys")
            rows = cur.fetchall()

    adapter_map = {}
    for row in rows:
        service = row['service'].lower()
        cls = ADAPTERS.get(service)
        if cls:
            adapter_map[service] = cls(
                access_key=row['access_key'],
                secret_key=row['secret_key'],
                memo=row['memo'] or '',
                service=row['service'],
            )
            print(f"  ✓ {service}")
        else:
            print(f"  ✗ {service} (미등록 거래소)")
    return adapter_map

def should_run(cron_expr, last_run):
    now = datetime.now()
    base = last_run if last_run else datetime(now.year, now.month, now.day, 0, 0, 0)
    return croniter(cron_expr, base).get_next(datetime) <= now

def execute_signal(signal, strategy_row, adapter):
    ticker = strategy_row['ticker']
    amount = strategy_row['amount']
    action = signal.get('signal', 'none')

    if action == 'buy':
        # 이미 이 전략으로 매수한 lot 조회
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, amt, price FROM lots WHERE ticker = %s AND source = 'auto' AND strategy_id = %s",
                    (ticker, strategy_row['id'])
                )
                existing = cur.fetchone()

        if existing:
            invested = float(existing['amt']) * float(existing['price'])
            diff = float(amount) - invested
            if diff <= 500:  # 500원 미만 차이는 스킵
                print(f"  → 매수 스킵: {ticker} 이미 보유 중 (투자금 {invested:,.0f}원, 목표 {amount:,.0f}원)")
                return None
            buy_amount = diff
            print(f"  → 추가 매수: {ticker} {buy_amount:,.0f}원 (증액분)")
        else:
            buy_amount = float(amount)
            print(f"  → 시장가 매수: {ticker} {buy_amount:,.0f}원")

        result = adapter.place_order('buy', ticker, buy_amount, 0)
    elif action == 'sell':
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT SUM(amt) AS qty FROM lots WHERE ticker = %s AND source = 'auto' AND strategy_id = %s",
                    (ticker, strategy_row['id'])
                )
                row = cur.fetchone()
        qty = float(row['qty'] or 0) if row else 0
        if qty <= 0:
            print(f"  → 매도 건너뜀: {ticker} 이 전략으로 매수한 수량 없음")
            return None
        print(f"  → 시장가 매도: {ticker} {qty} (전략 매수분)")
        result = adapter.place_order('sell', ticker, 0, qty)
    else:
        return None

    if result and result.get('success'):
        import uuid as _uuid
        now        = datetime.now()
        order_uuid = result.get('order_uuid') or str(_uuid.uuid4())
        exec_vol   = result.get('exec_vol', 0) or 0
        exec_price = result.get('exec_price', 0) or 0
        exec_funds = result.get('exec_funds', 0) or 0
        exec_fee   = result.get('exec_fee', 0) or 0
        total      = round(exec_funds) if exec_funds > 0 else round(exec_vol * exec_price)
        service    = strategy_row['service'].lower()
        kind       = 'crypto' if service == 'upbit' else 'equity'
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO logs "
                        "(order_uuid, service, ticker, name, kind, side, amt, price, fee, source, strategy_id, created_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'auto', %s, %s)",
                        (order_uuid, service, ticker, ticker, kind,
                         action, exec_vol, exec_price, exec_fee, strategy_row['id'], now)
                    )
                    if action == 'buy' and exec_vol > 0:
                        if existing:
                            # 기존 lot에 가중평균으로 업데이트
                            old_amt   = float(existing['amt'])
                            old_price = float(existing['price'])
                            new_amt   = old_amt + exec_vol
                            new_price = (old_amt * old_price + exec_vol * exec_price) / new_amt
                            cur.execute(
                                "UPDATE lots SET amt = %s, price = %s WHERE id = %s",
                                (new_amt, new_price, existing['id'])
                            )
                        else:
                            cur.execute(
                                "INSERT IGNORE INTO lots (id, ticker, date, time, amt, price, source, strategy_id) "
                                "VALUES (%s, %s, %s, %s, %s, %s, 'auto', %s)",
                                (order_uuid, ticker, now.date(), now.time(), exec_vol, exec_price, strategy_row['id'])
                            )
                    elif action == 'sell':
                        cur.execute(
                            "DELETE FROM lots WHERE ticker = %s AND source = 'auto' AND strategy_id = %s",
                            (ticker, strategy_row['id'])
                        )
                        cur.execute(
                            "UPDATE strategies SET amount = %s WHERE id = %s",
                            (total, strategy_row['id'])
                        )
        except Exception as e:
            print(f"  DB 기록 실패: {e}")

    return result


def run():
    now = datetime.now()
    print(f"\n[executor] 시작 {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 40)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM strategies WHERE enabled = 1")
            strategies = cur.fetchall()

    if not strategies:
        print("[executor] 실행 중인 전략 없음")
        return

    print(f"[executor] 활성 전략 {len(strategies)}개 발견")
    adapter_map = load_adapter_map()
    print()

    for s in strategies:
        label = f"{s['service']}/{s['strategy']} ({s['ticker']})"
        print(f"[{label}]")

        try:
            if not should_run(s['cron'], s['last_run']):
                next_run = croniter(s['cron'], s['last_run']).get_next(datetime)
                print(f"  건너뜀 — 다음 실행: {next_run.strftime('%H:%M:%S')}")
                continue

            adapter = adapter_map.get(s['service'].lower())
            if not adapter:
                print(f"  오류: 어댑터 없음")
                continue

            mod_name = f"strategies.{s['service'].lower()}.{s['strategy']}"
            spec = importlib.util.find_spec(mod_name)
            if not spec or not spec.origin:
                raise FileNotFoundError(f"전략 파일을 찾을 수 없음: {mod_name}")

            strategy_file = spec.origin
            print(f"  전략 파일 로드: {strategy_file}")

            with open(strategy_file, encoding='utf-8') as _f:
                script_code = _f.read()

            if 'def run(' in script_code:
                mod = importlib.import_module(mod_name)
                importlib.reload(mod)
                signal = mod.run(s['ticker'], adapter, s['amount'], s['params'] or {})
            else:
                from script_runner import live_run

                with get_conn() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT SUM(amt) AS qty FROM lots "
                            "WHERE ticker = %s AND source = 'auto' AND strategy_id = %s",
                            (s['ticker'], s['id'])
                        )
                        lot_row = cur.fetchone()
                position = float(lot_row['qty'] or 0) > 0 if lot_row else False

                with get_conn() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT idx, value FROM strategy_state WHERE strategy_id = %s",
                            (s['id'],)
                        )
                        mem_state = {row['idx']: _json.loads(row['value'])
                                     for row in cur.fetchall()}

                signal = live_run(script_code, s['ticker'], adapter,
                                  position=position, mem_state=mem_state)

                new_state = signal.get('mem_state', {})
                if new_state:
                    try:
                        with get_conn() as conn:
                            with conn.cursor() as cur:
                                for idx, val in new_state.items():
                                    cur.execute(
                                        "INSERT INTO strategy_state (strategy_id, idx, value) "
                                        "VALUES (%s, %s, %s) "
                                        "ON DUPLICATE KEY UPDATE value = VALUES(value), "
                                        "updated_at = CURRENT_TIMESTAMP",
                                        (s['id'], idx, _json.dumps(val))
                                    )
                    except Exception as e:
                        print(f"  mem 상태 저장 실패: {e}")
            print(f"  시그널: {signal}")

            execute_signal(signal, s, adapter)

            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE strategies SET last_run = %s WHERE id = %s",
                        (now, s['id'])
                    )
            print(f"  완료 — last_run 업데이트")

        except Exception as e:
            print(f"  오류: {e}")

        print()

    print("-" * 40)
    print("[executor] 종료")


if __name__ == '__main__':
    run()
