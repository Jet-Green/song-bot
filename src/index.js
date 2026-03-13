import connectDB from './db/index.js';
import { startBot } from './bot/index.js';
import { app } from './webhook/index.js';
import config from './config/index.js';

let adminBot;

const start = async () => {
  await connectDB();
  await startBot();
  
  if (config.adminBotToken) {
    const { Telegraf } = await import('telegraf');
    adminBot = new Telegraf(config.adminBotToken);
    
    const { setupAdminCommands } = await import('./admin/commands.js');
    setupAdminCommands(adminBot);
    
    adminBot.launch(() => {
      console.log('Admin bot started');
    });
  }
  
  console.log(`Webhook server running on port ${config.port}`);
};

start();
