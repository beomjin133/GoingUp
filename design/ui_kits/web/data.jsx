// Mock market data used across components.
const MARKETS = [
  { ticker: "BTC",  name: "비트코인",   pair: "BTC/KRW",  price: 94210000, change: 2.54,  vol: "1.2조",   kind: "crypto" },
  { ticker: "ETH",  name: "이더리움",   pair: "ETH/KRW",  price: 4812500,  change: 1.88,  vol: "4,210억", kind: "crypto" },
  { ticker: "XRP",  name: "리플",       pair: "XRP/KRW",  price: 3124,     change: -0.94, vol: "2,812억", kind: "crypto" },
  { ticker: "SOL",  name: "솔라나",     pair: "SOL/KRW",  price: 348200,   change: 5.12,  vol: "1,048억", kind: "crypto" },
  { ticker: "DOGE", name: "도지코인",   pair: "DOGE/KRW", price: 512,      change: -2.14, vol: "812억",   kind: "crypto" },
  { ticker: "ADA",  name: "에이다",     pair: "ADA/KRW",  price: 912,      change: 3.88,  vol: "421억",   kind: "crypto" },
  { ticker: "AVAX", name: "아발란체",   pair: "AVAX/KRW", price: 52400,    change: 1.02,  vol: "284억",   kind: "crypto" },
  { ticker: "LINK", name: "체인링크",   pair: "LINK/KRW", price: 28120,    change: -0.42, vol: "210억",   kind: "crypto" },
  { ticker: "005930", name: "삼성전자", pair: "005930",   price: 82400,    change: -0.24, vol: "5,210억", kind: "equity" },
  { ticker: "000660", name: "SK하이닉스", pair: "000660", price: 248000,   change: 1.84,  vol: "3,120억", kind: "equity" },
  { ticker: "035720", name: "카카오",   pair: "035720",   price: 42850,    change: 2.12,  vol: "1,812억", kind: "equity" },
  { ticker: "035420", name: "NAVER",    pair: "035420",   price: 214500,   change: -1.24, vol: "2,480억", kind: "equity" },
];

const fmt = (n) => n.toLocaleString("ko-KR");
const fmtPct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";
const fmtSigned = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toLocaleString("ko-KR");

Object.assign(window, { MARKETS, fmt, fmtPct, fmtSigned });
