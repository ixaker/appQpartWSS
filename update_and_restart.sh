#!/bin/bash

# Задайте шлях до вашої директорії
TARGET_DIR="$HOME/dev/wss"

# Перевірте, чи директорія існує
if [ -d "$TARGET_DIR" ]; then
  cd "$TARGET_DIR" || { echo "Не вдалося перейти в директорію $TARGET_DIR"; exit 1; }
else
  echo "Директорія $TARGET_DIR не існує"
  exit 1
fi

# Витягування змін з гілки main
git pull origin main || { echo "Не вдалося виконати git pull"; exit 1; }

# Збільшення версії у файлі .env
if [ -f .env ]; then
  # Витягування поточної версії з урахуванням пробілів
  version=$(grep -oP '^version\s*=\s*\K\d+\.\d+\.\d+' .env)
  
  if [[ $version ]]; then
    # Розбиття версії на частини
    IFS='.' read -r major minor patch <<<"$version"
    
    # Збільшення патч-версії
    new_patch=$((patch + 1))
    
    # Формування нової версії
    new_version="$major.$minor.$new_patch"
    
    # Заміна старої версії на нову
    sed -i "s/^version\s*=\s*$version/version = $new_version/" .env
    
    echo "Версія оновлена до $new_version"
  else
    echo "Не вдалося знайти версію в .env"
    exit 1
  fi
else
  echo "Файл .env не знайдений"
  exit 1
fi

# Перезапуск сервісу
sudo systemctl restart webAppQpart.service || { echo "Не вдалося перезапустити сервіс"; exit 1; }

echo "Скрипт успішно виконаний"

