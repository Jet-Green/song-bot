#!/bin/bash

echo "=== Song Bot Deployment ==="

# Проверка .env
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    exit 1
fi

# Установка зависимостей
echo "Installing dependencies..."
npm install

# Проверка MongoDB
echo "Checking MongoDB..."
node -e "require('./src/db')()" || echo "WARNING: MongoDB connection failed (will retry on start)"

# Запуск с PM2
echo "Starting bot with PM2..."
pm2 stop song-bot 2>/dev/null || true
pm2 delete song-bot 2>/dev/null || true
pm2 start src/index.js --name song-bot

# Сохранение и перезапуск после перезагрузки
pm2 save
pm2 startup

echo "=== Done! ==="
echo "Bot should be running. Check: pm2 status"
