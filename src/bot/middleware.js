import config from '../config/index.js';

export const isAdmin = (userId) => {
  const result = config.adminIds.includes(userId);
  console.log('isAdmin check:', userId, 'adminIds:', config.adminIds, 'result:', result);
  return result;
};

export const adminMiddleware = async (ctx, next) => {
  if (isAdmin(ctx.from?.id)) {
    return next();
  }
  return ctx.reply('У вас нет доступа к этой команде');
};
