import { setupUserCommands } from './userCommands.js';
import { setupAdminCommands } from './adminCommands.js';

export const setupCommands = (bot, mainKeyboard) => {
  setupAdminCommands(bot);
  setupUserCommands(bot, mainKeyboard);
};
