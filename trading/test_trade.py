# 업비트

import json
import sys
from slacker import Slacker


# 슬랙 api key
slack = Slacker('xoxb-1531345263733-1758973047428-eai3FL8oeWNsk2sBBI5QTqy2')


def dbgout(message):
    """인자로 받은 문자열을 파이썬 셸과 슬랙으로 동시에 출력한다."""

    slack.chat.post_message('#coin', message)

# dbgout('진입 성공')

# 얼러트 신호를 받아온다
#ex) {"strategy": "heikinashi", "ticker": "KRW-XRP", "trade": "buy"}
try:
    alert_data = json.loads(sys.argv[1])[0]
    # dbgout('얼러트 신호 읽어오기 성공' + str(alert_data))
except Exception as ex:
    dbgout(str(ex))
    
