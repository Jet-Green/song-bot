import { Telegraf, Markup } from 'telegraf';
import config from '../config/index.js';
import { setupCommands } from './commands.js';

export const bot = new Telegraf(config.botToken);

const mainKeyboard = Markup.keyboard([
  ['🎵 Сгенерировать песню', '💰 Мой баланс'],
  ['📜 Мои песни', '💎 Купить кредиты']
]).resize();

export const startBot = async () => {
  setupCommands(bot, mainKeyboard);
  
  const webhookUrl = process.env.WEBHOOK_URL;
  
  if (webhookUrl) {
    await bot.telegram.setWebhook(`${webhookUrl}/webhook/telegram`);
    console.log(`Webhook set to: ${webhookUrl}/webhook/telegram`);
  } else {
    console.log('WEBHOOK_URL not set, running in polling mode');
    bot.launch();
  }
  
  return bot;
};
