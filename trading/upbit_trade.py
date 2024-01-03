# 업비트

import pyupbit
import time
import json
import sys
import math
import pymysql
import os.path
import pandas as pd
from slacker import Slacker

pre_cendle = -2 # 이전 봉

# mysql 연결
path = '/home/ec2-user/System-Trading/server.txt' # 실행환경이 서버인지 확인
if os.path.isfile(path):
    conn = pymysql.connect(host='127.0.0.1', user='root', password='546ff156!Mysql', db='system_trading', charset='utf8')
else:
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

def execute_sql(query): # sql문을 실행하는 함수
    cur.execute(query)
    conn.commit()

def read_sql(query):
    result = pd.read_sql_query(query, conn)
    return result

# 얼러트 신호를 받아온다
#ex) {"exchange": "upbit", "strategy": "ma_eth", "ticker": "KRW-ETH", "trade": "sell"}
alert_data = json.loads(sys.argv[1])[0]

exchange = alert_data['exchange'] # 거래소
strategy = alert_data['strategy'] # 전략
ticker = alert_data['ticker'] # 코인
trade = alert_data['trade'] # 매매
fee = read_sql('SELECT fee FROM exchange WHERE exchange = "{}"'.format(exchange))['fee'][0] # 거래 수수료

user_list = read_sql('SELECT * FROM use_strategy_list WHERE strategy_name = "{}"'.format(strategy))

for _, user in user_list.iterrows():

    user_id = user['user_id']
    order_type = user['order_type']

    try:
        if trade == 'buy':
            # 보유 금액
            krw_balance = user['balance']

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

            created_at = order_info['created_at'][0:10]

            execute_sql('INSERT INTO balance(exchange, asset_type, name, uuid, user_id, strategy_name) VALUES("{}", "{}", "{}", "{}", "{}", "{}")'
                        .format(exchange, 'coin', ticker[-3:], uuid, user_id, strategy))
            execute_sql('INSERT INTO trade_log(uuid, exchange, time, trade, coin_name, user_id, strategy_name, status) VALUES("{}", "{}", "{}", "{}", "{}", "{}", "{}", "{}")'
                        .format(uuid, exchange, created_at, trade, ticker[-3:], user_id, strategy, 'wait'))
            execute_sql('UPDATE strategy SET status = "running" WHERE strategy_name = "{}"'
                        .format(strategy))

        elif trade == 'sell':
            balance_data = read_sql('SELECT * FROM balance WHERE exchange = "{}" AND user_id = "{}" AND strategy_name = "{}"'
                                    .format(exchange, user_id, strategy))

            # 보유 수량
            amount = balance_data['amount'].values[0]

            # 시가 조회
            ohlcv = pyupbit.get_ohlcv(ticker, 'day', count=2)['close']
            open_price = ohlcv.iloc[pre_cendle]

            # 주문
            if order_type == 'market':
                upbit.sell_market_order(ticker, amount)
            elif order_type == 'limit':
                upbit.sell_limit_order(ticker, open_price, amount)

            execute_sql('INSERT INTO trade_log(uuid, exchange, time, trade, coin_name, user_id, strategy_name, status) VALUES("{}", "{}", "{}", "{}", "{}", "{}", "{}", "{}")'
                        .format(uuid, exchange, created_at, trade, ticker[-3:], user_id, strategy, 'wait'))
            execute_sql('UPDATE strategy SET status = "running" WHERE strategy_name = "{}"'
                        .format(strategy))

    except Exception as e:
        dbgout(str(e))

conn.close()