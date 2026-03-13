# Деплой на VPS

## 1. Подготовка сервера

```bash
# Обновление
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка MongoDB
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod

# Установка PM2
sudo npm install -g pm2
```

## 2. Настройка

```bash
# Клонировать проект
cd /var/www
git clone your-repo.git song-bot
cd song-bot

# Заполнить .env
nano .env
```

## 3. Запуск

```bash
chmod +x deploy.sh
./deploy.sh
```

## .env пример

```
BOT_TOKEN=...
MONGO_URI=mongodb://localhost:27017/songbot
ADMIN_IDS=...

SUNO_API_KEY=...
SUNO_CALLBACK_URL=https://your-domain.com/webhook/suno

WEBHOOK_URL=https://your-domain.com
PORT=3000
```
