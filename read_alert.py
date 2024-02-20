# 얼러트 알람을 받아 전략을 판단한다.
import time
import json
import sys
import os
from slacker import Slacker

t = time.time()
# 슬랙 api key
slack = Slacker('xoxb-1531345263733-1758973047428-eai3FL8oeWNsk2sBBI5QTqy2')

def dbgout(message):
    """인자로 받은 문자열을 슬랙으로 출력한다."""

    slack.chat.post_message('#coin', message)


temp = sys.argv[1] # 임시저장
alert_json = json.loads(temp) #alert_json 데이터
alert = [temp] #alert 데이터

os.system('python3 /home/ec2-user/System-Trading/trading/' + alert_json['exchange'] + '_trade.py' + " " + str(alert))

dbgout('read_alert 시간'+ str(time.time()-t))