import 'dotenv/config';

const adminIds = process.env.ADMIN_IDS 
  ? process.env.ADMIN_IDS.split(',').map(id => Number(id))
  : [];

export default {
  botToken: process.env.BOT_TOKEN,
  adminBotToken: process.env.ADMIN_BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
  adminIds,
  port: process.env.PORT || 3000,
  suno: {
    apiKey: process.env.SUNO_API_KEY,
    callbackUrl: process.env.SUNO_CALLBACK_URL,
    apiUrl: 'https://api.kie.ai'
  },
  robokassa: {
    merchantLogin: process.env.ROBOKASSA_LOGIN,
    password1: process.env.ROBOKASSA_PASSWORD1,
    password2: process.env.ROBOKASSA_PASSWORD2,
    isTest: process.env.ROBOKASSA_IS_TEST === 'true',
    callbackUrl: process.env.ROBOKASSA_CALLBACK_URL
  }
};
