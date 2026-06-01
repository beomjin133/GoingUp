import threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import requests as req
import pyupbit
from database import get_conn
from exchanges.base import ExchangeAdapter

_color_cache: dict = {}
_color_lock = threading.Lock()

def _extract_color(png_bytes: bytes) -> str:
    try:
        from PIL import Image
        img = Image.open(BytesIO(png_bytes)).convert('RGBA').resize((64, 64))
        # 투명·흰색·검정 제외, 4비트 버킷화로 dominant hue 추출
        pixels = [
            (r >> 4, g >> 4, b >> 4)
            for r, g, b, a in img.getdata()
            if a > 64
            and not (r > 220 and g > 220 and b > 220)
            and not (r < 35  and g < 35  and b < 35)
        ]
        if not pixels:
            return '#888888'
        r4, g4, b4 = Counter(pixels).most_common(1)[0][0]
        return '#{:02x}{:02x}{:02x}'.format(r4 * 17, g4 * 17, b4 * 17)
    except Exception:
        return '#888888'

def _fetch_coin_color(ticker: str) -> str:
    try:
        resp = req.get(f'https://static.upbit.com/logos/{ticker}.png', timeout=3)
        return _extract_color(resp.content)
    except Exception:
        return '#888888'

def get_coin_color(ticker: str) -> str:
    if ticker in _color_cache:
        return _color_cache[ticker]
    color = _fetch_coin_color(ticker)
    with _color_lock:
        _color_cache[ticker] = color
    return color


