import Event from '../models/Event.js';
import User from '../models/User.js';
import Song from '../models/Song.js';
import Payment from '../models/Payment.js';

const MSK_OFFSET = 3 * 60 * 60 * 1000;

const toMsk = (date) => new Date(date.getTime() + MSK_OFFSET);

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

export const getRegistrationsStats = async (days = 7) => {
  const now = new Date();
  const stats = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const count = await Event.countDocuments({
      event_name: EVENTS.START_BOT,
      event_time: { $gte: dayStart, $lt: dayEnd }
    });
    
    const dateStr = dayStart.toISOString().split('T')[0];
    stats.push({ date: dateStr, count });
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

export const getHourlyStats = async (date = toMsk(new Date())) => {
  const dayStart = toMsk(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  const stats = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const hourStart = new Date(dayStart);
    hourStart.setHours(hour);
    
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hour + 1);
    
    const count = await Event.countDocuments({
      event_name: EVENTS.SONG_REQUESTED,
      event_time: { $gte: hourStart, $lt: hourEnd }
    });
    
    stats.push({ hour: `${hour.toString().padStart(2, '0')}:00`, count });
  }
  
  return stats;
};

export const getRegistrationsByHours = async (date = toMsk(new Date())) => {
  const dayStart = toMsk(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  const stats = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const hourStart = new Date(dayStart);
    hourStart.setHours(hour);
    
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hour + 1);
    
    const count = await Event.countDocuments({
      event_name: EVENTS.START_BOT,
      event_time: { $gte: hourStart, $lt: hourEnd }
    });
    
    stats.push({ hour: `${hour.toString().padStart(2, '0')}:00`, count });
  }
  
  return stats;
};

const EVENT_LIST = [
  'start_bot',
  'song_requested',
  'paywll_open',
  'paywall_open',
  'song_generated',
  'song_failed'
];

export const getFunnelByDays = async (days = 7) => {
  const now = new Date();
  const stats = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const events = await Event.aggregate([
      {
        $match: {
          event_name: { $in: EVENT_LIST },
          event_time: { $gte: dayStart, $lt: dayEnd }
        }
      },
      {
        $group: {
          _id: '$event_name',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const dayStats = { date: dayStart.toISOString().split('T')[0] };
    events.forEach(e => {
      dayStats[e._id] = e.count;
    });
    stats.push(dayStats);
  }
  
  return stats;
};

export const getFunnelByHours = async (date = new Date()) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  const stats = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const hourStart = new Date(dayStart);
    hourStart.setHours(hour);
    
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hour + 1);
    
    const events = await Event.aggregate([
      {
        $match: {
          event_name: { $in: EVENT_LIST },
          event_time: { $gte: hourStart, $lt: hourEnd }
        }
      },
      {
        $group: {
          _id: '$event_name',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const hourStats = { hour: `${hour.toString().padStart(2, '0')}:00` };
    events.forEach(e => {
      hourStats[e._id] = e.count;
    });
    stats.push(hourStats);
  }
  
  return stats;
};

export const getPaywallByHours = async () => {
  return getEventsByHours(['paywall_open', 'paywll_open']);
};

export const getEventsByHours = async (eventNames) => {
  const now = new Date();
  const mskNow = toMsk(now);
  const todayStartMsk = new Date(mskNow);
  todayStartMsk.setHours(0, 0, 0, 0);
  
  const todayStartUtc = new Date(todayStartMsk.getTime() - MSK_OFFSET);
  
  const events = await Event.aggregate([
    {
      $match: {
        event_name: { $in: eventNames },
        event_time: { $gte: todayStartUtc }
      }
    },
    {
      $group: {
        _id: {
          $hour: { date: '$event_time', timezone: '+0300' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
  
  const result = [];
  for (let h = 0; h <= mskNow.getHours(); h++) {
    const event = events.find(e => e._id === h);
    result.push({ hour: `${h.toString().padStart(2, '0')}:00`, count: event ? event.count : 0 });
  }
  
  return result;
};

export const getAllEventsByHours = async () => {
  const now = new Date();
  const mskNow = toMsk(now);
  const todayStartMsk = new Date(mskNow);
  todayStartMsk.setHours(0, 0, 0, 0);
  
  const todayStartUtc = new Date(todayStartMsk.getTime() - MSK_OFFSET);
  
  const events = await Event.aggregate([
    {
      $match: {
        event_time: { $gte: todayStartUtc }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: { date: '$event_time', timezone: '+0300' } },
          event: '$event_name'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.hour': 1 }
    }
  ]);
  
  const eventNames = [...new Set(events.map(e => e._id.event))];
  const result = [];
  
  for (let h = 0; h <= mskNow.getHours(); h++) {
    const row = { hour: `${h.toString().padStart(2, '0')}:00` };
    eventNames.forEach(name => {
      const event = events.find(e => e._id.hour === h && e._id.event === name);
      row[name] = event ? event.count : 0;
    });
    result.push(row);
  }
  
  return { eventNames, data: result };
};
