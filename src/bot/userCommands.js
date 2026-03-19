import { findOrCreateUser, getUserBalance, deductCredit, logEvent, EVENTS } from '../services/creditService.js';
import { generatePaymentLink, CREDIT_PACKAGES } from '../services/robokassaService.js';
import { generateMusic } from '../services/sunoService.js';
import { songWizard, STEPS, STYLES } from '../services/songWizard.js';
import Song from '../models/Song.js';
import User from '../models/User.js';
import { MESSAGES, KEYBOARDS } from './messages.js';

const sendNoCreditsMessage = async (ctx) => {
  await logEvent(ctx.from.id, EVENTS.PAYWALL_OPEN);
  return ctx.reply(MESSAGES.NO_CREDITS, { 
    parse_mode: 'Markdown', 
    reply_markup: KEYBOARDS.inviteNoCredits(CREDIT_PACKAGES) 
  });
};

const createSong = async (ctx, prompt, mainKeyboard) => {
  const userId = ctx.from.id;

  const balance = await getUserBalance(userId);
  if (!balance || balance.total < 1) {
    return sendNoCreditsMessage(ctx);
  }

  const deductResult = await deductCredit(userId);
  if (!deductResult.success) {
    return ctx.reply(MESSAGES.ERROR_DEDUCT);
  }

  const user = await User.findOne({ telegram_id: userId });
  if (!user) {
    return ctx.reply(MESSAGES.USER_NOT_FOUND);
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
    return ctx.reply(MESSAGES.ERROR_GENERATION(result.error), mainKeyboard);
  }

  return ctx.reply(MESSAGES.QUEUE, mainKeyboard);
};

