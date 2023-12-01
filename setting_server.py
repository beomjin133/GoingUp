import os

# 업데이트
os.system("sudo dnf update -y")

# Apache, PHP, DB 설치
os.system("sudo dnf install -y httpd php php-mysqli mariadb105")
os.system("sudo systemctl start httpd")

# 권한 설정
os.system("sudo chown -R ec2-user /var")
os.system("sudo chmod 2775 /var")
os.system("sudo chmod 751 /home/ec2-user")
os.system("sudo -u apache python3 /home/ec2-user/System-Trading/trading/read_alert.py")

# php 파일 이동
os.system("sudo cp html/get_alert.php /var/www/html")