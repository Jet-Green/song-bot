export const MESSAGES = {
  WELCOME: `🎤 *Добро пожаловать в Авто Бит Бот!*

Я могу написать и спеть для вас песню на любую тему.

Выберите действие из меню ниже или просто напишите текст для генерации.

*Стоимость генерации: 1 кредит*`,

  WELCOME_NEW_USER: (bonusMessage) => `🎤 *Добро пожаловать в Авто Бит Бот!*

Я могу написать и спеть для вас песню на любую тему.

Выберите действие из меню ниже или просто напишите текст для генерации.

*Стоимость генерации: 1 кредит*${bonusMessage}`,

  NEW_USER_BONUS: `

🎁 *Вы получили 2 бонусных токена!*

У вас есть *7 дней*, чтобы использовать их.
Один токен = 1 песня.

Спешите, время ограничено! ⏰`,

  NO_CREDITS: `😢 *Не хватает токенов...*

Для создания песни нужен 1 токен.
Чтобы получить 1 токен — пригласите друга!`,

  NO_CREDITS_SIMPLE: `😢 *Не хватает токенов...*

Для создания песни нужен 1 токен.
Купите токены, чтобы продолжить!`,

  BALANCE: (credits, bonusCredits, total) => `💰 Ваш баланс:

Кредиты: ${credits}
Бонусные кредиты: ${bonusCredits}

Всего: ${total}`,

  GENERATING: `✨ Создаём вашу песню... Это может занять пару минут.

💡 Вы получите уведомление, когда песня будет готова!`,

  QUEUE: `🎵 Ваша песня поставлена в очередь на генерацию!
⏳ Обычно это занимает 1-2 минуты.`,

  ERROR_DEDUCT: 'Ошибка при списании кредитов',

  ERROR_GENERATION: (error) => `❌ Ошибка генерации: ${error}`,

  USER_NOT_FOUND: 'Пользователь не найден',

  NO_SONGS: 'У вас пока нет песен',

  SONG_LIST_TITLE: '📜 *Ваши последние песни:*',

  BUY_CREDITS: '💎 *Покупка кредитов:*\n\nВыберите пакет для оплаты:',

  DOCUMENTS: `📋 *Документы сервиса «Авто Бит Бот»*

Пожалуйста, ознакомьтесь с официальными документами сервиса:

• [Публичная оферта](https://matroxxx.github.io/song-firetechno-bot/offer.html)

• [Политика конфиденциальности](https://matroxxx.github.io/song-firetechno-bot/privacy.html)

• [Информация о сервисе](https://matroxxx.github.io/song-firetechno-bot/index.html)

Оплачивая подписку и используя бот, вы подтверждаете согласие с условиями публичной оферты и политикой обработки персональных данных.`,

  INVITE_FRIEND: (referralLink) => `👥 *Пригласить друга*

Поделитесь ссылкой с друзьями:

${referralLink}

За каждого приглашённого друга вы получите *1 кредит*! 🎁

Друг получит *2 бонусных токена* при регистрации.`,

  BUY_PACKAGE: (packageName, price) => `💎 *Покупка ${packageName}*

💰 Сумма: *${price}₽*

Нажмите кнопку ниже для оплаты:`,

  PAYMENT_PREPARING: 'Подготовка платежа...',
  PAYMENT_ERROR: 'Ошибка при создании платежа',
  PAYMENT_CHECKING: 'Проверка статуса...',

  WIZARD_CANCEL: '❌ Сессия отменена.',

  NOT_ENOUGH_CREDITS_RETRY: '❌ Недостаточно кредитов для повторной генерации.',

  SONG_NOT_FOUND: 'Песня не найдена',
  RETRY_ANSWER: 'Пробуем снова...',
  RETRY_SUCCESS: '🎵 Песня поставлена в очередь на генерацию повторно!\n⏳ Обычно это занимает 1-2 минуты.',
  RETRY_ERROR: (error) => `❌ Ошибка: ${error}`
};

export const KEYBOARDS = {
  main: [
    ['🎵 Сгенерировать песню', '💰 Мой баланс'],
    ['📜 Мои песни', '💎 Купить кредиты'],
    ['📄 Документы', '👥 Пригласить друга']
  ],

  period: [
    ['📅 За неделю'],
    ['⏰ По часам'],
    ['🔙 Назад']
  ],

  back: [
    ['🔙 Назад']
  ],

  buyCredits: (packages) => ({
    inline_keyboard: packages.map(pkg => [
      { text: `💎 ${pkg.name} - ${pkg.price}₽`, callback_data: `buy_credits_${pkg.credits}` }
    ])
  }),

  paymentSuccess: (paymentUrl, invId) => ({
    inline_keyboard: [
      [{ text: '💳 Оплатить', url: paymentUrl }],
      [{ text: '🔄 Проверить оплату', callback_data: `check_payment_${invId}` }]
    ]
  }),

  inviteNoCredits: (packages) => ({
    inline_keyboard: [
      [{ text: '👥 Пригласить друга', callback_data: 'invite_friend_no_credits' }],
      ...Object.entries(packages).map(([credits, pkg]) =>
        [{ text: `💎 ${pkg.name} - ${pkg.price}₽`, callback_data: `buy_credits_${credits}` }]
      )
    ]
  })
};
