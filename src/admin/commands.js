import config from '../config/index.js';
import { getWeeklyStats, getDailyStats, getActiveUsersStats, getTotalStats, getHourlyStats } from './statsService.js';
import { Telegraf, Markup } from 'telegraf';

const isAdmin = (userId) => config.adminIds.includes(userId);

const adminKeyboard = Markup.keyboard([
  ['📊 Статистика'],
  ['👥 Пользователи', '🎵 Песни'],
  ['⏰ По часам']
]).resize();

const subKeyboard = Markup.keyboard([
  ['📊 Статистика'],
  ['👥 Пользователи', '🎵 Песни'],
  ['⏰ По часам']
]).resize();

export const setupAdminCommands = (bot) => {
  bot.command('start', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getTotalStats();
    const text = `📊 Панель администратора:\n\n` +
      `👥 Пользователей: ${stats.totalUsers}\n` +
      `🎵 Песен: ${stats.totalSongs}\n` +
      `💳 Платежей: ${stats.totalPayments}\n` +
      `💰 Доход: ${stats.totalRevenue}₽`;
    
    return ctx.reply(text, {
      reply_markup: adminKeyboard.reply_markup
    });
  });

  bot.hears('📊 Статистика', async (ctx) => {
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
      reply_markup: adminKeyboard.reply_markup
    });
  });

  bot.hears('👥 Пользователи', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getActiveUsersStats(7);
    const text = `👥 Активные пользователи за 7 дней:\n\n` +
      (stats.map(s => `${s.date}: ${s.count}`).join('\n') || 'Нет данных');
    
    return ctx.reply(text, {
      reply_markup: adminKeyboard.reply_markup
    });
  });

  bot.hears('🎵 Песни', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getDailyStats(7);
    const text = `🎵 Генерации песен за 7 дней:\n\n` +
      (stats.map(s => `${s.date}: ${s.count}`).join('\n') || 'Нет данных');
    
    return ctx.reply(text, {
      reply_markup: subKeyboard.reply_markup
    });
  });

  bot.hears('⏰ По часам', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const stats = await getHourlyStats();
    const today = new Date().toISOString().split('T')[0];
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    
    const text = `⏰ Статистика за сегодня (${today}):\n\n` +
      (stats.map(s => `${s.hour}: ${s.count}`).join('\n')) +
      `\n\n📊 Итого: ${total} песен`;
    
    return ctx.reply(text, {
      reply_markup: subKeyboard.reply_markup
    });
  });
};
