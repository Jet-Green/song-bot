import { isAdmin } from './middleware.js';
import Song from '../models/Song.js';
import User from '../models/User.js';
import { getMusicDetails } from '../services/sunoService.js';

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

  bot.command('songstatus', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('У вас нет доступа к этой команде');
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
