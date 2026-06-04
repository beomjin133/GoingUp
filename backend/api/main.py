import os
import sys
import time
import threading
import base64
import importlib
import requests as req
from datetime import date, timedelta
from io import BytesIO
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import pyotp
import qrcode

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'bot'))

from database import get_conn
from exchanges import ADAPTERS

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

ALLOWED_IPS = os.getenv("ALLOWED_IPS", "").split(",")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def ip_whitelist(request: Request, call_next):
    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    if client_ip not in ALLOWED_IPS:
        return JSONResponse(status_code=403, content={"detail": "접근 거부"})
    return await call_next(request)


# ── 어댑터 캐시 (인스턴스를 재사용해야 토큰 캐시가 유지됨) ──

_adapters: list = []
_adapters_loaded_at: float = 0
_adapters_lock = threading.Lock()

def get_adapters() -> list:
    global _adapters, _adapters_loaded_at
    if _adapters and time.time() - _adapters_loaded_at < 3600:
        return _adapters
    with _adapters_lock:
        if _adapters and time.time() - _adapters_loaded_at < 3600:
            return _adapters

    rows = []
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT service, access_key, secret_key, memo FROM api_keys")
            rows = cur.fetchall()

    new_adapters = []
    for row in rows:
        service = row['service']
        cls = ADAPTERS.get(service.lower())
        print(f"[adapters] service={service!r} → {'로드됨' if cls else '미등록(스킵)'}")
        if cls:
            new_adapters.append(cls(
                access_key=row['access_key'],
                secret_key=row['secret_key'],
                memo=row['memo'] or '',
                service=row['service'],
            ))
    _adapters = new_adapters
    _adapters_loaded_at = time.time()
    return _adapters


# ── 보유 종목 ────────────────────────────────────────────

@app.get("/api/holdings")
def get_holdings():
    result = []
    for adapter in get_adapters():
        try:
            result.extend(adapter.get_holdings())
        except Exception as e:
            print(f"[{type(adapter).__name__}] get_holdings error: {e}")
    return result


@app.get("/api/holdings/{ticker}/lots")
def get_lots(ticker: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM lots WHERE ticker = %s ORDER BY date DESC",
                (ticker,)
            )
            return cur.fetchall()


@app.delete("/api/lots/{lot_id}")
def delete_lot(lot_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM lots WHERE id = %s", (lot_id,))
    return {'ok': True}


# ── TOTP ─────────────────────────────────────────────────

def _load_totp_secret() -> str:
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT secret_key FROM api_keys WHERE service = 'totp' LIMIT 1")
                row = cur.fetchone()
        if row and row['secret_key']:
            return row['secret_key']
    except Exception as e:
        print(f"[TOTP] DB에서 시크릿 로드 실패: {e}")
    return os.getenv("TOTP_SECRET", "")

TOTP_SECRET = _load_totp_secret()

@app.get("/api/totp/setup")
def totp_setup():
    totp = pyotp.TOTP(TOTP_SECRET)
    uri  = totp.provisioning_uri(name="GoingUp", issuer_name="GoingUp")
    img  = qrcode.make(uri)
    buf  = BytesIO()
    img.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    return {"qr": f"data:image/png;base64,{qr_b64}"}

@app.post("/api/totp/verify")
async def totp_verify(request: Request):
    body = await request.json()
    code = str(body.get("code", ""))
    totp = pyotp.TOTP(TOTP_SECRET)
    if totp.verify(code, valid_window=1):
        return {"success": True}
    return JSONResponse(status_code=401, content={"success": False})


# ── 잔고 ─────────────────────────────────────────────────

@app.get("/api/balance")
def get_balance():
    total = 0.0
    by_service = {}
    for adapter in get_adapters():
        try:
            bal = adapter.get_balance()
            total += bal
            by_service[adapter.service] = round(bal)
        except Exception as e:
            print(f"[{type(adapter).__name__}] get_balance error: {e}")
    return {'krw': round(total), 'by_service': by_service}


# ── 시세 프록시 (코인 전용) ──────────────────────────────

@app.get("/api/ticker")
def get_ticker(markets: str):
    res = req.get(f"https://api.upbit.com/v1/ticker?markets={markets}")
    return res.json()


# ── 포트폴리오 스냅샷 ────────────────────────────────────

def take_snapshot():
    snapshot_date = date.today() - timedelta(days=1)
    total = 0.0
    needs_price = {}

    adapters = get_adapters()
    adapter_map = {a.service.lower(): a for a in adapters if hasattr(a, 'service')}

    for adapter in adapters:
        try:
            total += adapter.get_balance()
        except Exception as e:
            print(f"[snapshot] {type(adapter).__name__} balance error: {e}")
        try:
            for h in adapter.get_holdings():
                if h.get('price') is not None:
                    total += h['amt'] * h['price']
                else:
                    svc = h.get('service', '')
                    needs_price.setdefault(svc, []).append(h)
        except Exception as e:
            print(f"[snapshot] {type(adapter).__name__} holdings error: {e}")

    for svc, holdings in needs_price.items():
        adapter = adapter_map.get(svc)
        if not adapter:
            continue
        try:
            prices = adapter.get_prices([h['ticker'] for h in holdings])
            for h in holdings:
                total += h['amt'] * prices.get(h['ticker'], {}).get('price', 0)
        except Exception as e:
            print(f"[snapshot] {svc} get_prices error: {e}")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO portfolio_snapshots (date, total_value) VALUES (%s, %s) "
                "ON DUPLICATE KEY UPDATE total_value = VALUES(total_value)",
                (snapshot_date, round(total))
            )
    print(f"[snapshot] {snapshot_date} 저장 완료: {round(total):,}원")


