from pybithumb import Bithumb
import pyupbit
import time

#빗썸 api key
connet_key = 'e39270c706deab20d467240eb5d2ce40'
secret_key = 'd6e0d38f27abf6b34af8adb9bebc4772'

#업비트 api key
api_key = 'K2s2e7KuWKEXxmgvGktqxr9CtOYQOGuCiYJ5x1Zg'
api_secret = 'n24sxlFZB0PvdYQiBwbFI1XHKidypkUcehk5xtZ8'

bithumb = Bithumb(connet_key, secret_key)
upbit = pyupbit.Upbit(api_key, api_secret)

order_info = upbit.get_order("b46fe1bc-ecde-43bb-b856-3c84959ed2f8")


while True:
    print(pyupbit.get_current_price('KRW-ETH'))
    time.sleep(1)