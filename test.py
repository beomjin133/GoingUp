from pybithumb import Bithumb
import pyupbit
import time
import pymysql
import requests

#빗썸 api key
connet_key = 'e39270c706deab20d467240eb5d2ce40'
secret_key = 'd6e0d38f27abf6b34af8adb9bebc4772'

#업비트 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'

#바이낸스 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'

# mysql 연결
# conn = pymysql.connect(host='3.36.199.180', user='admin', password='546ff156!Mysql', db='system_trading', charset='utf8')
# cur = conn.cursor()

bithumb = Bithumb(connet_key, secret_key)
upbit = pyupbit.Upbit(api_key, api_secret)
# order_info = upbit.get_order("b46fe1bc-ecde-43bb-b856-3c84959ed2f8")

# test = "ask", "BTC", "C0101000000968409594", "KRW"
# decs = list(test)
# print(decs)
# print(bithumb.get_order_completed(decs))

# conn.close()

print(len('086d72d3-1208-45ff-a058-a6f42bb98047'))