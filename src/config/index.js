import 'dotenv/config';

export default {
  botToken: process.env.BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
  adminIds: process.env.ADMIN_IDS.split(',').map(id => Number(id)),
  suno: {
    apiKey: process.env.SUNO_API_KEY,
    callbackUrl: process.env.SUNO_CALLBACK_URL,
    apiUrl: 'https://api.kie.ai'
  }
};
