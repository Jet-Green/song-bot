import connectDB from './db/index.js';
import { startBot } from './bot/index.js';
import { app } from './webhook/index.js';
import config from './config/index.js';

const start = async () => {
  await connectDB();
  await startBot();
  
  console.log(`Webhook server running on port ${config.port}`);
};

start();
