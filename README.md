Нажмите Ctrl + Shift + P, чтобы открыть командное окно Visual Studio Code.
Наберите Preferences: Open Settings (JSON) и нажмите Enter. Это откроет ваш файл настроек settings.json.

cd dev/wss
node index.js
npm run dev

lsof -i :443
kill -9 4733

sudo systemctl daemon-reload
sudo systemctl enable webAppQpart
sudo systemctl start webAppQpart
sudo systemctl disable webAppQpart
sudo systemctl stop webAppQpart
sudo systemctl restart webAppQpart

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