def run_strategies():
    import importlib
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM strategies WHERE enabled = 1")
            rows = cur.fetchall()

    adapter_map = {a.service.lower(): a for a in get_adapters()}

    for s in rows:
        try:
            mod     = importlib.import_module(f"strategies.{s['service'].lower()}.{s['strategy']}")
            adapter = adapter_map.get(s['service'].lower())
            if not adapter:
                print(f"[{s['service']}/{s['strategy']}] 어댑터 없음")
                continue
            result = mod.run(s['ticker'], adapter, s['amount'], s['params'] or {})
            print(f"[{s['service']}/{s['strategy']}] {result}")
        except Exception as e:
            print(f"[{s['service']}/{s['strategy']}] 오류: {e}")




# ── 종목 검색 (외부 조회) ────────────────────────────────

@app.get("/api/stock-search")
def stock_search(q: str, kind: str = "equity"):
    q = q.strip()
    if not q:
        return []
    if kind == "equity":
        kis = next((a for a in get_adapters() if a.service.lower() == 'kis'), None)
        if not kis:
            print("[stock-search] KIS 어댑터 없음")
            return []
        result = kis.search_stock(q)
        return [result] if result else []
    if kind == "us":
        try:
            resp = req.get(
                "https://query1.finance.yahoo.com/v1/finance/search",
                params={"q": q, "quotesCount": 10, "newsCount": 0, "listsCount": 0},
                headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
                timeout=5,
            )
            quotes = resp.json().get("quotes", [])
            US_EXCHANGES = {"NMS", "NYQ", "NGM", "PCX", "ASE", "NAS", "BTS"}
            return [
                {"ticker": qt["symbol"], "name": qt.get("longname") or qt.get("shortname") or qt["symbol"],
                 "kind": "us", "price": 0, "daily_pct": 0}
                for qt in quotes
                if qt.get("quoteType") in {"EQUITY", "ETF"} and qt.get("exchange") in US_EXCHANGES
            ]
        except Exception as e:
            print(f"[stock-search/us] error: {e}")
            return []
    return []


# ── 종목 리스트 ──────────────────────────────────────────

