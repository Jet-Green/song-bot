import config from '../config/index.js';
import { getWeeklyStats, getDailyStats, getActiveUsersStats, getTotalStats, getHourlyStats, getFunnelByDays, getFunnelByHours, getRegistrationsStats, getRegistrationsByHours, getPaywallByHours, getAllEventsByHours } from './statsService.js';
import User from '../models/User.js';
import Song from '../models/Song.js';
import { getMusicDetails } from '../services/sunoService.js';
import { Telegraf, Markup } from 'telegraf';
import { MESSAGES, KEYBOARDS } from './messages.js';

const isAdmin = (userId) => config.adminIds.includes(userId);

const broadcastState = new Map();
const pad = (val, len = 5) => String(val).padEnd(len);

export const setupAdminCommands = (bot, userBot) => {
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
      stats = await getRegistrationsStats(7);
      title = '👥 Регистрации за неделю:';
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
    let title, stats;
    
    if (messageText.includes('Пользователи')) {
      title = '👥 Регистрации по часам за сегодня (МСК):';
      stats = await getRegistrationsByHours();
    } else {
      title = '🎵 Песни по часам за сегодня (МСК):';
      stats = await getHourlyStats();
    }
    
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

  bot.hears('📊 Воронка', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    return ctx.reply(MESSAGES.SELECT_PERIOD, {
      reply_markup: Markup.keyboard(KEYBOARDS.funnel).resize().reply_markup
    });
  });

  bot.hears('📈 Статистика', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    return ctx.reply('Выберите статистику:', {
      reply_markup: Markup.keyboard(KEYBOARDS.stats).resize().reply_markup
    });
  });

  bot.hears('📊 Все события', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const stats = await getFunnelByHours();
    
    let text = MESSAGES.FUNNEL_HOURS + '\n\n';
    text += '```\n';
    text += `Время | start | request | paywall | generated\n`;
    text += `------|-------|---------|---------|-----------\n`;
    
    stats.forEach(s => {
      if (s.start_bot || s.song_requested || s.paywll_open || s.paywall_open || s.song_generated) {
        const start = pad(s.start_bot || 0);
        const req = pad(s.song_requested || 0);
        const pw = pad((s.paywll_open || 0) + (s.paywall_open || 0));
        const gen = pad(s.song_generated || 0);
        text += `${s.hour} | ${start} | ${req} | ${pw} | ${gen}\n`;
      }
    });
    text += '```';
    
    return ctx.replyWithMarkdown(text, {
      reply_markup: Markup.keyboard(KEYBOARDS.stats).resize().reply_markup
    });
  });

  bot.hears('🚧 Paywall', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const stats = await getPaywallByHours();
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    
    const text = '📊 Paywall по часам (МСК):\n\n' +
      stats.map(s => `${s.hour}: ${s.count}`).join('\n') +
      `\n\n📊 Итого: ${total}`;
    
    return ctx.reply(text, {
      reply_markup: Markup.keyboard(KEYBOARDS.stats).resize().reply_markup
    });
  });

  bot.hears('⏰ По часам', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const stats = await getFunnelByHours();
    
    let text = MESSAGES.FUNNEL_HOURS + ` (${today}):\n\n`;
    text += '```\n';
    text += `Время | start | request | paywall | generated\n`;
    text += `------|-------|---------|---------|-----------\n`;
    
    stats.forEach(s => {
      if (s.start_bot || s.song_requested || s.paywll_open || s.paywall_open || s.song_generated) {
        const start = pad(s.start_bot || 0);
        const req = pad(s.song_requested || 0);
        const pw = pad((s.paywll_open || 0) + (s.paywall_open || 0));
        const gen = pad(s.song_generated || 0);
        text += `${s.hour} | ${start} | ${req} | ${pw} | ${gen}\n`;
      }
    });
    text += '```';
    
    return ctx.replyWithMarkdown(text, {
      reply_markup: Markup.keyboard(KEYBOARDS.funnel).resize().reply_markup
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

  bot.hears('📢 Рассылка', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    return ctx.reply(MESSAGES.BROADCAST_INSTRUCTIONS, {
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

  bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      broadcastState.set(ctx.from.id, { awaitingBroadcastToAll: true });
      
      return ctx.reply('Отправь сообщение для рассылки всем пользователям.\n\nОтмена: /broadcast_cancel', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Отмена', 'broadcast_cancel')]
        ])
      });
    }
    
    const targetUserId = Number(args[0]);
    if (isNaN(targetUserId)) {
      return ctx.reply('Неверный формат');
    }
    
    broadcastState.set(ctx.from.id, { awaitingBroadcast: targetUserId });
    
    return ctx.reply(`Введите сообщение для пользователя ${targetUserId}:\n\nОтмена: /broadcast_cancel`);
  });

  bot.command('broadcast_cancel', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    broadcastState.delete(ctx.from.id);
    
    return ctx.reply('Рассылка отменена');
  });

  bot.on('text', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    
    const state = broadcastState.get(ctx.from.id);
    if (!state) return;
    
    broadcastState.delete(ctx.from.id);
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🎁 Воспользоваться скидкой', 'discount')]
    ]);
    
    const messageOptions = {
      reply_markup: keyboard.reply_markup
    };
    
    if (ctx.message.entities && ctx.message.entities.length > 0) {
      messageOptions.entities = ctx.message.entities;
    }
    
    if (state.awaitingBroadcastToAll) {
      const users = await User.find({});
      let successCount = 0;
      let failCount = 0;
      
      for (const user of users) {
        try {
          await userBot.telegram.sendMessage(user.telegram_id, ctx.message.text, messageOptions);
          successCount++;
        } catch (e) {
          failCount++;
        }
      }
      
      return ctx.reply(MESSAGES.BROADCAST_RESULT(successCount, failCount, users.length));
    }
    
    if (state.awaitingBroadcast) {
      try {
        await userBot.telegram.sendMessage(state.awaitingBroadcast, ctx.message.text, messageOptions);
        return ctx.reply(MESSAGES.BROADCAST_RESULT(1, 0, 1));
      } catch (e) {
        return ctx.reply(MESSAGES.BROADCAST_RESULT(0, 1, 1));
      }
    }
  });

  bot.action('broadcast_cancel', async (ctx) => {
    await ctx.answerCbQuery('Отменено');
    broadcastState.delete(ctx.from.id);
    return ctx.editMessageText('Рассылка отменена');
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

  bot.command('paywall', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const stats = await getPaywallByHours();
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    
    const text = '📊 Paywall по часам (МСК):\n\n' +
      stats.map(s => `${s.hour}: ${s.count}`).join('\n') +
      `\n\n📊 Итого: ${total}`;
    
    return ctx.reply(text);
  });

  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply(MESSAGES.NO_ACCESS);
    }
    
    const { eventNames, data } = await getAllEventsByHours();
    
    let text = '📊 События по часам (МСК):\n\n```\n';
    text += 'Час    | ' + eventNames.map(n => n.padEnd(15)).join(' | ') + '\n';
    text += '--------|' + eventNames.map(() => '-'.repeat(16)).join('-+-') + '\n';
    
    data.forEach(row => {
      text += row.hour + ' | ' + eventNames.map(n => String(row[n] || 0).padEnd(15)).join(' | ') + '\n';
    });
    
    const totals = {};
    eventNames.forEach(n => {
      totals[n] = data.reduce((sum, row) => sum + (row[n] || 0), 0);
    });
    
    text += '--------|' + eventNames.map(() => '-'.repeat(16)).join('-+-') + '\n';
    text += 'Итого  | ' + eventNames.map(n => String(totals[n]).padEnd(15)).join(' | ') + '\n';
    text += '```';
    
    return ctx.replyWithMarkdown(text);
  });
};
