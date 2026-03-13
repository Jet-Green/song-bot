import { isAdmin } from './middleware.js';
import Song from '../models/Song.js';
import User from '../models/User.js';

export const setupAdminCommands = (bot) => {
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('У вас нет доступа к этой команде');
    }
    
    try {
      const totalUsers = await User.countDocuments();
      const totalSongs = await Song.countDocuments();
      const pendingSongs = await Song.countDocuments({ status: 'pending' });
      const processingSongs = await Song.countDocuments({ status: 'processing' });
      const doneSongs = await Song.countDocuments({ status: 'done' });
      const errorSongs = await Song.countDocuments({ status: 'error' });
      
      return ctx.reply(
        `📊 Панель администратора:\n\n` +
        `Пользователей: ${totalUsers}\n` +
        `Всего песен: ${totalSongs}\n` +
        `В очереди: ${pendingSongs}\n` +
        `В процессе: ${processingSongs}\n` +
        `Готово: ${doneSongs}\n` +
        `Ошибки: ${errorSongs}`
      );
    } catch (error) {
      console.error('Admin command error:', error);
      return ctx.reply(`Ошибка: ${error.message}`);
    }
  });

  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('У вас нет доступа к этой команде');
    }
    
    const totalUsers = await User.countDocuments();
    return ctx.reply(`Всего пользователей: ${totalUsers}`);
  });

  bot.command('addbonus', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('У вас нет доступа к этой команде');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('Использование: /addbonus <telegram_id> <количество>');
    }
    
    const telegramId = Number(args[0]);
    const amount = Number(args[1]);
    
    if (isNaN(telegramId) || isNaN(amount)) {
      return ctx.reply('Некорректные параметры');
    }
    
    const user = await User.findOne({ telegram_id: telegramId });
    
    if (!user) {
      return ctx.reply('Пользователь не найден');
    }
    
    user.bonus_credits += amount;
    await user.save();
    
    return ctx.reply(
      `✅ Начислено ${amount} бонусных кредитов пользователю ${telegramId}\n` +
      `Новый баланс: ${user.bonus_credits} бонусных, ${user.credits} обычных`
    );
  });
};
