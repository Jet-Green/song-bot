const { adminMiddleware } = require('./middleware');
const { findOrCreateUser, getUserBalance, deductCredit, logEvent, EVENTS } = require('../services/creditService');
const { generateMusic } = require('../services/sunoService');
const Song = require('../models/Song');
const User = require('../models/User');

const WELCOME_TEXT = `🎤 *Добро пожаловать в AI Song Bot!*

Я могу написать и спеть для вас песню на любую тему.

Выберите действие из меню ниже или просто напишите текст для генерации.

*Стоимость генерации: 1 кредит*`;

const createSong = async (ctx, prompt) => {
  const userId = ctx.from.id;
  
  const balance = await getUserBalance(userId);
  if (!balance || balance.total < 1) {
    await logEvent(userId, EVENTS.PAYWALL_OPEN);
    return ctx.reply('❌ Недостаточно кредитов. Купите кредиты для генерации.', mainKeyboard);
  }
  
  const deductResult = await deductCredit(userId);
  if (!deductResult.success) {
    return ctx.reply('Ошибка при списании кредитов');
  }
  
  const user = await User.findOne({ telegram_id: userId });
  if (!user) {
    return ctx.reply('Пользователь не найден');
  }
  
  const song = await Song.create({
    user_id: user._id,
    prompt: prompt,
    status: 'pending'
  });
  
  await logEvent(userId, EVENTS.SONG_REQUESTED, 1, { song_id: song._id.toString() });
  
  const result = await generateMusic(song._id, prompt);
  
  if (!result.success) {
    user.credits += 1;
    await user.save();
    return ctx.reply(`❌ Ошибка генерации: ${result.error}`, mainKeyboard);
  }
  
  return ctx.reply('🎵 Ваша песня поставлена в очередь на генерацию!\n⏳ Обычно это занимает 1-2 минуты.', mainKeyboard);
};

let mainKeyboard;

const setupCommands = (bot, keyboard) => {
  mainKeyboard = keyboard;
  
  bot.command('start', async (ctx) => {
    const { id, username, first_name, last_name } = ctx.from;
    
    await findOrCreateUser(id, username, first_name, last_name);
    
    return ctx.replyWithMarkdown(WELCOME_TEXT, mainKeyboard);
  });

  bot.command('balance', async (ctx) => {
    const balance = await getUserBalance(ctx.from.id);
    if (!balance) {
      return ctx.reply('Пользователь не найден');
    }
    
    return ctx.reply(
      `💰 Ваш баланс:\n\n` +
      `Кредиты: ${balance.credits}\n` +
      `Бонусные кредиты: ${balance.bonus_credits}\n\n` +
      `Всего: ${balance.total}`,
      mainKeyboard
    );
  });

  bot.hears('💰 Мой баланс', async (ctx) => {
    const balance = await getUserBalance(ctx.from.id);
    if (!balance) {
      return ctx.reply('Пользователь не найден');
    }
    
    return ctx.reply(
      `💰 Ваш баланс:\n\n` +
      `Кредиты: ${balance.credits}\n` +
      `Бонусные кредиты: ${balance.bonus_credits}\n\n` +
      `Всего: ${balance.total}`
    );
  });

  bot.hears('🎵 Сгенерировать песню', async (ctx) => {
    return ctx.reply('Введите текст или тему песни:\n\nНапример: *rap про программистов*', { parse_mode: 'Markdown' });
  });

  bot.hears('📜 Мои песни', async (ctx) => {
    const user = await User.findOne({ telegram_id: ctx.from.id });
    if (!user) return ctx.reply('Пользователь не найден');
    
    const songs = await Song.find({ user_id: user._id }).sort({ created_at: -1 }).limit(5);
    
    if (songs.length === 0) {
      return ctx.reply('У вас пока нет песен');
    }
    
    let text = '📜 *Ваши последние песни:*\n\n';
    songs.forEach((song, i) => {
      const statusEmoji = song.status === 'done' ? '✅' : song.status === 'processing' ? '⏳' : song.status === 'error' ? '❌' : '⏸';
      const audioLink = song.audio_url ? `\n🔊 ${song.audio_url}` : '';
      text += `${i + 1}. ${statusEmoji} ${song.prompt.slice(0, 30)}${song.prompt.length > 30 ? '...' : ''}${audioLink}\n\n`;
    });
    
    return ctx.replyWithMarkdown(text);
  });

  bot.hears('💎 Купить кредиты', async (ctx) => {
    await logEvent(ctx.from.id, EVENTS.PAYWALL_OPEN);
    return ctx.reply(
      '💎 *Покупка кредитов:*\n\n' +
      '1. 10 кредитов - 299₽\n' +
      '2. 30 кредитов - 799₽\n' +
      '3. 50 кредитов - 1199₽\n\n' +
      'Нажмите на нужный пакет для оплаты',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('generate', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ');
    if (!args) {
      return ctx.reply('Введите текст для генерации песни: /generate текст');
    }
    return createSong(ctx, args);
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    if (ctx.message.text.includes('Сгенерировать') || ctx.message.text.includes('Баланс') || 
        ctx.message.text.includes('Мои песни') || ctx.message.text.includes('Купить')) return;
    
    return createSong(ctx, ctx.message.text);
  });

  bot.command('admin', adminMiddleware, async (ctx) => {
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
  });

  bot.command('stats', adminMiddleware, async (ctx) => {
    const totalUsers = await User.countDocuments();
    return ctx.reply(`Всего пользователей: ${totalUsers}`);
  });
};

module.exports = { setupCommands };