@app.get("/api/markets")
def get_markets(kind: str = "crypto"):
    if kind == "crypto":
        try:
            markets_res = req.get("https://api.upbit.com/v1/market/all", timeout=10)
            markets = [m for m in markets_res.json() if m['market'].startswith('KRW-')]
            name_map = {m['market']: m['korean_name'] for m in markets}

            # 100개씩 배치로 나눠서 요청
            all_codes = [m['market'] for m in markets]
            tickers = []
            for i in range(0, len(all_codes), 100):
                batch = ','.join(all_codes[i:i+100])
                r = req.get(f"https://api.upbit.com/v1/ticker?markets={batch}", timeout=10)
                data = r.json()
                if isinstance(data, list):
                    tickers.extend(data)

            price_map = {t['market']: t for t in tickers}
            result = []
            for code, t in price_map.items():
                ticker = code.replace('KRW-', '')
                result.append({
                    'ticker':    ticker,
                    'name':      name_map.get(code, ticker),
                    'price':     t.get('trade_price', 0),
                    'daily_pct': (t.get('signed_change_rate') or 0) * 100,
                    'volume':    t.get('acc_trade_price_24h', 0),
                    'kind':      'crypto',
                })
            print(f"[markets/crypto] {len(result)}개 로드")
            return sorted(result, key=lambda x: -x['volume'])
        except Exception as e:
            print(f"[markets/crypto] error: {e}")
            return []

    holdings_list = []
    for adapter in get_adapters():
        try:
            holdings_list.extend(adapter.get_holdings())
        except Exception as e:
            print(f"[markets] {type(adapter).__name__} error: {e}")

    target_kind = 'equity' if kind == 'equity' else 'us'
    result = [
        {
            'ticker':    h['ticker'],
            'name':      h['name'],
            'price':     h.get('price', 0),
            'daily_pct': h.get('daily_pct', 0),
            'kind':      target_kind,
        }
        for h in holdings_list if h.get('kind') == target_kind
    ]
    print(f"[markets/{kind}] {len(result)}개 로드")
    return result


# ── 주문 ─────────────────────────────────────────────────

@app.post("/api/order")
def place_order(body: dict):
    import uuid as _uuid
    from datetime import datetime
    service = body.get('service', '').lower()
    side    = body.get('side', '')
    ticker  = body.get('ticker', '')
    name    = body.get('name', ticker)
    kind    = body.get('kind', 'crypto')
    price   = float(body.get('price', 0))
    qty     = float(body.get('qty', 0))

    if not service or side not in ('buy', 'sell') or not ticker or price <= 0 or qty <= 0:
        return {'success': False, 'msg': '입력값을 확인해주세요'}

    adapter_map = {a.service.lower(): a for a in get_adapters() if hasattr(a, 'service')}
    adapter = adapter_map.get(service)
    if not adapter:
        return {'success': False, 'msg': f'연결된 거래소가 없습니다: {service}'}

    try:
        result = adapter.place_order(side, ticker, price, qty)
    except Exception as e:
        print(f"[order] {service} error: {e}")
        return {'success': False, 'msg': str(e)}

    if result.get('success'):
        now        = datetime.now()
        exec_qty   = result.get('exec_vol',   qty)   or qty
        exec_price = result.get('exec_price', price) or price
        exec_fee   = result.get('exec_fee', 0) or 0
        order_uuid = result.get('order_uuid')
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO logs "
                        "(order_uuid, service, ticker, name, kind, side, amt, price, fee, source, created_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'manual', %s)",
                        (order_uuid, service, ticker, name, kind, side, exec_qty, exec_price, exec_fee, now)
                    )
                    if side == 'buy':
                        cur.execute(
                            "INSERT IGNORE INTO lots (id, ticker, date, time, amt, price, source) "
                            "VALUES (%s, %s, %s, %s, %s, %s, 'manual')",
                            (order_uuid or str(_uuid.uuid4()), ticker, now.date(), now.time(), exec_qty, exec_price)
                        )
        except Exception as e:
            print(f"[order] DB 기록 실패: {e}")

    return result


# ── 거래내역 ─────────────────────────────────────────────

@app.get("/api/transactions")
def get_transactions():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM logs ORDER BY created_at DESC")
            return cur.fetchall()


@app.post("/api/transactions/sync")
def sync_transactions():
    new_count = 0
    for adapter in get_adapters():
        try:
            txns = adapter.get_transactions()
            if not txns:
                continue
            service = getattr(adapter, 'service', '').lower()
            with get_conn() as conn:
                with conn.cursor() as cur:
                    for t in txns:
                        cur.execute(
                            "INSERT IGNORE INTO logs "
                            "(order_uuid, service, ticker, name, kind, side, amt, price, total, source, created_at) "
                            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'manual', %s)",
                            (t['id'], service, t['ticker'], t['name'], t['kind'],
                             t['side'], t['amt'], t['price'], t['total'], t['time'])
                        )
                        new_count += cur.rowcount
        except Exception as e:
            print(f"[sync] {type(adapter).__name__} error: {e}")
    return {'synced': new_count}


# ── 한국주식 OHLCV 차트 (네이버 증권) ───────────────────

