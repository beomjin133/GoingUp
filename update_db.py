import pymysql
import pyupbit
from pybithumb import Bithumb

# mysql 연결
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

def execute_sql(sql): # sql문을 실행하는 함수
    cur.execute(sql)
    result = cur.fetchall()
    conn.commit()

    return result

trade_log = execute_sql('select * from trade_log where status = "wait"')

# balance의 avg_buy_price에 값이 있으면 current_pirce 값 insert

for t in trade_log:
    uuid = t[0]
    order_info = upbit.get_order(uuid)
    avg_price = 0
    amount = float(order_info['executed_volume'])
    for trade in order_info['trades']:
        avg_price += float(trade['price']) * float(trade['volume'])
    avg_price /= float(order_info['executed_volume'])

    if order_info['state'] == 'done':
        execute_sql(execute_sql('update trade_log set avg_price = ' + str(avg_price) + ', amount = ' + str(amount) + ', status = "done" where uuid = "' + uuid + '"'))
        
        trade_log = execute_sql('select * from trade_log where uuid = "b46fe1bc-ecde-43bb-b856-3c84959ed2f8"')[0]
        trade_type = trade_log[3]
        if trade_type == 'buy':
            execute_sql('update balance set amount = ' + str(amount) + 'avg_price = ' + str(avg_price) + ' where uuid = "' + uuid + '"')
        elif trade_type == 'sell':
            # ues_strategy_list에 balance 업데이트
            # balance에 해당 row 삭제
            print('esr')
