import connectDB from './db/index.js';
import { startBot } from './bot/index.js';
import { app } from './webhook/index.js';

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  await startBot();
  
  app.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
  });
};

start();
