const config = require('../config');

const isAdmin = (userId) => {
  return config.adminIds.includes(userId);
};

const adminMiddleware = (ctx, next) => {
  if (isAdmin(ctx.from.id)) {
    return next();
  }
  return ctx.reply('У вас нет доступа к этой команде');
};

module.exports = { isAdmin, adminMiddleware };
