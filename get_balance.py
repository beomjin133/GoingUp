import pymysql
import pyupbit
import pandas as pd

# mysql 연결
conn = pymysql.connect(host='system-trading.csgsi4ivk5ad.ap-northeast-2.rds.amazonaws.com', user='root', password='546ff156!Mysql', db='system_trading', charset='utf8')
cur = conn.cursor()

#업비트 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'

upbit = pyupbit.Upbit(api_key, api_secret)

def execute_sql(query): # sql문을 실행하는 함수
    cur.execute(query)
    conn.commit()

def read_sql(query):
    result = pd.read_sql_query(query, conn)
    # print(result)
    return result

user_id = input()

balances = read_sql('SELECT * FROM balances WHERE user_id = {}'.format(user_id))
total_balances = read_sql('SELECT sum(balance) FROM balances')['sum(balance)'][0]

total_balance = 0
for _, balance in balances.iterrows():
    PL = balance['balance']
    PL_per = round((balance['current_price'] - balance['avg_buy_price']) / balance['avg_buy_price'] * 100, 2)
    
    if balance['asset_type'] == 'cash':
        print('{}\t| 보유금액 : {}\t'
              .format(balance['coin_name'], PL))
    else:
        
        print('{}\t| 평단가 : {}\t| 평가 손익 : {}({}%)'
                .format(balance['coin_name'], balance['avg_buy_price'], PL, PL_per))
    total_balance += PL

print('totoal\t| {}'.format(total_balance))
print('비율\t| {}'.format(total_balance / total_balances * 100))
print(upbit.get_balance('KRW'))