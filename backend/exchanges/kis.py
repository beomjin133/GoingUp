import time
import requests as req
from datetime import datetime
from database import get_conn
from exchanges.base import ExchangeAdapter

KIS_BASE = "https://openapi.koreainvestment.com:9443"


class KISAdapter(ExchangeAdapter):
    """
    한국투자증권 어댑터.
    api_keys.memo      = 계좌번호 (예: "12345678-01")
    api_keys.token     = 발급된 액세스 토큰 (DB 영속)
    api_keys.token_expires_at = 토큰 만료 일시
    """

    def __init__(self, access_key: str, secret_key: str, memo: str = "",
                 service: str = "KIS", **kwargs):
        self.access_key = access_key
        self.secret_key = secret_key
        self.account_no = memo
        self.service    = service

        self._token          = None
        self._token_expires  = 0
        self._cached_data    = None
        self._cached_at      = 0
        self._cache_ttl      = 5

        self._load_token_from_db()

    # ── 토큰 영속 관리 ────────────────────────────────────

    def _load_token_from_db(self):
        """DB에 저장된 토큰이 유효하면 재사용."""
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT token, token_expires_at FROM api_keys WHERE service = %s",
                    (self.service,)
                )
                row = cur.fetchone()
        if not row or not row['token'] or not row['token_expires_at']:
            return
        expires_ts = row['token_expires_at'].timestamp()
        if time.time() < expires_ts - 3600:  # 1시간 이상 남았으면 재사용
            self._token         = row['token']
            self._token_expires = expires_ts
            remaining = int((expires_ts - time.time()) / 3600)
            print(f"[KIS] DB 토큰 재사용 (만료까지 약 {remaining}시간)")

    def _save_token_to_db(self):
        """발급된 토큰을 DB에 저장."""
        expires_dt = datetime.fromtimestamp(self._token_expires)
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE api_keys SET token = %s, token_expires_at = %s WHERE service = %s",
                    (self._token, expires_dt, self.service)
                )

    def _get_token(self) -> str:
        # 만료 1시간 전부터 갱신
        if self._token and time.time() < self._token_expires - 3600:
            return self._token

        res = req.post(f"{KIS_BASE}/oauth2/tokenP", json={
            "grant_type": "client_credentials",
            "appkey":     self.access_key,
            "appsecret":  self.secret_key,
        })
        data = res.json()
        if 'access_token' not in data:
            # 분당 1회 제한 시 65초 후 재시도
            self._token_expires = time.time() + 65
            raise Exception(f"KIS 토큰 발급 실패: {data.get('error_description', data)}")

        self._token         = data['access_token']
        self._token_expires = time.time() + data.get('expires_in', 86400) - 60
        self._save_token_to_db()
        print(f"[KIS] 새 토큰 발급 및 DB 저장 (만료까지 {data.get('expires_in', 86400) // 3600}시간)")
        return self._token

    # ── 인증 헤더 ─────────────────────────────────────────

    def _headers(self, tr_id: str) -> dict:
        return {
            "Authorization": f"Bearer {self._get_token()}",
            "appkey":        self.access_key,
            "appsecret":     self.secret_key,
            "tr_id":         tr_id,
            "Content-Type":  "application/json",
        }

    # ── 잔고 조회 (보유종목 + 예수금 한 번에) ─────────────

    def _fetch_balance_data(self) -> dict:
        now = time.time()
        if self._cached_data and now - self._cached_at < self._cache_ttl:
            return self._cached_data

        parts        = self.account_no.split('-')
        cano         = parts[0]
        acnt_prdt_cd = parts[1] if len(parts) > 1 else "01"

        res = req.get(
            f"{KIS_BASE}/uapi/domestic-stock/v1/trading/inquire-balance",
            headers=self._headers("TTTC8434R"),
            params={
                "CANO":                  cano,
                "ACNT_PRDT_CD":          acnt_prdt_cd,
                "AFHR_FLPR_YN":          "N",
                "OFL_YN":                "",
                "INQR_DVSN":             "02",
                "UNPR_DVSN":             "01",
                "FUND_STTL_ICLD_YN":     "N",
                "FNCG_AMT_AUTO_RDPT_YN": "N",
                "PRCS_DVSN":             "01",
                "CTX_AREA_FK100":        "",
                "CTX_AREA_NK100":        "",
            },
        )
        data = res.json()
        rt_cd = data.get('rt_cd')
        if rt_cd != '0':
            print(f"[KIS] 잔고 조회 실패 rt_cd={rt_cd} msg={data.get('msg1')}")
        self._cached_data = data
        self._cached_at   = now
        return self._cached_data

    # ── 인터페이스 구현 ───────────────────────────────────

    def get_holdings(self) -> list:
        data   = self._fetch_balance_data()
        result = []
        for item in data.get('output1', []):
            qty = float(item.get('hldg_qty', 0))
            if qty <= 0:
                continue
            ticker    = item.get('pdno', '')
            price     = float(item.get('prpr', 0))
            prev_diff = float(item.get('bfdy_cprs_icdc', 0))
            prev_close = price - prev_diff
            daily_pct  = (prev_diff / prev_close * 100) if prev_close != 0 else 0
            result.append({
                'id':        ticker,
                'ticker':    ticker,
                'name':      item.get('prdt_name', ticker),
                'kind':      'equity',
                'service':   self.service.lower(),
                'amt':       qty,
                'avg_price': float(item.get('pchs_avg_pric', 0)),
                'color':     '#1A55F0',
                'price':     price,
                'daily_pct': daily_pct,
            })
        return result

    def get_transactions(self) -> list:
        from datetime import date, timedelta
        parts        = self.account_no.split('-')
        cano         = parts[0]
        acnt_prdt_cd = parts[1] if len(parts) > 1 else '01'
        end_dt   = date.today().strftime("%Y%m%d")
        start_dt = (date.today() - timedelta(days=90)).strftime("%Y%m%d")

        result = []
        ctx_fk = ''
        ctx_nk = ''
        while True:
            res = req.get(
                f"{KIS_BASE}/uapi/domestic-stock/v1/trading/inquire-daily-ccld",
                headers=self._headers("TTTC8001R"),
                params={
                    "CANO": cano, "ACNT_PRDT_CD": acnt_prdt_cd,
                    "INQR_STRT_DT": start_dt, "INQR_END_DT": end_dt,
                    "SLL_BUY_DVSN_CD": "00", "INQR_DVSN": "00",
                    "PDNO": "", "CCLD_DVSN": "01",
                    "ORD_GNO_BRNO": "", "ODNO": "",
                    "INQR_DVSN_3": "00", "INQR_DVSN_1": "",
                    "CTX_AREA_FK100": ctx_fk, "CTX_AREA_NK100": ctx_nk,
                }
            )
            data = res.json()
            for item in data.get('output1', []):
                qty = float(item.get('tot_ccld_qty', 0))
                if qty <= 0:
                    continue
                d, tm = item.get('ord_dt', ''), item.get('ord_tm', '')
                if not d or not tm:
                    continue
                time_str = f"{d[:4]}-{d[4:6]}-{d[6:]} {tm[:2]}:{tm[2:4]}:{tm[4:]}"
                odno = item.get('odno', '')
                result.append({
                    'id':     f"KIS-{odno}",
                    'time':   time_str,
                    'side':   'sell' if item.get('sll_buy_dvsn_cd') == '01' else 'buy',
                    'ticker': item.get('pdno', ''),
                    'name':   item.get('prdt_name', ''),
                    'kind':   'equity',
                    'amt':    qty,
                    'price':  float(item.get('avg_prvs', 0)),
                    'total':  float(item.get('pchs_amt', 0)),
                })
            ctx_fk = data.get('ctx_area_fk100', '').strip()
            ctx_nk = data.get('ctx_area_nk100', '').strip()
            if not ctx_fk:
                break
        return result

    def get_prices(self, tickers: list) -> dict:
        data = self._fetch_balance_data()
        result = {}
        for item in data.get('output1', []):
            ticker = item.get('pdno', '')
            if ticker not in tickers:
                continue
            price      = float(item.get('prpr', 0))
            prev_diff  = float(item.get('bfdy_cprs_icdc', 0))
            prev_close = price - prev_diff
            daily_pct  = (prev_diff / prev_close * 100) if prev_close != 0 else 0
            result[ticker] = {'price': price, 'daily_pct': daily_pct}
        return result

    def place_order(self, side: str, ticker: str, price: float, qty: float) -> dict:
        parts        = self.account_no.split('-')
        cano         = parts[0]
        acnt_prdt_cd = parts[1] if len(parts) > 1 else '01'
        tr_id        = 'TTTC0802U' if side == 'buy' else 'TTTC0801U'

        cur_price = 0
        if side == 'buy' and qty <= 0:
            # qty=0: 예산 모드 (자동매매) — price = KRW 예산, 현재가로 수량 계산
            try:
                rp = req.get(
                    f"{KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price",
                    headers=self._headers("FHKST01010100"),
                    params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker},
                    timeout=5,
                )
                cur_price = float(rp.json().get('output', {}).get('stck_prpr', 0) or 0)
            except Exception:
                pass
            if cur_price <= 0:
                return {'success': False, 'msg': '현재가 조회 실패'}
            exec_qty = int(price / cur_price)
            if exec_qty <= 0:
                return {'success': False, 'msg': f'매수 수량 부족 (예산 {price:,.0f}원, 현재가 {cur_price:,.0f}원)'}
            print(f"[KIS] 매수 계산: 예산 {price:,.0f}원 ÷ 현재가 {cur_price:,.0f}원 = {exec_qty}주")
        else:
            # qty>0: 직접 수량 지정 모드 (수동 주문)
            exec_qty = int(qty)

        res = req.post(
            f"{KIS_BASE}/uapi/domestic-stock/v1/trading/order-cash",
            headers=self._headers(tr_id),
            json={
                "CANO":         cano,
                "ACNT_PRDT_CD": acnt_prdt_cd,
                "PDNO":         ticker,
                "ORD_DVSN":     "01",
                "ORD_QTY":      str(exec_qty),
                "ORD_UNPR":     "0",
            },
        )
        data  = res.json()
        rt_cd = data.get('rt_cd')
        msg   = data.get('msg1', '')
        if rt_cd != '0':
            print(f"[KIS] 주문실패 {side} {ticker}: {msg}")
            return {'success': False, 'msg': msg}

        output = data.get('output', {})
        odno   = output.get('ODNO', '') or output.get('odno', '')
        print(f"[KIS] 주문접수 odno={odno!r} output_keys={list(output.keys())}")

        exec_price = 0
        exec_funds = 0
        exec_fee   = 0

        if odno:
            time.sleep(1)
            try:
                today = datetime.now().strftime('%Y%m%d')
                r2 = req.get(
                    f"{KIS_BASE}/uapi/domestic-stock/v1/trading/inquire-daily-ccld",
                    headers=self._headers('TTTC8001R'),
                    params={
                        "CANO": cano, "ACNT_PRDT_CD": acnt_prdt_cd,
                        "INQR_STRT_DT": today, "INQR_END_DT": today,
                        "SLL_BUY_DVSN_CD": "00", "INQR_DVSN": "00",
                        "PDNO": ticker, "CCLD_DVSN": "01",
                        "ORD_GNO_BRNO": "", "ODNO": odno,
                        "INQR_DVSN_3": "00", "INQR_DVSN_1": "",
                        "CTX_AREA_FK100": "", "CTX_AREA_NK100": "",
                    },
                )
                d2    = r2.json()
                fills = d2.get('output1', [])
                # ondo가 일치하는 체결만 사용
                matched = [f for f in fills if f.get('odno') == odno]
                print(f"[KIS] 체결조회 odno={odno!r} 전체={len(fills)}건 매칭={len(matched)}건")
                f = matched[0] if matched else (fills[0] if fills else None)
                if f:
                    fill_qty   = float(f.get('tot_ccld_qty', 0))
                    fill_price = float(f.get('avg_prvs', 0))
                    fill_ccld  = float(f.get('tot_ccld_amt', 0))   # 순수 체결금액
                    fill_purch = float(f.get('pchs_amt', 0))       # 매입금액 (수수료 포함)
                    fill_total = fill_purch or fill_ccld
                    fill_fee   = max(0.0, fill_purch - fill_ccld)
                    print(f"[KIS] fill odno={f.get('odno')} qty={fill_qty} price={fill_price} total={fill_total} fee={fill_fee} matched={bool(matched)}")
                    if fill_qty > 0 and fill_price > 0:
                        exec_qty   = int(fill_qty)
                        exec_price = fill_price
                        exec_funds = fill_total
                        exec_fee   = fill_fee
            except Exception as e:
                print(f"[KIS] 체결조회 실패: {e}")

        if exec_price <= 0:
            exec_price = cur_price if cur_price > 0 else price
        if exec_funds == 0:
            exec_funds = exec_qty * exec_price

        # 잔고·보유종목 캐시 무효화 (예수금 즉시 반영)
        self._cached_data = None
        self._cached_at   = 0

        print(f"[KIS] 주문완료 {side} {ticker} {exec_qty}주 @{exec_price:,.0f}원 총{exec_funds:,.0f}원")
        return {
            'success':    True,
            'msg':        msg,
            'order_uuid': odno,
            'exec_vol':   exec_qty,
            'exec_price': exec_price,
            'exec_funds': exec_funds,
            'exec_fee':   exec_fee,
        }

    def search_stock(self, code: str) -> dict | None:
        try:
            res = req.get(
                f"{KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price",
                headers=self._headers("FHKST01010100"),
                params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": code},
                timeout=5,
            )
            output = res.json().get("output", {})
            price  = float(output.get("stck_prpr", 0) or 0)
            pct    = float(output.get("prdy_ctrt", 0) or 0)
            name   = output.get("hts_kor_isnm", "").strip()

            if not name:
                try:
                    res2 = req.get(
                        f"{KIS_BASE}/uapi/domestic-stock/v1/quotations/search-stock-info",
                        headers=self._headers("CTPF1002R"),
                        params={"PRDT_TYPE_CD": "300", "PDNO": code},
                        timeout=5,
                    )
                    out2 = res2.json().get("output", {})
                    name = (out2.get("prdt_abrv_name") or out2.get("prdt_name") or "").strip()
                except Exception:
                    pass

            # 이름 조회 실패 시 종목코드로 대체
            if not name:
                market = output.get("rprs_mrkt_kor_name", "")
                name = f"{code}" + (f" ({market})" if market else "")

            if not price:
                return None
            return {"ticker": code, "name": name, "kind": "equity", "price": price, "daily_pct": pct}
        except Exception as e:
            print(f"[KIS] search_stock error: {e}")
            return None

    def get_balance(self) -> float:
        data    = self._fetch_balance_data()
        output2 = data.get('output2', [])
        if output2:
            # prvs_rcdl_excc_amt = 당일 거래 정산 후 실제 가용 예수금
            return float(output2[0].get('prvs_rcdl_excc_amt', 0))
        return 0
