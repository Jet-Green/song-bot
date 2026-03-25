export const MESSAGES = {
  NO_ACCESS: 'Нет доступа',

  ADMIN_PANEL: (stats) => `📊 Панель администратора:

👥 Пользователей: ${stats.totalUsers}
🎵 Песен: ${stats.totalSongs}
💳 Платежей: ${stats.totalPayments}
💰 Доход: ${stats.totalRevenue}₽`,

  SELECT_PERIOD: 'Выберите период:',

  ACTIVE_USERS_WEEK: '👥 Активные пользователи за неделю:',
  SONGS_WEEK: '🎵 Генерации песен за неделю:',

  USERS_HOURLY: '👥 Пользователи по часам за сегодня (МСК):',
  SONGS_HOURLY: '🎵 Песни по часам за сегодня (МСК):',

  FUNNEL_DAYS: '📊 Воронка по дням:',
  FUNNEL_HOURS: '📊 Воронка по часам (МСК):',

  NO_DATA: 'Нет данных',

  TOTAL_TODAY: (total) => `📊 Итого: ${total}`,

  BONUS_INSTRUCTIONS: `Введите данные в формате:
/add_bonus telegram_id количество

Например: /add_bonus 123456789 100`,

  BONUS_USAGE: '/add_bonus <telegram_id> <количество>',

  BONUS_INVALID_PARAMS: 'Некорректные параметры',
  BONUS_USER_NOT_FOUND: 'Пользователь не найден',

  BONUS_SUCCESS: (amount, telegramId, bonusCredits, credits) => `✅ Начислено ${amount} бонусных токенов пользователю ${telegramId}
Новый баланс: ${bonusCredits} бонусных, ${credits} обычных`,

  SONG_STATUS_USAGE: '/songstatus <provider_song_id>',

  SONG_NOT_FOUND_DB: 'Песня не найдена в БД',

  CHECKING_STATUS: 'Проверяю статус...',

  SONG_STATUS: (songId, prompt, status, audioUrl) => `🎵 Статус песни:

ID: ${songId}
Prompt: ${prompt}
Status в БД: ${status}
Audio URL: ${audioUrl || 'нет'}

❌ Не удалось получить статус из API`,

  SONG_STATUS_DETAIL: (data, song) => {
    let text = `🎵 *Статус песни:*

*Suno Status:* ${data.status}
*Prompt:* ${song.prompt}`;
    return text;
  },

  SONG_READY: (track) => `✅ *Готово!*
Title: ${track.title}
Audio: ${track.audioUrl}
Duration: ${track.duration} сек
Tags: ${track.tags}`,

  SONG_PROCESSING: '⏳ *В процессе...*',

  SONG_ERROR: (error) => `❌ *Ошибка:* ${error}`,

  DB_UPDATED: '_Обновлено в БД_',

  BROADCAST_INSTRUCTIONS: `📢 Рассылка сообщений:

Отправить одному пользователю:
/broadcast telegram_id сообщение

Отправить всем:
/broadcast сообщение

Кнопка "🎁 Воспользоваться скидкой" добавляется автоматически.`,

  BROADCAST_USAGE: '/broadcast [telegram_id] сообщение',

  BROADCAST_RESULT: (success, fail, total) => `📢 Рассылка завершена:

✅ Успешно: ${success}/${total}
❌ Ошибок: ${fail}`
};

export const KEYBOARDS = {
  main: [
    ['👥 Пользователи'],
    ['🎵 Песни'],
    ['📊 Воронка'],
    ['📈 Статистика'],
    ['💰 Начислить бонусы'],
    ['📢 Рассылка']
  ],

  funnel: [
    ['📅 По дням'],
    ['⏰ По часам'],
    ['🔙 Назад']
  ],

  period: [
    ['📅 За неделю'],
    ['⏰ По часам'],
    ['🔙 Назад']
  ],

  stats: [
    ['📊 Все события'],
    ['🚧 Paywall'],
    ['🔙 Назад']
  ],

  back: [
    ['🔙 Назад']
  ]
};
