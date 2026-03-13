import { Telegraf } from 'telegraf';
import config from '../config/index.js';
import { setupAdminCommands } from './commands.js';

const bot = new Telegraf(config.adminBotToken);

setupAdminCommands(bot);

bot.launch(() => {
  console.log('Admin bot started');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
