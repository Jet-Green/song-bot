import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const adminIds = process.env.ADMIN_IDS 
  ? process.env.ADMIN_IDS.split(',').map(id => Number(id))
  : [];

export default {
  botToken: process.env.BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
  adminIds,
  suno: {
    apiKey: process.env.SUNO_API_KEY,
    callbackUrl: process.env.SUNO_CALLBACK_URL,
    apiUrl: 'https://api.kie.ai'
  }
};
