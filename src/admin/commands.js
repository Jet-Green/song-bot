import config from '../config/index.js';
import { getWeeklyStats, getDailyStats, getActiveUsersStats, getTotalStats } from './statsService.js';

const isAdmin = (userId) => config.adminIds.includes(userId);

export const setupAdminCommands = (bot) => {
  bot.command('stats_weeks', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getWeeklyStats(13);
    const text = stats
      .map(s => `Неделя ${s.week}: ${s.count} песен`)
      .join('\n');
    
    return ctx.reply(text || 'Нет данных');
  });

  bot.command('stats_days', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getDailyStats(7);
    const text = stats
      .map(s => `${s.date}: ${s.count} песен`)
      .join('\n');
    
    return ctx.reply(text || 'Нет данных');
  });

  bot.command('stats_active_users', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getActiveUsersStats(7);
    const text = stats
      .map(s => `${s.date}: ${s.count} активных пользователей`)
      .join('\n');
    
    return ctx.reply(text || 'Нет данных');
  });

  bot.command('stats_total', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getTotalStats();
    const text = `Всего пользователей: ${stats.totalUsers}\n` +
      `Всего песен: ${stats.totalSongs}\n` +
      `Всего платежей: ${stats.totalPayments}\n` +
      `Общий доход: ${stats.totalRevenue}₽`;
    
    return ctx.reply(text);
  });
};
