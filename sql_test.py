import pymysql
import pyupbit
from pybithumb import Bithumb
import time
import pandas as pd
import os.path
from slacker import Slacker

#업비트 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'
upbit = pyupbit.Upbit(api_key, api_secret)

# 슬랙 api key
slack = Slacker('xoxb-1531345263733-1758973047428-eai3FL8oeWNsk2sBBI5QTqy2')

path = '/home/ec2-user/System-Trading/server.txt' # 실행환경이 서버인지 확인
if os.path.isfile(path):
    conn = pymysql.connect(host='127.0.0.1', user='root', password='546ff156!Mysql', db='system_trading', charset='utf8')
else:
    conn = pymysql.connect(host='3.36.199.180', user='admin', password='546ff156!Mysql', db='system_trading', charset='utf8')
cur = conn.cursor()

def execute_sql(query): # sql문을 실행하는 함수
    cur.execute(query)
    conn.commit()

def read_sql(query):
    result = pd.read_sql_query(query, conn)
    # print(result)
    return result

def dbgout(message):
    """인자로 받은 문자열을 슬랙으로 출력한다."""

    slack.chat.post_message('#coin', message)


uuid = 'b46fe1bc-ecde-43bb-b856-3c84959ed2f8'

state = 'wait'
trade = 'buy'
# time = '2021-03-21T14:43:40+09:00'[0:10]
order_info = upbit.get_order(uuid)
avg_price = 0
amount = 1
exchange = 'upbit'
ticker = 'KRW-ETH'
uuid = 'test'
user_id = 1
strategy = 'ma_eth'
created_at = order_info['created_at'][0:10]
trade = 'test'
fee = float(order_info['paid_fee']) # 거래 수수료
bithumb_price = dict() # 빗썸 거래소의 코인 가격 저장
upbit_price = dict() # 업비트 거래소의 코인 가격 저장








for i in range(1,3):
    total_balance = 0
    balance = read_sql('SELECT * FROM balance WHERE user_id = "{}"'.format(i))
    for _, data in balance.iterrows():
        if data['asset_type'] == 'KRW':
            total_balance += data['amount']
        else:
            total_balance += data['amount'] * data['current_price']

    print(total_balance)

conn.close()