@app.get("/api/chart/{ticker}")
def get_stock_chart(ticker: str, days: int = 365):
    import xml.etree.ElementTree as ET
    count = min(days, 2000)
    try:
        res = req.get(
            "https://fchart.stock.naver.com/sise.nhn",
            params={"symbol": ticker, "timeframe": "day", "count": count, "requestType": "0"},
            timeout=10,
        )
        root = ET.fromstring(res.text)
        result = []
        for item in root.findall(".//item"):
            data = item.get("data", "").split("|")
            if len(data) < 5:
                continue
            date_str = data[0].strip()
            try:
                result.append({
                    "time":  f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}",
                    "open":  int(data[1]),
                    "high":  int(data[2]),
                    "low":   int(data[3]),
                    "close": int(data[4]),
                })
            except ValueError:
                continue
        return result
    except Exception as e:
        print(f"[chart] {ticker} error: {e}")
        return []


# ── 포트폴리오 차트 ──────────────────────────────────────

@app.get("/api/portfolio/chart")
def get_portfolio_chart(days: int = 90):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT date, total_value FROM portfolio_snapshots "
                "ORDER BY date DESC LIMIT %s",
                (days,)
            )
            rows = cur.fetchall()
    rows = sorted(rows, key=lambda r: r['date'])
    return [{'date': str(r['date']), 'value': r['total_value']} for r in rows]


# ── 거래소 목록 ──────────────────────────────────────────

@app.get("/api/exchanges")
def get_exchanges():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT exchange, name, kind, country FROM exchanges ORDER BY name")
            return cur.fetchall()


# ── 자동매매 전략 ────────────────────────────────────────

@app.get("/api/strategy-files/{service}")
def get_strategy_files(service: str):
    base = os.path.join(os.path.dirname(__file__), '..', 'bot', 'strategies', service.lower())
    if not os.path.isdir(base):
        return []
    return [
        f[:-3] for f in os.listdir(base)
        if f.endswith('.py') and not f.startswith('_')
    ]


@app.get("/api/logs/auto-stats")
def get_auto_stats():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                  SUM(side = 'buy')  AS today_buys,
                  SUM(side = 'sell') AS today_sells,
                  SUM(CASE WHEN side = 'buy'  THEN total ELSE 0 END) AS today_buy_amt,
                  SUM(CASE WHEN side = 'sell' THEN total ELSE 0 END) AS today_sell_amt
                FROM logs
                WHERE source = 'auto' AND DATE(created_at) = CURDATE()
            """)
            row = cur.fetchone()
    return {
        'today_buys':    int(row['today_buys']  or 0),
        'today_sells':   int(row['today_sells'] or 0),
        'today_buy_amt':  float(row['today_buy_amt']  or 0),
        'today_sell_amt': float(row['today_sell_amt'] or 0),
    }


@app.get("/api/strategies")
def get_strategies():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT s.*,
                    EXISTS(
                        SELECT 1 FROM lots l
                        WHERE l.strategy_id = s.id AND l.source = 'auto'
                    ) AS has_position
                FROM strategies s
                ORDER BY s.id
            """)
            return cur.fetchall()


@app.post("/api/strategies")
def create_strategy(body: dict):
    required = ("strategy", "ticker", "service", "amount")
    if any(k not in body for k in required):
        return {"ok": False, "msg": "필수 항목이 누락되었습니다"}
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO strategies (strategy, ticker, service, amount, enabled, cron, params) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (body["strategy"], body["ticker"], body["service"],
                 body["amount"], body.get("enabled", 0),
                 body.get("cron", "* * * * *"),
                 body.get("params") or None)
            )
            return {"ok": True, "id": cur.lastrowid}


@app.patch("/api/strategies/{strategy_id}")
def update_strategy(strategy_id: int, body: dict):
    fields = {k: v for k, v in body.items() if k in ("enabled", "amount", "cron", "params")}
    if not fields:
        return {"ok": False, "msg": "수정할 필드가 없습니다"}
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE strategies SET {set_clause} WHERE id = %s",
                (*fields.values(), strategy_id)
            )
    return {"ok": True}


