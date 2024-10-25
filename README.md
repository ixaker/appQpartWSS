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

<h3> Оновлення з github </h3>
./update_and_restart.sh

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

Запуск через Nginx:

Виконати команду для установки Nginx: sudo apt update sudo apt install nginx
Запустити Nginx: sudo systemctl start nginx
Переконатися, що Nginx працює: sudo systemctl status nginx
Встановлення Certbot:

Встановити Certbot та плагін для Nginx: sudo apt install certbot python3-certbot-nginx
Отримання сертифіката SSL:

Запустити Certbot для отримання сертифіката: sudo certbot --nginx
Дотримуватись вказівок на екрані для завершення процесу.
Налаштування автоматичного оновлення сертифікатів:

Додати cron-завдання для автоматичного оновлення сертифікатів: sudo crontab -e
Додати рядок для оновлення щодня о півночі: 0 0 \* \* \* certbot renew --quiet --nginx
Перевірка автоматичного оновлення:

Виконати тестове оновлення сертифіката: sudo certbot renew --dry-run --nginx
Переконатися, що тест пройшов успішно


# Встановлення nginx

## Оновлення списку пакетів
sudo apt update

## Встановлення nginx
sudo apt install nginx

## Налаштувати конфіг
sudo nano /etc/nginx/sites-available/wss.qpart.com.ua

## Створюємо симлінк в папці sites-enabled
sudo ln -s /etc/nginx/sites-available/wss.qpart.com.ua /etc/nginx/sites-enabled/

## Перевірка конфігурації nginx
sudo nginx -t

## Запуск nginx
sudo systemctl start nginx

## Зупинка nginx
sudo systemctl stop nginx

## Перевірка, чи працює nginx
sudo systemctl status nginx


# Встановлення Cerbot та плагіна для Nginx

## Оновити список пакетів
sudo apt update

## Встановлюємо Cerbot та плагін для Nginx
sudo apt install certbot python3-certbot-nginx

## Випускаємо сертифікати
sudo certbot --nginx -d wss.qpart.com.ua

## Редагуємо Crontab
sudo crontab -e

## Додати рядок в кінець файла
0 3 * * * /usr/bin/certbot renew --quiet --webroot -w /var/www/html


## Перевіряємо наявність запису
sudo crontab -l

## Створюємо потрібну папку
sudo mkdir -p /var/www/html/.well-known/acme-challenge

## Змінюємо права доступу
sudo chown -R www-data:www-data /var/www/html/.well-known
sudo chmod -R 755 /var/www/html/.well-known


# Конфіг Nginx

server {
    listen 80;
    server_name wss.qpart.com.ua;

    # Перенаправлення HTTP на HTTPS
    return 301 https://$host$request_uri;

}

server {
    listen 443 ssl;  # SSL на порту 443
    server_name wss.qpart.com.ua;

    client_max_body_size 50M;
    ssl_certificate /etc/letsencrypt/live/wss.qpart.com.ua/fullchain.pem; # managed by Certbot
  # Ваш сертифікат
    ssl_certificate_key /etc/letsencrypt/live/wss.qpart.com.ua/privkey.pem; # managed by Certbot
  # Ваш закритий ключ

    # Проксі для вашого веб-сервера
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        error_page 502 /502.html;
    }

    # Обробка статичних файлів
    location /static {
        alias /root/dev/wss/static;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

        location = /502.html {
        root /var/www/html;
        internal;
    }
}




