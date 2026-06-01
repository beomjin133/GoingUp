from abc import ABC, abstractmethod


class ExchangeAdapter(ABC):
    """
    거래소 어댑터 공통 인터페이스.
    새 거래소 추가 시 이 클래스를 상속해 두 메서드만 구현하면 됩니다.
    """

    @abstractmethod
    def get_holdings(self) -> list:
        """
        보유 종목 반환.
        필수 필드: id, ticker, name, kind, service, amt, avg_price, color
        선택 필드: price, daily_pct (현재가를 거래소 API에서 직접 제공하는 경우)
        """

    @abstractmethod
    def get_balance(self) -> float:
        """예수금(KRW) 반환."""

    def get_prices(self, tickers: list) -> dict:
        """현재가 반환. { ticker: { price, daily_pct } }"""
        return {}

    def get_transactions(self) -> list:
        """거래내역 반환. id, time, side, ticker, name, kind, amt, price, total"""
        return []

    def place_order(self, side: str, ticker: str, price: float, qty: float) -> dict:
        """주문 실행. { success: bool, msg: str }"""
        return {'success': False, 'msg': '이 거래소는 주문을 지원하지 않습니다'}
