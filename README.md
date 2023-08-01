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
    
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
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


