import pymysql
import pyupbit
import os.path
import pandas as pd
from pybithumb import Bithumb

# mysql 연결
path = '/home/ec2-user/System-Trading/server.txt' # 실행환경이 서버인지 확인
if os.path.isfile(path):
    conn = pymysql.connect(host='127.0.0.1', user='root', password='546ff156!Mysql', db='system_trading', charset='utf8')
else:
    conn = pymysql.connect(host='3.36.199.180', user='admin', password='546ff156!Mysql', db='system_trading', charset='utf8')
cur = conn.cursor()

#업비트 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'

#빗썸 api key
connet_key = '183b1e7b0260f8359ea09ac267203043'
secret_key = '1a6e999d1c41a8b64f708c516b1a071d'

upbit = pyupbit.Upbit(api_key, api_secret)
bithumb = Bithumb(connet_key, secret_key)

def execute_sql(query): # sql문을 실행하는 함수
    cur.execute(query)
    conn.commit()

def read_sql(query):
    result = pd.read_sql_query(query, conn)
    return result

# 거래가 완료된 코인 trade_log 업데이트
trade_log = read_sql('SELECT * FROM trade_log WHERE status = "wait"') # trade_log DB에 status가 'wait'인 값 가져오기

for _, data in trade_log.iterrows():
    uuid = data['uuid'] # uuid
    order_info = upbit.get_order(uuid) # 거래 정보 불러오기
    
    if order_info['state'] == 'done': # 거래 정보가 'done' 상태면 trade_log 업데이트
        amount = float(order_info['executed_volume']) # 수량
        fee = float(order_info['paid_fee']) # 거래 수수료
        total_price = 0

        for trade in order_info['trades']:
            total_price += float(trade['funds'])

        avg_price = round(total_price/amount, 3) #평단가
        total_price += fee # 총 정산 금액

        user_id = data['user_id']
        strategy_name = data['strategy_name']
        exchange = data['exchange']
        trade_type = data['trade']

        # trade_log에 avg_price 업데이트
        execute_sql('UPDATE trade_log SET avg_price = "{}", amount = "{}", status = "{}" WHERE uuid = "{}"'
                    .format(avg_price, amount, "done", uuid)) # trade_log DB 업데이트
        
        
        if trade_type == 'buy':
            execute_sql('UPDATE balance SET amount = "{}", avg_buy_price = "{}" WHERE uuid = "{}"'
                        .format(amount, avg_price, uuid))
            execute_sql('UPDATE balance SET amount = amount - "{}" WHERE exchange = "{}" AND user_id = "{}" AND asset_type = "{}"'
                        .format(total_price, exchange, user_id, 'KRW'))


        elif trade_type == 'sell':
            # use_strategy_list에 balance 업데이트
            execute_sql('UPDATE use_strategy_list SET balance = "{}" WHERE strategy_name = "{}" AND user_id = "{}"'
                        .format(total_price, strategy_name, user_id))
            execute_sql('UPDATE balance SET amount = amount + "{}" WHERE exchange = "{}" AND asset_type = "{}" AND user_id = "{}"'
                        .format(total_price, exchange, 'KRW', user_id))

            # balance에 해당 row 삭제
            execute_sql('DELETE FROM balance WHERE uuid = "{}"'
                        .format(uuid)) 

balance_info = read_sql('SELECT * FROM balance WHERE avg_buy_price != "{}"'
                        .format('none')) # balance DB에 avg_buy_price 값이 없는 데이터만 가져옴

bithumb_price = dict() # 빗썸 거래소의 코인 가격 저장
upbit_price = dict() # 업비트 거래소의 코인 가격 저장

for _, balance in balance_info.iterrows():
    uuid = balance['uuid'] # uuid
    exchange = balance['exchange'] # 거래소
    coin_name = balance['name'] # 코인 이름

    if exchange == 'upbit':
        if coin_name not in upbit_price: # upbit_price에 코인 가격이 저장되어 있지 않으면 코인 가격 저장
            upbit_price[coin_name] = pyupbit.get_current_price('KRW-'+ coin_name)
        execute_sql('UPDATE balance SET current_price = "{}" WHERE uuid = "{}"'
                    .format(upbit_price[coin_name], uuid))


    elif exchange == 'bithumb':
        if coin_name not in bithumb_price: # bithumb_price에 코인 가격이 저장되어 있지 않으면 코인 가격 저장
            bithumb_price[coin_name] = Bithumb.get_current_price(coin_name)
        execute_sql('UPDATE balance SET current_price = "{}" WHERE uuid = "{}"'
                    .format(upbit_price[coin_name], uuid))

conn.close()