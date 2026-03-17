import config from '../config/index.js';
import { getWeeklyStats, getDailyStats, getActiveUsersStats, getTotalStats, getHourlyStats } from './statsService.js';
import User from '../models/User.js';
import Song from '../models/Song.js';
import { getMusicDetails } from '../services/sunoService.js';
import { Telegraf, Markup } from 'telegraf';

const isAdmin = (userId) => config.adminIds.includes(userId);

const mainKeyboard = Markup.keyboard([
  ['👥 Пользователи'],
  ['🎵 Песни'],
  ['💰 Начислить бонусы']
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

  bot.hears('💰 Начислить бонусы', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    return ctx.reply(
      'Введите данные в формате:\n/add_bonus telegram_id количество\n\nНапример: /add_bonus 123456789 100',
      { reply_markup: backKeyboard.reply_markup }
    );
  });

  bot.command('add_bonus', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('Использование: /add_bonus <telegram_id> <количество>');
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

  bot.command('songstatus', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Нет доступа');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 1) {
      return ctx.reply('Использование: /songstatus <provider_song_id>');
    }
    
    const providerSongId = args[0];
    
    const song = await Song.findOne({ provider_song_id: providerSongId });
    
    if (!song) {
      return ctx.reply('Песня не найдена в БД');
    }
    
    await ctx.reply('Проверяю статус...');
    
    const details = await getMusicDetails(providerSongId);
    
    if (!details || details.code !== 200) {
      return ctx.reply(
        `🎵 Статус песни:\n\n` +
        `ID: ${song._id}\n` +
        `Prompt: ${song.prompt}\n` +
        `Status в БД: ${song.status}\n` +
        `Audio URL: ${song.audio_url || 'нет'}\n\n` +
        `❌ Не удалось получить статус из API`
      );
    }
    
    const data = details.data;
    let statusText = `🎵 *Статус песни:*\n\n`;
    statusText += `*Suno Status:* ${data.status}\n`;
    statusText += `*Prompt:* ${song.prompt}\n`;
    
    if (data.response?.sunoData?.length > 0) {
      const track = data.response.sunoData[0];
      statusText += `\n✅ *Готово!*\n`;
      statusText += `Title: ${track.title}\n`;
      statusText += `Audio: ${track.audioUrl}\n`;
      statusText += `Duration: ${track.duration} сек\n`;
      statusText += `Tags: ${track.tags}\n`;
      
      if (song.status !== 'done') {
        await Song.findByIdAndUpdate(song._id, {
          status: 'done',
          audio_url: track.audioUrl,
          lyrics: track.prompt,
          duration_sec: track.duration,
          finished_at: new Date()
        });
        statusText += `\n_Обновлено в БД_`;
      }
    } else if (data.status === 'PENDING' || data.status === 'TEXT_SUCCESS' || data.status === 'FIRST_SUCCESS') {
      statusText += `\n⏳ *В процессе...*`;
    } else if (data.status === 'CREATE_TASK_FAILED' || data.status === 'GENERATE_AUDIO_FAILED' || data.status === 'SENSITIVE_WORD_ERROR') {
      statusText += `\n❌ *Ошибка:* ${data.errorMessage || data.status}`;
      
      if (song.status !== 'error') {
        await Song.findByIdAndUpdate(song._id, {
          status: 'error',
          finished_at: new Date()
        });
      }
    }
    
    return ctx.replyWithMarkdown(statusText);
  });
};
