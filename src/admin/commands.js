import config from '../config/index.js';
import { getWeeklyStats, getDailyStats, getActiveUsersStats, getTotalStats, getHourlyStats } from './statsService.js';
import { Telegraf, Markup } from 'telegraf';

const isAdmin = (userId) => config.adminIds.includes(userId);

const mainKeyboard = Markup.keyboard([
  ['👥 Пользователи'],
  ['🎵 Песни']
]).resize();

const periodKeyboard = Markup.keyboard([
  ['📅 За неделю'],
  ['⏰ По часам'],
  ['🔙 Назад']
]).resize();

const backKeyboard = Markup.keyboard([
  ['🔙 Назад']
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
      reply_markup: mainKeyboard.reply_markup
    });
  });

  bot.hears('👥 Пользователи', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    return ctx.reply('Выберите период:', {
      reply_markup: periodKeyboard.reply_markup
    });
  });

  bot.hears('🎵 Песни', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    return ctx.reply('Выберите период:', {
      reply_markup: periodKeyboard.reply_markup
    });
  });

  bot.hears('📅 За неделю', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const messageText = ctx.message.text;
    let stats, title;
    
    if (messageText.includes('Пользователи')) {
      stats = await getActiveUsersStats(7);
      title = '👥 Активные пользователи за неделю:';
    } else {
      stats = await getDailyStats(7);
      title = '🎵 Генерации песен за неделю:';
    }
    
    const text = title + '\n\n' +
      (stats.map(s => `${s.date}: ${s.count}`).join('\n') || 'Нет данных');
    
    return ctx.reply(text, {
      reply_markup: periodKeyboard.reply_markup
    });
  });

  bot.hears('⏰ По часам', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const messageText = ctx.message.text;
    let title;
    
    if (messageText.includes('Пользователи')) {
      title = '👥 Пользователи по часам за сегодня:';
    } else {
      title = '🎵 Песни по часам за сегодня:';
    }
    
    const stats = await getHourlyStats();
    const today = new Date().toISOString().split('T')[0];
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    
    const text = title + ` (${today}):\n\n` +
      (stats.map(s => `${s.hour}: ${s.count}`).join('\n')) +
      `\n\n📊 Итого: ${total}`;
    
    return ctx.reply(text, {
      reply_markup: periodKeyboard.reply_markup
    });
  });

  bot.hears('🔙 Назад', async (ctx) => {
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
      reply_markup: mainKeyboard.reply_markup
    });
  });
};
