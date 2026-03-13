import config from '../config/index.js';

export const isAdmin = (userId) => {
  console.log('Checking admin:', userId, 'adminIds:', config.adminIds);
  return config.adminIds.includes(userId);
};

export const adminMiddleware = async (ctx, next) => {
  if (isAdmin(ctx.from?.id)) {
    return next();
  }
  return ctx.reply('У вас нет доступа к этой команде');
};
