import os

# 업데이트
os.system("sudo dnf update -y")

os.system("sudo wget https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm")
os.system("sudo dnf install mysql80-community-release-el9-1.noarch.rpm -y")
os.system("sudo dnf install mysql-community-server -y")
os.system("sudo systemctl start mysqld")

# Apache, PHP, DB 설치
#os.system("sudo dnf install -y httpd php php-mysqli mariadb105")
os.system("sudo dnf install -y httpd php")
os.system("sudo systemctl start httpd")

# 권한 설정
os.system("sudo chown -R ec2-user /var")
os.system("sudo chmod 2775 /var")
os.system("sudo chmod 751 /home/ec2-user")
os.system("sudo -u apache python3 /home/ec2-user/System-Trading/trading/read_alert.py")
os.system("sudo chmod 771 /var/lib/mysql")

# php 파일 이동
os.system("sudo cp /home/ec2-user/System-Trading/html/get_alert.php /var/www/html")