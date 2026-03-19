import { Telegraf, Markup } from 'telegraf';
import config from '../config/index.js';
import { setupCommands } from './commands.js';
import { KEYBOARDS } from './messages.js';

export const bot = new Telegraf(config.botToken);

const mainKeyboard = Markup.keyboard(KEYBOARDS.main).resize();

export const startBot = async () => {
  console.log('Starting bot in polling mode...');
  
  setupCommands(bot, mainKeyboard);
  
  bot.launch();
  console.log('Bot started in polling mode');
  
  return bot;
};
