import config from '../config/index.js';
import { getWeeklyStats, getDailyStats, getActiveUsersStats, getTotalStats, getHourlyStats } from './statsService.js';
import User from '../models/User.js';
import Song from '../models/Song.js';
import { getMusicDetails } from '../services/sunoService.js';
import { Telegraf, Markup } from 'telegraf';
import { MESSAGES, KEYBOARDS } from './messages.js';

const isAdmin = (userId) => config.adminIds.includes(userId);

export const setupAdminCommands = (bot) => {
  bot.command('start', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const stats = await getTotalStats();
    
    return ctx.reply(MESSAGES.ADMIN_PANEL(stats), {
      reply_markup: Markup.keyboard(KEYBOARDS.main).resize().reply_markup
    });
  });

  bot.hears('👥 Пользователи', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    return ctx.reply(MESSAGES.SELECT_PERIOD, {
      reply_markup: Markup.keyboard(KEYBOARDS.period).resize().reply_markup
    });
  });

  bot.hears('🎵 Песни', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    return ctx.reply(MESSAGES.SELECT_PERIOD, {
      reply_markup: Markup.keyboard(KEYBOARDS.period).resize().reply_markup
    });
  });

  bot.hears('📅 За неделю', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const messageText = ctx.message.text;
    let stats, title;
    
    if (messageText.includes('Пользователи')) {
      stats = await getActiveUsersStats(7);
      title = MESSAGES.ACTIVE_USERS_WEEK;
    } else {
      stats = await getDailyStats(7);
      title = MESSAGES.SONGS_WEEK;
    }
    
    const text = title + '\n\n' +
      (stats.map(s => `${s.date}: ${s.count}`).join('\n') || MESSAGES.NO_DATA);
    
    return ctx.reply(text, {
      reply_markup: Markup.keyboard(KEYBOARDS.period).resize().reply_markup
    });
  });

  bot.hears('⏰ По часам', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const messageText = ctx.message.text;
    let title;
    
    if (messageText.includes('Пользователи')) {
      title = MESSAGES.USERS_HOURLY;
    } else {
      title = MESSAGES.SONGS_HOURLY;
    }
    
    const stats = await getHourlyStats();
    const today = new Date().toISOString().split('T')[0];
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    
    const text = title + ` (${today}):\n\n` +
      (stats.map(s => `${s.hour}: ${s.count}`).join('\n')) +
      `\n\n${MESSAGES.TOTAL_TODAY(total)}`;
    
    return ctx.reply(text, {
      reply_markup: Markup.keyboard(KEYBOARDS.period).resize().reply_markup
    });
  });

  bot.hears('🔙 Назад', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const stats = await getTotalStats();
    
    return ctx.reply(MESSAGES.ADMIN_PANEL(stats), {
      reply_markup: Markup.keyboard(KEYBOARDS.main).resize().reply_markup
    });
  });

  bot.hears('💰 Начислить бонусы', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    return ctx.reply(MESSAGES.BONUS_INSTRUCTIONS, {
      reply_markup: Markup.keyboard(KEYBOARDS.back).resize().reply_markup
    });
  });

  bot.command('add_bonus', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply(MESSAGES.BONUS_USAGE);
    }
    
    const telegramId = Number(args[0]);
    const amount = Number(args[1]);
    
    if (isNaN(telegramId) || isNaN(amount)) {
      return ctx.reply(MESSAGES.BONUS_INVALID_PARAMS);
    }
    
    const user = await User.findOne({ telegram_id: telegramId });
    
    if (!user) {
      return ctx.reply(MESSAGES.BONUS_USER_NOT_FOUND);
    }
    
    user.bonus_credits += amount;
    await user.save();
    
    return ctx.reply(MESSAGES.BONUS_SUCCESS(amount, telegramId, user.bonus_credits, user.credits));
  });

  bot.command('songstatus', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 1) {
      return ctx.reply(MESSAGES.SONG_STATUS_USAGE);
    }
    
    const providerSongId = args[0];
    
    const song = await Song.findOne({ provider_song_id: providerSongId });
    
    if (!song) {
      return ctx.reply(MESSAGES.SONG_NOT_FOUND_DB);
    }
    
    await ctx.reply(MESSAGES.CHECKING_STATUS);
    
    const details = await getMusicDetails(providerSongId);
    
    if (!details || details.code !== 200) {
      return ctx.reply(MESSAGES.SONG_STATUS(
        song._id,
        song.prompt,
        song.status,
        song.audio_url
      ));
    }
    
    const data = details.data;
    let statusText = MESSAGES.SONG_STATUS_DETAIL(data, song);
    
    if (data.response?.sunoData?.length > 0) {
      const track = data.response.sunoData[0];
      statusText += '\n' + MESSAGES.SONG_READY(track);
      
      if (song.status !== 'done') {
        await Song.findByIdAndUpdate(song._id, {
          status: 'done',
          audio_url: track.audioUrl,
          lyrics: track.prompt,
          duration_sec: track.duration,
          finished_at: new Date()
        });
        statusText += '\n' + MESSAGES.DB_UPDATED;
      }
    } else if (data.status === 'PENDING' || data.status === 'TEXT_SUCCESS' || data.status === 'FIRST_SUCCESS') {
      statusText += ' ' + MESSAGES.SONG_PROCESSING;
    } else if (data.status === 'CREATE_TASK_FAILED' || data.status === 'GENERATE_AUDIO_FAILED' || data.status === 'SENSITIVE_WORD_ERROR') {
      statusText += ' ' + MESSAGES.SONG_ERROR(data.errorMessage || data.status);
      
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
