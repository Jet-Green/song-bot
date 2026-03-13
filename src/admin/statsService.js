import Event from '../models/Event.js';
import User from '../models/User.js';
import Song from '../models/Song.js';
import Payment from '../models/Payment.js';

export const EVENTS = {
  START_BOT: 'start_bot',
  SONG_REQUESTED: 'song_requested',
  SONG_GENERATED: 'song_generated',
  SONG_FAILED: 'song_failed',
  PAYWALL_OPEN: 'paywall_open',
  PAYMENT_SUCCESS: 'payment_success',
  CREDITS_GRANTED: 'credits_granted'
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getWeeklyStats = async (weeks = 13) => {
  const now = new Date();
  const stats = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = getWeekStart(now);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const count = await Event.countDocuments({
      event_name: EVENTS.SONG_REQUESTED,
      event_time: { $gte: weekStart, $lt: weekEnd }
    });
    
    const dateStr = weekStart.toISOString().split('T')[0];
    stats.push({ week: dateStr, count });
  }
  
  return stats;
};

export const getDailyStats = async (days = 7) => {
  const now = new Date();
  const stats = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const count = await Event.countDocuments({
      event_name: EVENTS.SONG_REQUESTED,
      event_time: { $gte: dayStart, $lt: dayEnd }
    });
    
    const dateStr = dayStart.toISOString().split('T')[0];
    stats.push({ date: dateStr, count });
  }
  
  return stats;
};

export const getActiveUsersStats = async (days = 7) => {
  const now = new Date();
  const stats = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const activeUsers = await Event.distinct('user_id', {
      event_time: { $gte: dayStart, $lt: dayEnd }
    });
    
    const dateStr = dayStart.toISOString().split('T')[0];
    stats.push({ date: dateStr, count: activeUsers.length });
  }
  
  return stats;
};

export const getTotalStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalSongs = await Song.countDocuments();
  const totalPayments = await Payment.countDocuments({ status: 'completed' });
  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  return {
    totalUsers,
    totalSongs,
    totalPayments,
    totalRevenue: totalRevenue[0]?.total || 0
  };
};