class UpbitAdapter(ExchangeAdapter):

    def __init__(self, access_key: str, secret_key: str, service: str = 'upbit', **kwargs):
        self._client = pyupbit.Upbit(access_key, secret_key)
        self.service = service.lower()
        self._access_key = access_key
        self._secret_key = secret_key

    def get_holdings(self) -> list:
        balances = self._client.get_balances()
        crypto_balances = [
            b for b in balances
            if b['currency'] != 'KRW'
            and float(b['balance']) + float(b['locked']) > 0
        ]
        if not crypto_balances:
            return []

        market_res = req.get('https://api.upbit.com/v1/market/all')
        name_map = {
            m['market'].replace('KRW-', ''): m['korean_name']
            for m in market_res.json() if m['market'].startswith('KRW-')
        }

        tickers = tuple(b['currency'] for b in crypto_balances)
        avg_price_map = {}
        with get_conn() as conn:
            with conn.cursor() as cur:
                placeholders = ','.join(['%s'] * len(tickers))
                cur.execute(
                    f"SELECT ticker, SUM(amt * price) / SUM(amt) AS avg_price "
                    f"FROM lots WHERE ticker IN ({placeholders}) GROUP BY ticker",
                    tickers
                )
                for row in cur.fetchall():
                    avg_price_map[row['ticker']] = float(row['avg_price'])

        # 캐시에 없는 티커만 병렬로 색상 추출
        uncached = [b['currency'] for b in crypto_balances
                    if b['currency'] not in _color_cache]
        if uncached:
            with ThreadPoolExecutor(max_workers=min(len(uncached), 8)) as pool:
                fetched = list(pool.map(_fetch_coin_color, uncached))
            with _color_lock:
                for t, c in zip(uncached, fetched):
                    _color_cache[t] = c

        result = []
        for b in crypto_balances:
            ticker = b['currency']
            if ticker not in name_map:
                continue
            amt = float(b['balance']) + float(b['locked'])
            result.append({
                'id':        ticker,
                'ticker':    ticker,
                'name':      name_map.get(ticker, ticker),
                'kind':      'crypto',
                'service':   self.service,
                'amt':       amt,
                'avg_price': avg_price_map.get(ticker, float(b['avg_buy_price'])),
                'color':     _color_cache.get(ticker, '#888888'),
            })
        return result

    def get_prices(self, tickers: list) -> dict:
        if not tickers:
            return {}
        markets = ','.join(f'KRW-{t}' for t in tickers)
        res = req.get(f'https://api.upbit.com/v1/ticker?markets={markets}')
        data = res.json()
        if not isinstance(data, list):
            return {}
        return {
            t['market'].replace('KRW-', ''): {
                'price':     t['trade_price'],
                'daily_pct': t['signed_change_rate'] * 100,
            }
            for t in data
        }

    def get_transactions(self) -> list:
        market_res = req.get('https://api.upbit.com/v1/market/all')
        name_map = {
            m['market'].replace('KRW-', ''): m['korean_name']
            for m in market_res.json() if m['market'].startswith('KRW-')
        }
        orders = self._client.get_order(state='done') or []
        result = []
        for o in orders:
            executed_vol = float(o.get('executed_volume') or 0)
            if executed_vol <= 0:
                continue
            paid = float(o.get('executed_funds') or 0)
            price = round(paid / executed_vol) if executed_vol else 0
            ticker = o['market'].replace('KRW-', '')
            result.append({
                'id':     o['uuid'],
                'time':   o['created_at'][:19].replace('T', ' '),
                'side':   'buy' if o['side'] == 'bid' else 'sell',
                'ticker': ticker,
                'name':   name_map.get(ticker, ticker),
                'kind':   'crypto',
                'amt':    executed_vol,
                'price':  price,
                'total':  round(paid),
            })
        return result

    def _jwt_headers(self, query: dict) -> dict:
        import jwt, uuid, hashlib, urllib.parse
        qs = urllib.parse.urlencode(query).encode()
        h = hashlib.sha512(); h.update(qs)
        payload = {
            'access_key': self._access_key,
            'nonce': str(uuid.uuid4()),
            'query_hash': h.hexdigest(),
            'query_hash_alg': 'SHA512',
        }
        return {'Authorization': f'Bearer {jwt.encode(payload, self._secret_key)}'}

    def _get_order(self, order_uuid: str) -> dict:
        query = {'uuid': order_uuid}
        res = req.get('https://api.upbit.com/v1/order',
                      params=query,
                      headers=self._jwt_headers(query),
                      timeout=10)
        return res.json()

    def place_order(self, side: str, ticker: str, price: float, qty: float) -> dict:
        import time
        market = f'KRW-{ticker}'

        order_krw = round(price if qty <= 0 else qty * price) if side == 'buy' else 0
        if side == 'buy':
            query = {'market': market, 'side': 'bid',
                     'price': str(order_krw), 'ord_type': 'price'}
        else:
            query = {'market': market, 'side': 'ask',
                     'volume': str(qty), 'ord_type': 'market'}

        try:
            res = req.post('https://api.upbit.com/v1/orders',
                           params=query,
                           headers=self._jwt_headers(query),
                           timeout=10)
            data = res.json()
            if 'uuid' not in data:
                err = data.get('error', {})
                msg = err.get('message') or err.get('name') or str(data)
                print(f"[Upbit] 주문실패 {ticker}: {msg}")
                return {'success': False, 'msg': msg}

            order_uuid = data['uuid']
            print(f"[Upbit] 주문접수 {side} {ticker} uuid={order_uuid[:8]}")

            # 체결 대기 후 실제 체결 데이터 조회
            time.sleep(1)
            for _ in range(5):
                order = self._get_order(order_uuid)
                exec_vol   = float(order.get('executed_volume') or 0)
                exec_funds = float(order.get('executed_funds') or 0)
                done = order.get('state') == 'done'
                if (exec_vol > 0 and exec_funds > 0) or (done and exec_vol > 0):
                    break
                time.sleep(0.5)

            # trades 배열 합산 — 매수/매도 모두 가장 정확한 체결 데이터
            trades = order.get('trades') or []
            if trades:
                trade_funds = sum(float(t.get('funds') or 0) for t in trades)
                trade_vol   = sum(float(t.get('volume') or 0) for t in trades)
                if trade_funds > 0 and trade_vol > 0:
                    exec_vol   = trade_vol
                    exec_funds = trade_funds
                    exec_price = trade_funds / trade_vol
                else:
                    exec_price = 0
                    exec_funds = 0
            elif exec_vol > 0 and side == 'buy':
                # trades 없을 때 매수 fallback
                exec_price = order_krw / exec_vol
                exec_funds = order_krw
            else:
                exec_price = 0
                exec_funds = 0
            print(f"[Upbit] 체결완료 {side} {ticker} 수량={exec_vol} 체결가={exec_price:,} 지출={exec_funds:,.0f}원")
            return {
                'success':    True,
                'msg':        '시장가 주문 체결 완료',
                'order_uuid': order_uuid,
                'exec_vol':   exec_vol,
                'exec_price': exec_price,
                'exec_funds': exec_funds,
            }
        except Exception as e:
            print(f"[Upbit] 주문예외 {ticker}: {e}")
            return {'success': False, 'msg': str(e)}

    def get_balance(self) -> float:
        balances = self._client.get_balances()
        if not balances:
            print("[Upbit] get_balance: 잔고 응답 없음 (API 키 오류?)")
            return 0
        krw = next((float(b['balance']) for b in balances if b['currency'] == 'KRW'), 0)
        print(f"[Upbit] 예수금: {krw:,.0f}원")
        return krw
