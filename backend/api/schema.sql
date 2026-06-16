CREATE DATABASE IF NOT EXISTS goingup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE goingup;

-- 거래소 목록
CREATE TABLE IF NOT EXISTS exchanges (
    exchange    VARCHAR(50)                          PRIMARY KEY,
    name        VARCHAR(100)                         NOT NULL,
    kind        ENUM('crypto','stock','both')        NOT NULL,
    country     ENUM('KR','US','global')             NOT NULL DEFAULT 'KR'
);

-- 외부 API 키 (KIS 토큰 영속 포함)
CREATE TABLE IF NOT EXISTS api_keys (
    service          VARCHAR(50)   PRIMARY KEY,
    access_key       VARCHAR(255)  NOT NULL,
    secret_key       VARCHAR(255),
    memo             VARCHAR(100),
    token            TEXT,
    token_expires_at DATETIME,
    expires_at       DATETIME,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 체결 로그 (수동 + 자동매매 통합)
CREATE TABLE IF NOT EXISTS logs (
    id          BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    order_uuid  VARCHAR(36),
    service     VARCHAR(50)      NOT NULL,
    ticker      VARCHAR(20)      NOT NULL,
    name        VARCHAR(100)     NOT NULL DEFAULT '',
    kind        ENUM('crypto','equity','us','cash') NOT NULL,
    side        ENUM('buy','sell') NOT NULL,
    amt         DECIMAL(18,8)    NOT NULL DEFAULT 0,
    price       DECIMAL(18,8)    NOT NULL DEFAULT 0,
    fee         DECIMAL(18,8)    NOT NULL DEFAULT 0,
    source      ENUM('manual','auto') NOT NULL DEFAULT 'manual',
    strategy_id INT,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticker  (ticker),
    INDEX idx_created (created_at)
);

-- 보유 lot (매수 단위별 기록 — 매도 시 삭제)
CREATE TABLE IF NOT EXISTS lots (
    id          VARCHAR(36)      PRIMARY KEY,
    ticker      VARCHAR(20)      NOT NULL,
    date        DATE             NOT NULL,
    time        TIME             NOT NULL,
    amt         DECIMAL(18,8)    NOT NULL,
    price       DECIMAL(18,8)    NOT NULL,
    source      ENUM('manual','auto') NOT NULL DEFAULT 'manual',
    strategy_id INT,
    INDEX idx_ticker      (ticker),
    INDEX idx_strategy_id (strategy_id)
);

-- 포트폴리오 일별 스냅샷 (Dashboard 차트용)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    date        DATE    PRIMARY KEY,
    total_value BIGINT  NOT NULL
);

-- 자동매매 전략 등록
CREATE TABLE IF NOT EXISTS strategies (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    strategy    VARCHAR(100)     NOT NULL,
    ticker      VARCHAR(20)      NOT NULL,
    service     VARCHAR(50)      NOT NULL,
    amount      DECIMAL(18,2)    NOT NULL DEFAULT 0,
    enabled     TINYINT(1)       NOT NULL DEFAULT 0,
    cron        VARCHAR(50)      NOT NULL DEFAULT '0 9 * * *',
    params      JSON,
    last_run    DATETIME,
    armed       TINYINT(1)       NOT NULL DEFAULT 1,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_strat_tick_svc (strategy, ticker, service)
);

-- DSL 전략 상태 (mem() 값 영속)
CREATE TABLE IF NOT EXISTS strategy_state (
    strategy_id INT          NOT NULL,
    idx         INT          NOT NULL,
    value       TEXT         NOT NULL,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (strategy_id, idx),
    FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);