const processWizardStep = async (ctx, userId, mainKeyboard) => {
  const session = songWizard.getSession(userId);
  if (!session) return false;

  const user = await User.findOne({ telegram_id: userId });
  const balance = await getUserBalance(userId);

  if (!balance || balance.total < 1) {
    songWizard.clearSession(userId);
    return sendNoCreditsMessage(ctx);
  }

  const { step, mode, instrumental, style, title, prompt, model } = session;

  if (step === STEPS.LYRICS && !ctx.callbackQuery) {
    session.prompt = ctx.message.text;

    const balance = await getUserBalance(userId);
    if (!balance || balance.total < 1) {
      songWizard.clearSession(userId);
      return sendNoCreditsMessage(ctx);
    }

    const user = await User.findOne({ telegram_id: userId });
    if (!user) {
      return ctx.reply(MESSAGES.USER_NOT_FOUND);
    }

    await deductCredit(userId);
    
    await ctx.reply(MESSAGES.GENERATING, mainKeyboard);
    
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
      return ctx.reply(MESSAGES.ERROR_GENERATION(result.error), mainKeyboard);
    }
    
    return ctx.reply(MESSAGES.QUEUE, mainKeyboard);
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

    await ctx.reply(MESSAGES.GENERATING, mainKeyboard);

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
      return ctx.reply(MESSAGES.ERROR_GENERATION(result.error), mainKeyboard);
    }

    return ctx.reply(MESSAGES.QUEUE, mainKeyboard);
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

    const welcomeText = isNewUser 
      ? MESSAGES.WELCOME_NEW_USER(MESSAGES.NEW_USER_BONUS)
      : MESSAGES.WELCOME;

    return ctx.replyWithMarkdown(welcomeText, mainKeyboard);
  });

  bot.command('balance', async (ctx) => {
    const balance = await getUserBalance(ctx.from.id);
    if (!balance) {
      return ctx.reply(MESSAGES.USER_NOT_FOUND);
    }

    return ctx.reply(MESSAGES.BALANCE(balance.credits, balance.bonus_credits, balance.total), mainKeyboard);
  });

  bot.hears('💰 Мой баланс', async (ctx) => {
    const balance = await getUserBalance(ctx.from.id);
    if (!balance) {
      return ctx.reply(MESSAGES.USER_NOT_FOUND);
    }

    return ctx.reply(MESSAGES.BALANCE(balance.credits, balance.bonus_credits, balance.total));
  });

  bot.hears('🎵 Сгенерировать песню', async (ctx) => {
    songWizard.startSession(ctx.from.id, 'simple');
    const keyboard = songWizard.getKeyboardForStep(ctx.from.id);
    return ctx.reply(keyboard.text, { parse_mode: 'Markdown', ...songWizard.buildInlineKeyboard(keyboard.keyboard) });
  });

  bot.hears('📜 Мои песни', async (ctx) => {
    const user = await User.findOne({ telegram_id: ctx.from.id });
    if (!user) return ctx.reply(MESSAGES.USER_NOT_FOUND);

    const songs = await Song.find({ user_id: user._id }).sort({ created_at: -1 }).limit(5);

    if (songs.length === 0) {
      return ctx.reply(MESSAGES.NO_SONGS);
    }

    let text = MESSAGES.SONG_LIST_TITLE + '\n\n';
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
    
    return ctx.reply(MESSAGES.BUY_CREDITS, { 
      parse_mode: 'Markdown',
      reply_markup: KEYBOARDS.buyCredits(packages)
    });
  });

  bot.hears('📄 Документы', async (ctx) => {
    return ctx.reply(MESSAGES.DOCUMENTS, { parse_mode: 'Markdown' });
  });

  bot.hears('👥 Пригласить друга', async (ctx) => {
    const userId = ctx.from.id;
    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=${userId}`;
    
    return ctx.reply(MESSAGES.INVITE_FRIEND(referralLink), { parse_mode: 'Markdown' });
  });

  bot.on('callback_query', async (ctx) => {
    const query = ctx.callbackQuery;
    const data = query.data;
    
    if (data === 'invite_friend_no_credits') {
      const userId = ctx.from.id;
      const botUsername = ctx.botInfo?.username || 'avto_bit_bot';
      const referralLink = `https://t.me/${botUsername}?start=${userId}`;
      
      return ctx.reply(MESSAGES.INVITE_FRIEND(referralLink), { parse_mode: 'Markdown' });
    }
    
    if (data.startsWith('buy_credits_')) {
      const creditsAmount = parseInt(data.replace('buy_credits_', ''));
      const userId = ctx.from.id;
      
      await ctx.answerCbQuery(MESSAGES.PAYMENT_PREPARING);
      
      try {
        const payment = await generatePaymentLink(userId, creditsAmount);
        
        await ctx.editMessageText(
          MESSAGES.BUY_PACKAGE(CREDIT_PACKAGES[creditsAmount].name, payment.price),
          { 
            parse_mode: 'Markdown',
            reply_markup: KEYBOARDS.paymentSuccess(payment.url, payment.invId)
          }
        );
      } catch (error) {
        console.error('Payment error:', error);
        await ctx.answerCbQuery(MESSAGES.PAYMENT_ERROR);
      }
      
      return;
    }
    
    if (data.startsWith('check_payment_')) {
      await ctx.answerCbQuery(MESSAGES.PAYMENT_CHECKING);
      return;
    }

    const userId = ctx.from.id;
    const session = songWizard.getSession(userId);
    if (!session) {
      return ctx.answerCbQuery();
    }

    if (data === 'wizard_cancel') {
      songWizard.clearSession(userId);
      return ctx.editMessageText(MESSAGES.WIZARD_CANCEL);
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
        await ctx.answerCbQuery(MESSAGES.RETRY_ANSWER);
        
        const song = await Song.findById(songId);
        if (!song) {
          return ctx.editMessageText(MESSAGES.SONG_NOT_FOUND);
        }
        
        const user = await User.findOne({ telegram_id: userId });
        if (!user) {
          return ctx.editMessageText(MESSAGES.USER_NOT_FOUND);
        }
        
        const balance = await getUserBalance(userId);
        if (!balance || balance.total < 1) {
          return ctx.editMessageText(MESSAGES.NOT_ENOUGH_CREDITS_RETRY);
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
          return ctx.editMessageText(MESSAGES.ERROR_GENERATION(result.error));
        }
        
        return ctx.editMessageText(MESSAGES.RETRY_SUCCESS);
      } catch (error) {
        console.error('Retry error:', error);
        return ctx.editMessageText(MESSAGES.RETRY_ERROR(error.message));
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
