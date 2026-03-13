import config from '../config/index.js';

export const isAdmin = (userId) => {
  return config.adminIds.includes(userId);
};

export const adminMiddleware = async (ctx, next) => {
  if (isAdmin(ctx.from.id)) {
    return next();
  }
  return ctx.reply('У вас нет доступа к этой команде');
};
