import { findOrCreateUser, getUserBalance, deductCredit, logEvent, EVENTS } from '../services/creditService.js';
import { generatePaymentLink, CREDIT_PACKAGES } from '../services/robokassaService.js';
import { generateMusic } from '../services/sunoService.js';
import { songWizard, STEPS, STYLES } from '../services/songWizard.js';
import Song from '../models/Song.js';
import User from '../models/User.js';

const getBuyCreditsKeyboard = () => {
  const packages = Object.values(CREDIT_PACKAGES);
  return {
    inline_keyboard: packages.map(pkg => [
      { text: `💎 ${pkg.name} - ${pkg.price}₽`, callback_data: `buy_credits_${pkg.credits}` }
    ])
  };
};

const sendNoCreditsMessage = async (ctx, message = '❌ Недостаточно кредитов. Купите кредиты для генерации.') => {
  await logEvent(ctx.from.id, EVENTS.PAYWALL_OPEN);
  return ctx.reply(message, { reply_markup: getBuyCreditsKeyboard() });
};

const createSong = async (ctx, prompt, mainKeyboard) => {
  const userId = ctx.from.id;

  const balance = await getUserBalance(userId);
  if (!balance || balance.total < 1) {
    return sendNoCreditsMessage(ctx);
  }

  const deductResult = await deductCredit(userId);
  if (!deductResult.success) {
    return ctx.reply('Ошибка при списании кредитов');
  }

  const newBalance = await getUserBalance(userId);
  if (newBalance && newBalance.total === 0) {
    await ctx.reply('⚠️ *Внимание!*\n\nВаши токены закончились. Приобретите кредиты для продолжения.', { parse_mode: 'Markdown', reply_markup: getBuyCreditsKeyboard() });
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

  const result = await generateMusic(song._id, { prompt });

  if (!result.success) {
    user.credits += 1;
    await user.save();
    return ctx.reply(`❌ Ошибка генерации: ${result.error}`, mainKeyboard);
  }

  return ctx.reply('🎵 Ваша песня поставлена в очередь на генерацию!\n⏳ Обычно это занимает 1-2 минуты.', mainKeyboard);
};

const processWizardStep = async (ctx, userId, mainKeyboard) => {
  const session = songWizard.getSession(userId);
  if (!session) return false;

  const user = await User.findOne({ telegram_id: userId });
  const balance = await getUserBalance(userId);

  if (!balance || balance.total < 1) {
    songWizard.clearSession(userId);
    return sendNoCreditsMessage(ctx, '❌ Недостаточно кредитов. Сессия отменена.');
  }

  const { step, mode, instrumental, style, title, prompt, model } = session;

  if (step === STEPS.LYRICS && !ctx.callbackQuery) {
    session.prompt = ctx.message.text;
    
    const user = await User.findOne({ telegram_id: userId });
    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    await deductCredit(userId);
    
    const newBalance = await getUserBalance(userId);
    if (newBalance && newBalance.total === 0) {
      await ctx.reply('⚠️ *Внимание!*\n\nВаши токены закончились. Приобретите кредиты для продолжения.', { parse_mode: 'Markdown', reply_markup: getBuyCreditsKeyboard() });
    }
    
    const song = await Song.create({
      user_id: user._id,
      prompt: session.prompt,
      style: session.style,
      title: session.title,
      status: 'pending'
    });
    
    await logEvent(userId, EVENTS.SONG_REQUESTED, 1, { song_id: song._id.toString() });
    
    const params = {
      prompt: session.prompt,
      customMode: session.mode === 'custom',
      instrumental: session.instrumental,
      model: session.model,
      style: session.style,
      title: session.title
    };
    
    console.log('Generating music with params:', params);
    
    const result = await generateMusic(song._id, params);
    
    songWizard.clearSession(userId);
    
    if (!result.success) {
      user.credits += 1;
      await user.save();
      return ctx.reply(`❌ Ошибка генерации: ${result.error}`, mainKeyboard);
    }
    
    return ctx.reply('🎵 Ваша песня поставлена в очередь на генерацию!\n⏳ Обычно это занимает 1-2 минуты.', mainKeyboard);
  }

  if (step === STEPS.TITLE && !ctx.callbackQuery) {
    session.title = ctx.message.text;
    session.step = STEPS.LYRICS;
    songWizard.setSession(userId, session);

    const keyboard = songWizard.getKeyboardForStep(userId);
    return ctx.reply(keyboard.text, { parse_mode: 'Markdown', ...songWizard.buildInlineKeyboard(keyboard.keyboard) });
  }

  if (step === STEPS.MODEL && ctx.callbackQuery) {
    const modelId = ctx.callbackQuery.data.replace('wizard_model_', '');
    session.model = modelId;

    await deductCredit(userId);

    const newBalance = await getUserBalance(userId);
    if (newBalance && newBalance.total === 0) {
      await ctx.reply('⚠️ *Внимание!*\n\nВаши токены закончились. Приобретите кредиты для продолжения.', { parse_mode: 'Markdown', reply_markup: getBuyCreditsKeyboard() });
    }

    const song = await Song.create({
      user_id: user._id,
      prompt: session.prompt,
      style: session.style,
      title: session.title,
      status: 'pending'
    });

    await logEvent(userId, EVENTS.SONG_REQUESTED, 1, { song_id: song._id.toString() });

    const params = {
      prompt: session.prompt,
      customMode: session.mode === 'custom',
      instrumental: session.instrumental,
      model: session.model,
      style: session.style,
      title: session.title
    };

    const result = await generateMusic(song._id, params);

    songWizard.clearSession(userId);

    if (!result.success) {
      user.credits += 1;
      await user.save();
      return ctx.reply(`❌ Ошибка генерации: ${result.error}`, mainKeyboard);
    }

    return ctx.reply('🎵 Ваша песня поставлена в очередь на генерацию!\n⏳ Обычно это занимает 1-2 минуты.', mainKeyboard);
  }

  return false;
};

export const setupUserCommands = (bot, mainKeyboard) => {
  bot.command('start', async (ctx) => {
    const { id, username, first_name, last_name } = ctx.from;
    
    let referralSource = null;
    if (ctx.message && ctx.message.text) {
      const parts = ctx.message.text.split(' ');
      if (parts.length > 1) {
        referralSource = parts[1];
      }
    }
    
    const { user, isNewUser } = await findOrCreateUser(id, username, first_name, last_name, referralSource);

    let bonusMessage = '';
    if (isNewUser) {
      bonusMessage = `\n\n🎁 *Вы получили 2 бонусных токена!*\n\n` +
        `У вас есть *7 дней*, чтобы использовать их.\n` +
        `Один токен = 1 песня.\n\n` +
        `Спешите, время ограничено! ⏰`;
    }

    const welcomeText = `🎤 *Добро пожаловать в AI Song Bot!*\n\n` +
      `Я могу написать и спеть для вас песню на любую тему.\n\n` +
      `Выберите действие из меню ниже или просто напишите текст для генерации.\n\n` +
      `*Стоимость генерации: 1 кредит*${bonusMessage}`;

    return ctx.replyWithMarkdown(welcomeText, mainKeyboard);
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
    songWizard.startSession(ctx.from.id, 'simple');
    const keyboard = songWizard.getKeyboardForStep(ctx.from.id);
    return ctx.reply(keyboard.text, { parse_mode: 'Markdown', ...songWizard.buildInlineKeyboard(keyboard.keyboard) });
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
    
    const packages = Object.values(CREDIT_PACKAGES);
    
    const keyboard = {
      inline_keyboard: packages.map(pkg => [
        { text: `💎 ${pkg.name} - ${pkg.price}₽`, callback_data: `buy_credits_${pkg.credits}` }
      ])
    };
    
    return ctx.reply(
      '💎 *Покупка кредитов:*\n\n' +
      'Выберите пакет для оплаты:',
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  });

  bot.hears('📄 Документы', async (ctx) => {
    return ctx.reply(
      '📋 *Документы сервиса «AI Песни»*\n\n' +
      'Пожалуйста, ознакомьтесь с официальными документами сервиса:\n\n' +
      '• [Публичная оферта](https://matroxxx.github.io/song-firetechno-bot/offer.html)\n\n' +
      '• [Политика конфиденциальности](https://matroxxx.github.io/song-firetechno-bot/privacy.html)\n\n' +
      '• [Информация о сервисе](https://matroxxx.github.io/song-firetechno-bot/index.html)\n\n' +
      'Оплачивая подписку и используя бот, вы подтверждаете согласие с условиями публичной оферты и политикой обработки персональных данных.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.on('callback_query', async (ctx) => {
    const query = ctx.callbackQuery;
    const data = query.data;
    
    if (data.startsWith('buy_credits_')) {
      const creditsAmount = parseInt(data.replace('buy_credits_', ''));
      const userId = ctx.from.id;
      
      await ctx.answerCbQuery('Подготовка платежа...');
      
      try {
        const payment = await generatePaymentLink(userId, creditsAmount);
        
        const successKeyboard = {
          inline_keyboard: [
            [{ text: '💳 Оплатить', url: payment.url }],
            [{ text: '🔄 Проверить оплату', callback_data: `check_payment_${payment.invId}` }]
          ]
        };
        
        await ctx.editMessageText(
          `💎 *Покупка ${CREDIT_PACKAGES[creditsAmount].name}*\n\n` +
          `💰 Сумма: *${payment.price}₽*\n\n` +
          `Нажмите кнопку ниже для оплаты:`,
          { 
            parse_mode: 'Markdown',
            reply_markup: successKeyboard
          }
        );
      } catch (error) {
        console.error('Payment error:', error);
        await ctx.answerCbQuery('Ошибка при создании платежа');
      }
      
      return;
    }
    
    if (data.startsWith('check_payment_')) {
      await ctx.answerCbQuery('Проверка статуса...');
      return;
    }

    const userId = ctx.from.id;
    const session = songWizard.getSession(userId);
    if (!session) {
      return ctx.answerCbQuery();
    }

    if (data === 'wizard_cancel') {
      songWizard.clearSession(userId);
      return ctx.editMessageText('❌ Сессия отменена.');
    }

    if (data.startsWith('wizard_mode_')) {
      const mode = data.replace('wizard_mode_', '');
      session.mode = mode;
      session.step = mode === 'simple' ? STEPS.LYRICS : STEPS.INSTRUMENTAL;
      songWizard.setSession(userId, session);

      const keyboard = songWizard.getKeyboardForStep(userId);
      return ctx.editMessageText(keyboard.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard.keyboard } });
    }

    if (data.startsWith('wizard_instrumental_')) {
      const instrumental = data.replace('wizard_instrumental_', '') === 'true';
      session.instrumental = instrumental;
      session.step = STEPS.STYLE;
      songWizard.setSession(userId, session);

      const keyboard = songWizard.getKeyboardForStep(userId);
      return ctx.editMessageText(keyboard.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard.keyboard } });
    }

    if (data.startsWith('wizard_style_')) {
      if (data === 'wizard_style_more') {
        return ctx.answerCbQuery();
      }
      const style = data.replace('wizard_style_', '');
      session.style = style;
      session.step = STEPS.TITLE;
      songWizard.setSession(userId, session);

      const keyboard = songWizard.getKeyboardForStep(userId);
      return ctx.editMessageText(keyboard.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard.keyboard } });
    }

    if (data.startsWith('retry_')) {
      const songId = data.replace('retry_', '');
      
      try {
        await ctx.answerCbQuery('Пробуем снова...');
        
        const song = await Song.findById(songId);
        if (!song) {
          return ctx.editMessageText('Песня не найдена');
        }
        
        const user = await User.findOne({ telegram_id: userId });
        if (!user) {
          return ctx.editMessageText('Пользователь не найден');
        }
        
        const balance = await getUserBalance(userId);
        if (!balance || balance.total < 1) {
          return ctx.editMessageText('❌ Недостаточно кредитов для повторной генерации.');
        }
        
        await deductCredit(userId);
        
        const params = {
          prompt: song.prompt,
          customMode: !!song.style,
          instrumental: song.instrumental || false,
          model: 'V4',
          style: song.style || '',
          title: song.title || ''
        };
        
        console.log('Retrying song with params:', params);
        
        const result = await generateMusic(song._id, params);
        
        if (!result.success) {
          user.credits += 1;
          await user.save();
          return ctx.editMessageText(`❌ Ошибка генерации: ${result.error}`);
        }
        
        return ctx.editMessageText('🎵 Песня поставлена в очередь на генерацию повторно!\n⏳ Обычно это занимает 1-2 минуты.');
      } catch (error) {
        console.error('Retry error:', error);
        return ctx.editMessageText(`❌ Ошибка: ${error.message}`);
      }
    }

    ctx.answerCbQuery();
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    if (ctx.message.text.includes('Сгенерировать') || ctx.message.text.includes('Баланс') ||
      ctx.message.text.includes('Мои песни') || ctx.message.text.includes('Купить')) return;

    const processed = await processWizardStep(ctx, ctx.from.id, mainKeyboard);
    if (processed) return;

    return createSong(ctx, ctx.message.text, mainKeyboard);
  });
};
