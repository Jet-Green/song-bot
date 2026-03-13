import { Telegraf, Markup } from 'telegraf';
import config from '../config/index.js';
import { setupCommands } from './commands.js';

export const bot = new Telegraf(config.botToken);

const mainKeyboard = Markup.keyboard([
  ['🎵 Сгенерировать песню', '💰 Мой баланс'],
  ['📜 Мои песни', '💎 Купить кредиты']
]).resize();

export const startBot = async () => {
  console.log('Starting bot...');
  console.log('Bot token:', config.botToken ? 'set' : 'MISSING');
  console.log('Webhook URL:', process.env.WEBHOOK_URL || 'not set');
  
  setupCommands(bot, mainKeyboard);
  
  const webhookUrl = process.env.WEBHOOK_URL;
  
  if (webhookUrl) {
    try {
      await bot.telegram.setWebhook(`${webhookUrl}/webhook/telegram`);
      console.log(`Webhook set to: ${webhookUrl}/webhook/telegram`);
    } catch (error) {
      console.error('Failed to set webhook:', error.message);
    }
  } else {
    console.log('Running in polling mode');
    bot.launch();
  }
  
  return bot;
};
