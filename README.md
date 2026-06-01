# GoingUp

국내외 자산(코인, 한국주식, 미국주식)을 한 곳에서 관리하는 개인 포트폴리오 트래커 & 자동매매 시스템

## 주요 기능

- **포트폴리오 대시보드** — 보유 자산 현황, 수익률, 자산 배분 도넛 차트
- **실시간 시세** — 업비트(코인), 한국투자증권(주식) 5초 주기 갱신
- **거래내역** — 거래소 자동 동기화, 수수료 포함 내역 조회
- **자동매매 봇** — Python 전략 파일 기반 크론 스케줄링
- **TOTP 인증** — Google Authenticator 2단계 인증

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React, Vite, lightweight-charts |
| Backend | FastAPI, Python 3.11 |
| DB | MySQL |
| 거래소 | 업비트 API, 한국투자증권 OpenAPI |

## 프로젝트 구조

```
GoingUp/
├── backend/
│   ├── api/
│   │   ├── main.py          # FastAPI 서버
│   │   ├── schema.sql       # DB 스키마
│   │   └── requirements.txt
│   ├── bot/
│   │   ├── executor.py      # 전략 실행기
│   │   └── strategies/      # 전략 파일 (거래소/전략명.py)
│   ├── exchanges/
│   │   ├── upbit.py         # 업비트 어댑터
│   │   └── kis.py           # 한국투자증권 어댑터
│   └── database.py
├── frontend/
│   ├── src/                 # React 소스
│   └── styles/              # 디자인 시스템 CSS
├── design/                  # GoingUp 디자인 시스템
└── .env                     # 환경변수 (커밋 제외)
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

## 자동매매 전략 추가

`backend/bot/strategies/{거래소}/{전략명}.py` 파일을 생성하고 `run()` 함수를 구현합니다:

```python
def run(ticker, adapter, amount, params):
    # 매수: {"signal": "buy"}
    # 매도: {"signal": "sell"}
    # 관망: {"signal": "none"}
    return {"signal": "none"}
```

전략은 DB `strategies` 테이블에 등록 후 크론탭으로 `executor.py`를 주기적으로 실행합니다.

## 지원 거래소

| 거래소 | 코인 | 주식 |
|--------|------|------|
| 업비트 | ✅ | — |
| 한국투자증권 | — | ✅ |
