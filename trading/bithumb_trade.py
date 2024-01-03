from pybithumb import Bithumb
import json
import sys
import math
import pymysql
from slacker import Slacker
import os.path

# 슬랙 api key
slack = Slacker('xoxb-1531345263733-1758973047428-eai3FL8oeWNsk2sBBI5QTqy2')

#빗썸 api key
connet_key = '183b1e7b0260f8359ea09ac267203043'
secret_key = '1a6e999d1c41a8b64f708c516b1a071d'

# mysql 연결
path = '/home/ec2-user/System-Trading/server.txt' # 실행환경이 서버인지 확인
if os.path.isfile(path):
    conn = pymysql.connect(host='127.0.0.1', user='root', password='546ff156!Mysql', db='system_trading', charset='utf8')
else:
    conn = pymysql.connect(host='3.36.199.180', user='admin', password='546ff156!Mysql', db='system_trading', charset='utf8')
cur = conn.cursor()

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

def execute_sql(sql): # sql문을 실행하는 함수
    cur.execute(sql)
    result = cur.fetchall()
    conn.commit()

    return result

# 얼러트 신호를 받아온다
#ex) {"strategy": "heikinashi", "ticker": "KRW-XRP", "trade": "buy"}
alert_data = json.loads(sys.argv[1])[0]

exchange = alert_data['exchange'] # 거래소
strategy = alert_data['strategy'] # 전략
ticker = alert_data['ticker'] # 코인
trade = alert_data['trade'] # 매매
fee = execute_sql('SELECT fee FROM exchange WHERE exchange = "' + exchange + '"')[0][0] # 거래 수수료

user_list = execute_sql('SELECT * FROM use_strategy_list WHERE strategy_name = "' + strategy + '"')

for user in user_list:

    user_id = user[2]
    order_type = user[4]

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

            execute_sql('INSERT INTO balance(exchange, asset_type, name, uuid, user_id, strategy_name) VALUES("' +exchange+ '", "coin", "' + ticker[-3:] + '", "' + uuid + '", "' + str(user_id) + '", "' + strategy + '")')
            execute_sql('INSERT INTO trade_log(uuid, exchange, time, trade, coin_name, user_id, strategy_name, status) VALUES("' + uuid + '", "' + exchange + '", "' + created_at + '", "' + trade + '", "' + ticker[-3:] + '", "' + str(user_id) + '", "' + strategy + '", "wait")')
            execute_sql('UPDATE strategy SET status = "running" WHERE strategy_name = "' + strategy + '"')

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