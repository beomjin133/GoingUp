# 업비트

import pyupbit
import time
import json
import sys
import math
from slacker import Slacker

pre_cendle = -2 # 이전 봉

# 슬랙 api key
slack = Slacker('xoxb-1531345263733-1758973047428-eai3FL8oeWNsk2sBBI5QTqy2')

#업비트 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'

upbit = pyupbit.Upbit(api_key, api_secret)

def dbgout(message):
    """인자로 받은 문자열을 슬랙으로 출력한다."""

    slack.chat.post_message('#coin', message)

def round_down(value, point): #소수점을 버림하는 함수
    n = str(1)
    for _ in range(point):
        n = n + str(0)

    n = int(n)

    result = math.floor(value * n) / n

    return result

# 얼러트 신호를 받아온다
#ex) {"strategy": "heikinashi", "ticker": "KRW-XRP", "trade": "buy"}
alert_data = json.loads(sys.argv[1])[0]

strategy = alert_data['strategy'] # 전략
ticker = alert_data['ticker'] # 코인
trade = alert_data['trade'] # 매매
order_type = 'limit' # markey: 시장가   limit: 지정가
fee = 0.05

try:
    if trade == 'buy':
        # 보유 금액
        krw_balance = upbit.get_balance('KRW')

        # 주문 가능 금액
        order_krw = krw_balance * (1 - 0.01 * fee)

        # 주문 가능 수량
        ohlcv = pyupbit.get_ohlcv(ticker, 'day', count=2)['close']
        open_price = ohlcv.iloc[pre_cendle]

        amount = order_krw / open_price

        order_amount = round_down(amount, 8)

        # 주문
        if order_type == 'market':
            upbit.buy_market_order(ticker, order_krw)
        elif order_type == 'limit':
            upbit.buy_limit_order(ticker, open_price, order_amount)

        #dbgout('매수 성공')

    elif trade == 'sell':

        # 보유 수량
        amount = upbit.get_balance(ticker)

        # 시가 조회
        ohlcv = pyupbit.get_ohlcv(ticker, 'day', count=2)['close']
        open_price = ohlcv.iloc[pre_cendle]

        # 주문
        if order_type == 'market':
            upbit.sell_market_order(ticker, amount)
        elif order_type == 'limit':
            upbit.sell_limit_order(ticker, open_price, amount)
        time.sleep(1)
        krw_balance = upbit.get_balance('KRW')

        #dbgout("KRW 잔고" + str(krw_balance))

except Exception as e:
    dbgout(str(e))