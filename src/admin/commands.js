import config from '../config/index.js';
import { getWeeklyStats, getDailyStats, getActiveUsersStats, getTotalStats } from './statsService.js';

const isAdmin = (userId) => config.adminIds.includes(userId);

export const setupAdminCommands = (bot) => {
  bot.command('start', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getTotalStats();
    const text = `📊 Статистика:\n\n` +
      `👥 Пользователей: ${stats.totalUsers}\n` +
      `🎵 Песен: ${stats.totalSongs}\n` +
      `💳 Платежей: ${stats.totalPayments}\n` +
      `💰 Доход: ${stats.totalRevenue}₽`;
    
    return ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 За недели', callback_data: 'stats_weeks' }],
          [{ text: '📅 За дни', callback_data: 'stats_days' }],
          [{ text: '👥 Активные', callback_data: 'stats_active' }]
        ]
      }
    });
  });

  bot.on('callback_query', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('Нет доступа', true);
    }
    
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();
    
    if (data === 'stats_weeks') {
      const stats = await getWeeklyStats(13);
      const text = stats.map(s => `Неделя ${s.week}: ${s.count}`).join('\n') || 'Нет данных';
      return ctx.editMessageText(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 За недели', callback_data: 'stats_weeks' }],
            [{ text: '📅 За дни', callback_data: 'stats_days' }],
            [{ text: '👥 Активные', callback_data: 'stats_active' }]
          ]
        }
      });
    }
    
    if (data === 'stats_days') {
      const stats = await getDailyStats(7);
      const text = stats.map(s => `${s.date}: ${s.count}`).join('\n') || 'Нет данных';
      return ctx.editMessageText(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 За недели', callback_data: 'stats_weeks' }],
            [{ text: '📅 За дни', callback_data: 'stats_days' }],
            [{ text: '👥 Активные', callback_data: 'stats_active' }]
          ]
        }
      });
    }
    
    if (data === 'stats_active') {
      const stats = await getActiveUsersStats(7);
      const text = stats.map(s => `${s.date}: ${s.count}`).join('\n') || 'Нет данных';
      return ctx.editMessageText(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 За недели', callback_data: 'stats_weeks' }],
            [{ text: '📅 За дни', callback_data: 'stats_days' }],
            [{ text: '👥 Активные', callback_data: 'stats_active' }]
          ]
        }
      });
    }
  });
};
