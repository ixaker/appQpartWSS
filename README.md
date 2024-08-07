<h3>Команды для ручного запуска приложения:</h3>

    cd dev/wss
    node index.js
    npm run dev

<hr>

<h3>Команды для поиска процессов которые заняли TCP порт, и для завершения их:</h3>

    lsof -i :443
    kill -9 4733

<hr>

<h3>Создание службы для приложения:</h3>

    sudo nano /etc/systemd/system/webAppQpart.service

    [Unit]
    Description=webAppQpart
    After=network.target

    [Service]
    Type=simple
    WorkingDirectory=/root/dev/wss
    ExecStart=/usr/bin/node index.js
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target

    sudo systemctl daemon-reload
    sudo systemctl enable webAppQpart
    sudo systemctl start webAppQpart
    sudo systemctl disable webAppQpart
    sudo systemctl stop webAppQpart
    sudo systemctl restart webAppQpart

 <hr>

<h3>Установка NodeJS на чистую систему:</h3>

    sudo apt update
    sudo apt install curl

    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    node -v
    v18.17.0

    sudo apt install git
    git config --global user.email "xaker.dnepr@gmail.com"
    git config --global user.name "xaker"

 <hr>
 
<h3>Создание репозитория</h3>	ixaker/appQpartWSS

    rm -rf .git

    git init
    git add .
    git commit -m "first commit"
    git branch -M main
    git remote add origin git@github.com:ixaker/appQpartWSS.git
    git push -u origin main

 <hr>
 
<h3>Подключение к репозиторию</h3>

    mkdir -p /root/dev/wss
    cd /root/dev/wss
    git clone https://github.com/ixaker/appQpartWSS.git .
    npm install
    npm run dev

<h3>SSL сертификат</h3>

sudo apt install certbot

sudo systemctl stop webAppQpart

// генерирование сертификата в первый раз
sudo certbot certonly --standalone -d test.qpart.com.ua -d test.qpart.com.ua
sudo certbot certonly --standalone -d wss.qpart.com.ua -d wss.qpart.com.ua

//если выскочит ошибка из-за того что порт 80 занят то
//смотрим кто занял порт
sudo lsof -i :80

// останавливаем службу если это nginx
sudo systemctl stop nginx

в папке /etc/letsencrypt/live/wss.qpart.com.ua

- privkey.pem
- fullchain.pem

// перевыпуск сертификата
sudo certbot renew --dry-run

// полная команда перевыпуска сертификата
systemctl stop webAppQpart && certbot renew --dry-run && sudo systemctl start webAppQpart

npm install node-telegram-bot-api --save

// Зміна версії додатка
При публікації нової версії додатка на Production для автоматичного оновлення клієнтської частини необхідно оновити змінну version в .env

//Заміна url для звернення до 1с за query параметром в url.
Звернутись до ендпоінт https://test.qpart.com.ua/setip
і передати параметр для ip
Наприклад:
https://test.qpart.com.ua/setip?ip=http://10.8.0.3:23456/UTCRM_test/ru_RU/hs/app

інв.номери планшетів:
1722, 1755 - цех на Яхненківській

// Підключення папки сховища до віддаленого сховища фото
Connect storage to VPS

create script:
nano /root/mount_ftp.sh

paste this:
#!/bin/bash
curlftpfs -o allow_other cdn2028:Hk75pH9ZtEnx8P87@a7b85a942d4082eb.cdn.express /root/dev/wss/static/storage

save script and make exec:
chmod +x /root/mount_ftp.sh

open file settings crontab:
crontab -e

paste this:
@reboot /root/mount_ftp.sh

save file and reboot os.
