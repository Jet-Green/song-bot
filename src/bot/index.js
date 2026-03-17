import { Telegraf, Markup } from 'telegraf';
import config from '../config/index.js';
import { setupCommands } from './commands.js';

export const bot = new Telegraf(config.botToken);

const mainKeyboard = Markup.keyboard([
  ['🎵 Сгенерировать песню', '💰 Мой баланс'],
  ['📜 Мои песни', '💎 Купить кредиты'],
  ['📄 Документы', '👥 Пригласить друга']
]).resize();

export const startBot = async () => {
  console.log('Starting bot in polling mode...');
  
  setupCommands(bot, mainKeyboard);
  
  bot.launch();
  console.log('Bot started in polling mode');
  
  return bot;
};
