import connectDB from './db/index.js';
import { startBot } from './bot/index.js';

const start = async () => {
  await connectDB();
  await startBot();
};

start();
