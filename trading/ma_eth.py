# 업비트

import pyupbit
import time
import json
import sys
import math
import pymysql
from slacker import Slacker

pre_cendle = -2 # 이전 봉

# mysql 연결
conn = pymysql.connect(host='3.36.199.180', user='admin', password='546ff156!Mysql', db='system_trading', charset='utf8')
cur = conn.cursor()

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

def execute_sql(sql): # sql문을 실행하는 함수
    cur.execute(sql)
    result = cur.fetchall()
    conn.commit()

    return result

# 얼러트 신호를 받아온다
#ex) {"exchange": "upbit", "strategy": "ma_eth", "ticker": "KRW-ETH", "trade": "sell"}
alert_data = json.loads(sys.argv[1])[0]

exchange = alert_data['exchamge'] # 거래소
strategy = alert_data['strategy'] # 전략
ticker = alert_data['ticker'] # 코인
trade = alert_data['trade'] # 매매
fee = execute_sql('select fee from exchange where exchange = "' + exchange + '"')[0][0] # 거래 수수료

user_list = execute_sql('select * from use_strategy_list where strategy_name = "' + strategy + '"')

for user in user_list:

    user_id = user[2]
    order_type = user[4]

    try:
        if trade == 'buy':
            # 보유 금액
            krw_balance = user[3]

            # 주문 가능 금액
            order_krw = krw_balance * (1 - 0.01 * fee)

            # 주문 가능 수량
            ohlcv = pyupbit.get_ohlcv(ticker, 'day', count=2)['close']
            open_price = ohlcv.iloc[pre_cendle]

            amount = order_krw / open_price

            order_amount = round_down(amount, 8)

            # 주문
            if order_type == 'market':
                order_info = upbit.buy_market_order(ticker, order_krw)
            elif order_type == 'limit':
                order_info = upbit.buy_limit_order(ticker, open_price, order_amount)

            uuid = order_info['uuid']
            


            state = order_info['state']
            created_at = order_info['created_at'][0:10]

            execute_sql('insert into balance(exchange, asset_type, name, uuid, user_id, strategy_name) values("' +exchange+ '", "coin", "' + ticker[-3:] + '", "' + uuid + '", "' + str(user_id) + '", "' + strategy + '")')
            execute_sql('insert into trade_log(uuid, exchange, time, trade, coin_name, user_id, strategy_name, status) values("' + uuid + '", "' + exchange + '", "' + created_at + '", "' + trade + '", "' + ticker[-3:] + '", "' + str(user_id) + '", "' + strategy + '", "' + state + '")')
            execute_sql('update strategy set status = "running" where strategy_name = "' + strategy + '"')

        elif trade == 'sell':
            balance_data = execute_sql('select * from balance where exchange = "' + exchange + '" and user_id = "' + str(user_id) + '" and strategy_name = "' + strategy + '"')[0]

            # 보유 수량
            amount = balance_data[4]

            # 시가 조회
            ohlcv = pyupbit.get_ohlcv(ticker, 'day', count=2)['close']
            open_price = ohlcv.iloc[pre_cendle]

            # 주문
            if order_type == 'market':
                upbit.sell_market_order(ticker, amount)
            elif order_type == 'limit':
                upbit.sell_limit_order(ticker, open_price, amount)

            execute_sql('insert into trade_log(uuid, exchange, time, trade, coin_name, user_id, strategy_name, status) values("' + uuid + '", "' + exchange + '", "' + created_at + '", "' + trade + '", "' + ticker[-3:] + '", "' + str(user_id) + '", "' + strategy + '", "' + state + '")')
            execute_sql('update strategy set status = "ready" where strategy_name = "' + strategy + '"')

    except Exception as e:
        dbgout(str(e))


conn.close()