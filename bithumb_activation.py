from pybithumb import Bithumb
from slacker import Slacker

# 슬랙 api key
slack = Slacker('xoxb-1531345263733-1758973047428-eai3FL8oeWNsk2sBBI5QTqy2')

#빗썸 api key
connet_key = '183b1e7b0260f8359ea09ac267203043'
secret_key = '1a6e999d1c41a8b64f708c516b1a071d'

bithumb = Bithumb(connet_key, secret_key)

bithumb.get_balance('ETH')

slack.chat.post_message('#coin', '빗썸 api key 활성화')