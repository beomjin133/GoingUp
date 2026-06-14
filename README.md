# GoingUp

국내외 자산(코인, 한국주식, 미국주식)을 한 곳에서 관리하는 개인 포트폴리오 트래커 & 자동매매·백테스트 시스템

## 주요 기능

- **포트폴리오 대시보드** — 보유 자산 현황, 수익률, 자산 배분 도넛 차트
- **실시간 시세** — 업비트(코인), 한국투자증권(주식) 5초 주기 갱신
- **거래내역** — 거래소 자동 동기화, 수수료 포함 내역 조회
- **백테스트** — Pine Script 스타일 DSL로 전략을 작성하고 과거 데이터로 검증 (총/연수익·최대낙폭·승률·샤프 + 가격/지표/수익곡선 차트)
- **자동매매 봇** — 백테스트한 전략을 그대로 등록해 크론 스케줄로 실행
- **전략별 성과 추적** — 자동매매 전략의 실현·미실현 손익, 수익률·승률·MDD·샤프, 수익곡선·체결내역
- **TOTP 인증** — Google Authenticator 2단계 인증

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React, Vite, lightweight-charts, Monaco Editor |
| Backend | FastAPI, Python 3.11, backtesting.py |
| DB | MySQL |
| 거래소 | 업비트 API, 한국투자증권 OpenAPI |

## 프로젝트 구조

```
GoingUp/
├── backend/
│   ├── api/
│   │   ├── main.py            # FastAPI 서버 (시세·거래·백테스트·전략·성과 API)
│   │   ├── schema.sql         # DB 스키마
│   │   └── requirements.txt
│   ├── bot/
│   │   ├── executor.py        # 전략 실행기 (크론으로 주기 실행)
│   │   ├── script_runner.py   # 전략 DSL 컴파일러 + 지표 + 실시간 실행(live_run)
│   │   └── strategies/        # 전략 파일 (거래소/전략명.py)
│   ├── exchanges/
│   │   ├── upbit.py           # 업비트 어댑터
│   │   └── kis.py             # 한국투자증권 어댑터
│   └── database.py
├── frontend/
│   └── src/                   # React 소스 (Dashboard·Backtest·AutoBot 등)
└── .env                       # 환경변수 (커밋 제외)
```

## 시작하기

### 1. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집합니다:

```env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=

ALLOWED_IPS=127.0.0.1
```

### 2. DB 초기화

```bash
mysql -u root -p < backend/api/schema.sql
```

### 3. 백엔드 실행

```bash
pip install -r backend/api/requirements.txt
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
```

### 4. 프론트엔드 빌드

```bash
cd frontend
npm install
npm run build
```

### 5. TOTP 초기 설정

서버 실행 후 웹 접속 → **처음 설정하기** 버튼으로 QR 코드 스캔

## 백테스트 & 전략 작성 (DSL)

백테스트 화면의 코드 에디터에서 **Pine Script 스타일 DSL**로 전략을 작성합니다.
매 봉마다 스크립트가 실행되며, 조건이 맞으면 `buy()`/`sell()`로 주문합니다.
같은 스크립트가 백테스트와 실시간 자동매매(`live_run`)에 그대로 쓰입니다.

```python
# 예: 돈치안 돌파 + ATR 변동성 필터 (btc_breakout)
dc  = DONCHIAN(20)   # 돈치안 채널 (상단 = 최근 20봉 신고가)
ema = EMA(200)       # 추세필터
xe  = EMA(10)        # 청산선
atr = ATR(14)        # 변동성

plt(dc); plt(ema)    # 차트에 표시

# 진입: 신고가 돌파 + 상승장 + 변동성 미과열
if not position and close > dc.upper and close > ema and atr / close < 0.06:
    buy()
# 청산: 종가가 EMA10 아래로
if position and close < xe:
    sell()
```

### 사용 가능한 요소

| 구분 | 항목 |
|------|------|
| 추세/이평 | `SMA(n)` · `EMA(n)` · `SUPERT(period, mult)`→`.line`/`.direction` |
| 오실레이터 | `RSI(n)` · `STOCH(k, d)`→`.k`/`.d` · `MACD(f, s, sig)`→`.macd`/`.signal`/`.hist` |
| 변동성/채널 | `ATR(n)` · `BB(n, std)` · `DONCHIAN(n)` · `KELTNER(n, mult)` (모두 `.upper`/`.lower`/`.mid`) |
| 추세강도 | `ADX(n)`→`.adx`/`.plus_di`/`.minus_di` |
| 스윙 | `ZIGZAG(dev)`→`.dir`/`.pivot`/`.prev`/`.leg` (엘리어트 근사, repaint 없음) |
| 외부 | `FGI()` 공포탐욕지수 (일봉 전용) |
| 조건 | `crossover(a, b)` · `crossunder(a, b)` |
| 주문 | `buy()` · `sell()` |
| 상태변수 | `mem(기본값)` → `.set(값)` · `[n]`(n봉 전 값) |
| 차트 | `plt(지표, overlay=True)` |
| 기본변수 | `close` · `open` · `high` · `low` · `volume` · `position` · `position_size` |

지표는 조건문 안이 아니라 **스크립트 최상단에서 호출**해야 합니다(캐싱 때문).

> 참고: `run(ticker, adapter, amount, params)` 함수를 가진 일반 Python 모듈,
> 또는 `class BacktestStrategy`(backtesting.py) 형식도 자동 감지되어 지원됩니다.

## 자동매매 & 성과 추적

1. 백테스트로 검증한 전략을 화면에서 바로 **자동매매에 등록**(투자금액·실행주기 지정).
2. 크론탭으로 `executor.py`를 주기 실행하면, 활성 전략을 `live_run`으로 평가해 주문을 냅니다.
   - 체결은 `logs`(strategy_id 포함), 보유는 `lots`, 상태변수는 `strategy_state`에 기록됩니다.
3. **자동매매 화면**에서 전략별 수익률·누적 손익을 보고, 행을 클릭하면
   상세 성과(총/연수익·MDD·승률·샤프 + 수익곡선 + 체결내역)를 확인합니다.

## 지원 거래소

| 거래소 | 코인 | 주식 |
|--------|------|------|
| 업비트 | ✅ | — |
| 한국투자증권 | — | ✅ |
