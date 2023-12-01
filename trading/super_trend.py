from pybithumb import Bithumb
import json
import sys
import math
from slacker import Slacker

# 슬랙 api key
slack = Slacker('xoxb-1531345263733-1758973047428-eai3FL8oeWNsk2sBBI5QTqy2')

#빗썸 api key
connet_key = '183b1e7b0260f8359ea09ac267203043'
secret_key = '1a6e999d1c41a8b64f708c516b1a071d'

bithumb = Bithumb(connet_key, secret_key)

pre_cendle = -2 # 이전 봉


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
fee = 0.0025 # 수수료

try:
    if trade == 'buy':
        # 보유 금액
        krw_balance = bithumb.get_balance(ticker)[2]

        # 주문 가능 금액
        order_krw = krw_balance * (1- 0.01 * fee)

        # 주문 가능 수량
        ohlcv = Bithumb.get_candlestick(ticker, chart_intervals="1h").iloc[pre_cendle]
        open_price = ohlcv['close']

        amount = order_krw / open_price

        order_amount = round_down(amount, 4)

        # 주문
        if order_type == 'market':
            desc = bithumb.buy_market_order(ticker, order_amount)
        elif order_type == 'limit':
            desc = bithumb.buy_limit_order(ticker, open_price, order_amount)

        dbgout(str(desc))

    elif trade == 'sell':
        # 보유 수량
        amount = bithumb.get_balance(ticker)[0]
        order_amount = round_down(amount, 4)

        # 시가 조회
        ohlcv = Bithumb.get_candlestick(ticker, chart_intervals="1h").iloc[pre_cendle]
        open_price = ohlcv['close']

        # 주문
        if order_type == 'market':
            desc = bithumb.sell_market_order(ticker, order_amount)
        elif order_type == 'limit':
            desc = bithumb.sell_limit_order(ticker, open_price, order_amount)

        dbgout(str(desc))

except Exception as e:
    dbgout(str(e))