@app.delete("/api/strategies/{strategy_id}")
def delete_strategy(strategy_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM strategies WHERE id = %s", (strategy_id,))
    return {"ok": True}


# ── 백테스트 ─────────────────────────────────────────────

from script_runner import SCRIPT_TEMPLATE

@app.get("/api/backtest/strategy/{service}/{name}")
def load_strategy_code(service: str, name: str):
    path = os.path.join(os.path.dirname(__file__), '..', 'bot', 'strategies',
                        service.lower(), f'{name}.py')
    if not os.path.exists(path):
        return {"code": SCRIPT_TEMPLATE}
    with open(path, encoding='utf-8') as f:
        return {"code": f.read()}

@app.post("/api/backtest/strategy")
async def save_strategy_code(request: Request):
    import re
    body = await request.json()
    service = body.get("service", "upbit")
    name    = body.get("name", "").strip()
    code    = body.get("code", "")

    if not name:
        return JSONResponse(status_code=400, content={"error": "전략 이름을 입력하세요"})
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        return JSONResponse(status_code=400, content={"error": "이름은 영문/숫자/언더스코어만 사용 가능합니다"})

    path = os.path.join(os.path.dirname(__file__), '..', 'bot', 'strategies',
                        service.lower(), f'{name}.py')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

    # 모듈 캐시 제거 (재로드용)
    key = f"strategies.{service.lower()}.{name}"
    sys.modules.pop(key, None)

    return {"ok": True, "name": name}

@app.get("/api/backtest/params/{service}/{strategy}")
def get_backtest_params(service: str, strategy: str):
    try:
        path = os.path.join(os.path.dirname(__file__), '..', 'bot',
                            'strategies', service.lower(), f'{strategy}.py')
        with open(path, encoding='utf-8') as f:
            code = f.read()

        if 'class BacktestStrategy' in code:
            key = f"strategies.{service.lower()}.{strategy}"
            sys.modules.pop(key, None)
            mod = importlib.import_module(key)
            cls = getattr(mod, 'BacktestStrategy', None)
            if not cls:
                return {}
            import inspect
            return {
                k: v for k, v in vars(cls).items()
                if not k.startswith('_') and not inspect.isfunction(v)
                and not inspect.ismethod(v) and k not in ('broker', 'data', 'equity')
                and isinstance(v, (int, float, str, bool))
            }
        else:
            from script_runner import compile_script
            cls = compile_script(code)
            return cls._user_params
    except Exception:
        return {}

@app.post("/api/backtest")
async def run_backtest(request: Request):
    import pyupbit
    import pandas as pd
    from backtesting import Backtest
    from backtesting.lib import FractionalBacktest
    from datetime import datetime
    import math

    body = await request.json()
    service  = body.get("service", "upbit")
    strategy = body.get("strategy")
    ticker   = body.get("ticker", "BTC")
    start    = body.get("start")
    end      = body.get("end")
    cash       = float(body.get("cash", 1_000_000))
    interval   = body.get("interval", "day")
    commission = float(body.get("commission", 0.05)) / 100
    slippage   = float(body.get("slippage", 0.0)) / 100
    params     = body.get("params", {})

    # OHLCV 조회
    try:
        days = 0
        if start:
            days = (datetime.now() - datetime.strptime(start, '%Y-%m-%d')).days + 10
        multipliers = {
            'day': 1, 'week': 1/7, 'month': 1/30,
            'minute240': 6, 'minute60': 24, 'minute30': 48,
            'minute15': 96, 'minute10': 144, 'minute5': 288,
            'minute3': 480, 'minute1': 1440,
        }
        m = multipliers.get(interval, 1)
        count = min(max(int(days * m) if days else 500, 60), 500)
        df = pyupbit.get_ohlcv(f"KRW-{ticker}", interval=interval, count=count)
        if df is None or df.empty:
            return JSONResponse(status_code=400, content={"error": "데이터 조회 실패"})
        df = df[['open', 'high', 'low', 'close', 'volume']].copy()
        df.columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        if start:
            df = df[df.index >= pd.Timestamp(start)]
        if end:
            df = df[df.index <= pd.Timestamp(end) + pd.Timedelta(days=1)]
        if len(df) < 10:
            return JSONResponse(status_code=400, content={"error": f"데이터 부족 ({len(df)}일)"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"데이터 오류: {e}"})

    # 전략 로드 (항상 최신 파일로 재로드)
    try:
        strategy_path = os.path.join(os.path.dirname(__file__), '..', 'bot',
                                     'strategies', service.lower(), f'{strategy}.py')
        with open(strategy_path, encoding='utf-8') as f:
            code = f.read()

        # 스크립트 형식 vs 클래스 형식 자동 감지
        if 'class BacktestStrategy' in code:
            key = f"strategies.{service.lower()}.{strategy}"
            sys.modules.pop(key, None)
            mod = importlib.import_module(key)
            StratClass = type('_S', (mod.BacktestStrategy,), {})
            for k, v in params.items():
                if hasattr(mod.BacktestStrategy, k):
                    setattr(StratClass, k, type(getattr(mod.BacktestStrategy, k))(v))
        else:
            from script_runner import compile_script
            StratClass = compile_script(code)
            for k, v in params.items():
                if hasattr(StratClass, k):
                    setattr(StratClass, k, type(getattr(StratClass, k))(v))
    except FileNotFoundError:
        return JSONResponse(status_code=400, content={"error": f"전략 파일을 찾을 수 없습니다: {strategy}"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"전략 로드 실패: {e}"})

    # 백테스트 실행
    try:
        bt     = FractionalBacktest(df, StratClass, cash=cash, commission=commission + slippage, exclusive_orders=True, finalize_trades=True)
        stats  = bt.run()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"error": f"백테스트 실패: {e}"})

    def sf(v, d=0):
        try:
            f = float(v)
            return d if math.isnan(f) or math.isinf(f) else round(f, 2)
        except Exception:
            return d

    # 지표 시계열: df['Close']에서 직접 재계산 (배열 인덱싱 문제 회피)
    OVERLAY = {'SMA', 'EMA', 'BB_U', 'BB_M', 'BB_L'}
    indicators = {}
    try:
        from script_runner import _sma, _ema, _rsi, _bb_upper, _bb_mid, _bb_lower, _supertrend
        snapshot = getattr(StratClass, '_ind_snapshot', {})
        close_np = df['Close'].to_numpy(dtype=float)
        high_np  = df['High'].to_numpy(dtype=float)
        low_np   = df['Low'].to_numpy(dtype=float)
        time_fmt = "%Y-%m-%d %H:%M:%S" if interval.startswith("minute") else "%Y-%m-%d"
        times    = [ts.strftime(time_fmt) for ts in df.index]

        def build_pts(arr, is_overlay):
            pts = []
            for i, t_str in enumerate(times):
                if i >= len(arr): break
                try:
                    fv = float(arr[i])
                    if not (math.isnan(fv) or math.isinf(fv)):
                        pts.append({"time": t_str,
                                    "value": round(fv) if is_overlay else round(fv, 2)})
                except Exception:
                    pass
            return pts

        for key in snapshot.keys():
            t = key[0]
            try:
                if t == 'SMA':
                    arr = _sma(close_np, key[1]).to_numpy()
                    label, ovl = f"SMA({key[1]})", True
                elif t == 'EMA':
                    arr = _ema(close_np, key[1]).to_numpy()
                    label, ovl = f"EMA({key[1]})", True
                elif t == 'RSI':
                    arr = _rsi(close_np, key[1]).to_numpy()
                    label, ovl = f"RSI({key[1]})", False
                elif t == 'BB_U':
                    arr = _bb_upper(close_np, key[1], key[2]).to_numpy()
                    label, ovl = f"BB상단({key[1]})", True
                elif t == 'BB_M':
                    arr = _bb_mid(close_np, key[1]).to_numpy()
                    label, ovl = f"BB중간({key[1]})", True
                elif t == 'BB_L':
                    arr = _bb_lower(close_np, key[1], key[2]).to_numpy()
                    label, ovl = f"BB하단({key[1]})", True
                elif t == 'SUPERT_LINE':
                    line_s, dir_s = _supertrend(high_np, low_np, close_np, key[1], key[2])
                    line_arr = line_s.to_numpy()
                    dir_arr  = dir_s.to_numpy()
                    label = f"SUPERT({key[1]},{key[2]})"
                    st_pts = []
                    for i, t_str in enumerate(times):
                        if i >= len(line_arr): break
                        try:
                            fv = float(line_arr[i]); dv = float(dir_arr[i])
                            if not (math.isnan(fv) or math.isinf(fv)) and not math.isnan(dv):
                                st_pts.append({"time": t_str, "value": round(fv),
                                               "color": '#22c55e' if dv > 0 else '#ef4444'})
                        except Exception:
                            pass
                    if st_pts:
                        indicators[label] = {"data": st_pts, "overlay": True, "type": "SUPERT_LINE"}
                    continue
                elif t == 'SUPERT_DIR':
                    continue
                else:
                    continue
            except Exception:
                continue
            pts = build_pts(arr, ovl)
            if pts:
                indicators[label] = {"data": pts, "overlay": ovl, "type": t}
    except Exception as e:
        print(f"[indicators] {e}")
        import traceback; traceback.print_exc()

    # 수익 곡선
    is_minute = interval.startswith("minute")
    ts_fmt = "%Y-%m-%d %H:%M:%S" if is_minute else "%Y-%m-%d"
    ts_len = 19 if is_minute else 10
    equity = stats['_equity_curve']['Equity']
    equity_data = [
        {"time": t.strftime(ts_fmt), "value": round(float(v))}
        for t, v in equity.items()
    ]

    # 거래 내역
    last_date = df.index[-1].strftime(ts_fmt)
    trades = []
    for _, t in stats['_trades'].iterrows():
        exit_time = str(t.ExitTime)[:ts_len] if not pd.isna(t.ExitTime) else last_date
        exit_price = round(float(t.ExitPrice)) if not pd.isna(t.ExitPrice) else round(float(df['Close'].iloc[-1]))
        trades.append({
            "entry_time":  str(t.EntryTime)[:ts_len],
            "exit_time":   exit_time,
            "entry_price": round(float(t.EntryPrice)),
            "exit_price":  exit_price,
            "size":        round(float(t.Size), 6),
            "pnl":         round(float(t.PnL)) if not pd.isna(t.PnL) else 0,
            "pnl_pct":     round(float(t.ReturnPct) * 100, 2) if not pd.isna(t.ReturnPct) else 0,
            "open":        pd.isna(t.ExitTime),
        })

    ohlcv_data = [
        {
            "time":  t.strftime(ts_fmt),
            "open":  round(float(row.Open)),
            "high":  round(float(row.High)),
            "low":   round(float(row.Low)),
            "close": round(float(row.Close)),
        }
        for t, row in df.iterrows()
    ]

    # 월별 수익률
    monthly_returns = {}
    try:
        eq_idx = pd.to_datetime([e['time'] for e in equity_data])
        eq_s = pd.Series([float(e['value']) for e in equity_data], index=eq_idx)
        try:
            monthly_end = eq_s.resample('ME').last()
        except Exception:
            monthly_end = eq_s.resample('M').last()
        prev = float(cash)
        for dt, val in monthly_end.dropna().items():
            yr, mo = int(dt.year), int(dt.month)
            ret = round((val / prev - 1) * 100, 1) if prev else 0.0
            if yr not in monthly_returns:
                monthly_returns[yr] = {}
            monthly_returns[yr][mo] = ret
            prev = val
    except Exception:
        monthly_returns = {}

    return {
        "stats": {
            "return_pct":        sf(stats["Return [%]"]),
            "annual_return_pct": sf(stats.get("Return (Ann.) [%]", 0)),
            "max_drawdown_pct":  sf(stats["Max. Drawdown [%]"]),
            "win_rate":          sf(stats.get("Win Rate [%]", 0)),
            "num_trades":        int(stats["# Trades"]),
            "sharpe_ratio":      sf(stats.get("Sharpe Ratio", 0)),
        },
        "ohlcv":           ohlcv_data,
        "equity_curve":    equity_data,
        "trades":          trades,
        "monthly_returns": monthly_returns,
        "indicators":      indicators,
        "config": {
            "interval":   interval,
            "commission":  round(commission * 100, 4),
            "slippage":    round(slippage * 100, 4),
        },
    }


# ── 거래소별 현재가 조회 ──────────────────────────────────

@app.post("/api/prices")
def get_prices(body: dict):
    """body: { "upbit": ["BTC", "ETH"], "kis": ["005930", "114800"] }"""
    adapter_map = {
        a.service.lower(): a
        for a in get_adapters()
        if hasattr(a, 'service')
    }
    result = {}
    for service, tickers in body.items():
        adapter = adapter_map.get(service.lower())
        if not adapter or not tickers:
            continue
        try:
            result.update(adapter.get_prices(tickers))
        except Exception as e:
            print(f"[{service}] get_prices error: {e}")
    return result
