import User from '../models/User.js';
import Event from '../models/Event.js';

export const EVENTS = {
  START_BOT: 'start_bot',
  SONG_REQUESTED: 'song_requested',
  SONG_GENERATED: 'song_generated',
  SONG_FAILED: 'song_failed',
  PAYWALL_OPEN: 'paywall_open',
  PAYMENT_SUCCESS: 'payment_success',
  CREDITS_GRANTED: 'credits_granted'
};

export const findOrCreateUser = async (telegramId, username, firstName, lastName) => {
  let user = await User.findOne({ telegram_id: telegramId });
  
  if (!user) {
    user = await User.create({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      last_name: lastName
    });
    await Event.create({
      user_id: user._id,
      event_name: EVENTS.START_BOT
    });
  }
  
  return user;
};

export const getUserBalance = async (telegramId) => {
  const user = await User.findOne({ telegram_id: telegramId });
  if (!user) return null;
  return {
    credits: user.credits,
    bonus_credits: user.bonus_credits,
    total: user.credits + user.bonus_credits
  };
};

export const deductCredit = async (telegramId) => {
  const user = await User.findOne({ telegram_id: telegramId });
  if (!user) return { success: false, reason: 'user_not_found' };
  
  const total = user.credits + user.bonus_credits;
  if (total < 1) return { success: false, reason: 'insufficient_credits' };
  
  if (user.bonus_credits > 0) {
    user.bonus_credits -= 1;
  } else {
    user.credits -= 1;
  }
  
  await user.save();
  return { success: true };
};

export const addCredits = async (telegramId, amount, bonusAmount = 0) => {
  const user = await User.findOne({ telegram_id: telegramId });
  if (!user) return { success: false };
  
  if (bonusAmount > 0) {
    user.bonus_credits += bonusAmount;
  }
  user.credits += amount;
  
  await user.save();
  
  await Event.create({
    user_id: user._id,
    event_name: EVENTS.CREDITS_GRANTED,
    credits: amount + bonusAmount
  });
  
  return { success: true };
};

export const logEvent = async (telegramId, eventName, credits = 0, meta = {}) => {
  const user = await User.findOne({ telegram_id: telegramId });
  if (!user) return null;
  
  return Event.create({
    user_id: user._id,
    event_name: eventName,
    credits,
    meta
  });
};
