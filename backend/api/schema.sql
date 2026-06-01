CREATE DATABASE IF NOT EXISTS goingup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE goingup;

-- 거래소
CREATE TABLE exchanges (
    exchange    VARCHAR(50)     PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL,
    kind        ENUM('crypto','stock','both') NOT NULL,
    country     ENUM('KR','US','global')  NOT NULL DEFAULT 'KR'
);

-- 전체 거래내역 (매수/매도/입출금)
CREATE TABLE transactions (
    id      VARCHAR(36)     PRIMARY KEY,
    time    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    side    ENUM('buy','sell','deposit','withdraw') NOT NULL,
    ticker  VARCHAR(20)     NOT NULL,
    name    VARCHAR(50)     NOT NULL,
    kind    ENUM('crypto','equity','us','cash') NOT NULL,
    amt     DECIMAL(18,8)   NOT NULL,
    price   DECIMAL(18,8)   NOT NULL,
    total   BIGINT          NOT NULL
);

-- 매수 이력 (보유 중인 lot 단위)
-- id = transactions.id (같은 UUID)
CREATE TABLE lots (
    id      VARCHAR(36)     PRIMARY KEY,
    ticker  VARCHAR(20)     NOT NULL,
    date    DATE            NOT NULL,
    time    TIME            NOT NULL,
    amt     DECIMAL(18,8)   NOT NULL,
    price   DECIMAL(18,8)   NOT NULL,
    FOREIGN KEY (id) REFERENCES transactions(id)
);

-- 포트폴리오 일별 스냅샷 (Dashboard 차트용)
CREATE TABLE portfolio_snapshots (
    date        DATE    PRIMARY KEY,
    total_value BIGINT  NOT NULL
);

-- 외부 API 키
CREATE TABLE api_keys (
    service     VARCHAR(50)     PRIMARY KEY,
    access_key  VARCHAR(255)    NOT NULL,
    secret_key  VARCHAR(255),
    memo        VARCHAR(100),
    expires_at  DATETIME,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
);
