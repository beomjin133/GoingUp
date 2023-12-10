import pymysql
import pyupbit

#업비트 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'
upbit = pyupbit.Upbit(api_key, api_secret)

conn = pymysql.connect(host='3.36.199.180', user='admin', password='546ff156!Mysql', db='system_trading', charset='utf8')
cur = conn.cursor()

def execute_sql(sql): # sql문을 실행하는 함수
    cur.execute(sql)
    result = cur.fetchall()
    conn.commit()

    return result

exchange = 'upbit'
strategy = 'ma_eth'
ticker = 'KRW-ETH'
uuid = 'b46fe1bc-ecde-43bb-b856-3c84959ed2f8'
user_id = 1
state = 'wait'
trade = 'buy'
time = '2021-03-21T14:43:40+09:00'[0:10]
order_info = upbit.get_order("b46fe1bc-ecde-43bb-b856-3c84959ed2f8")
avg_price = 0
for t in order_info['trades']:
    avg_price += float(t['price']) * float(t['volume'])

avg_price /= float(order_info['executed_volume'])

created_at = order_info['created_at'][0:10]

amount = 1
# if state == 'done':
#     sql = 'insert into trade_log values("' + uuid + '", "' + exchange + '", "' + time[0:10] + '", "' + trade + '", "' + ticker[-3:] + '", "' + str(user_id) + '", "' + strategy + '", "' + state + '")'
# elif state == 'wait':
#     sql = 'insert into trade_log(uuid, exchange, time, trade, coin_name, user_id, strategy_name, status) values("' + uuid + '", "' + exchange + '", "' + time + '", "' + trade + '", "' + ticker[-3:] + '", "' + str(user_id) + '", "' + strategy + '", "' + state + '")'

# print(sql)
# execute_sql(sql)

# print(execute_sql('select * from balance where exchange = "' + exchange + '" and user_id = "' + str(user_id) + '" and strategy_name = "' + strategy + '"')[0])

# print('update trade_log set avg_price = ' + str(avg_price) + ', amount = ' + str(amount) + ', status = "done" where uuid = "' + uuid + '"')
# execute_sql('update trade_log set avg_price = ' + str(avg_price) + ', amount = ' + str(amount) + ', status = "done" where uuid = "' + uuid + '"')


execute_sql('update balance set amount = ' + str(amount) + ', avg_buy_price = ' + str(avg_price) + ' where uuid = "' + uuid + '"')

conn.close()