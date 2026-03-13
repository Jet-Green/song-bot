const SONG_WIZARD = 'song_wizard_';

export const STEPS = {
  MODE: 'mode',
  INSTRUMENTAL: 'instrumental',
  STYLE: 'style',
  TITLE: 'title',
  LYRICS: 'lyrics',
  MODEL: 'model'
};

export const STYLES = [
  'Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Hip-hop', 
  'R&B', 'Country', 'Metal', 'Folk', 'Blues', 'Reggae',
  'Ambient', 'Lo-fi', 'EDM', 'Acoustic'
];

export const MODELS = [
  { id: 'V4', name: 'V4' }
];

class SongWizard {
  constructor() {
    this.sessions = new Map();
  }

  getSession(userId) {
    const key = SONG_WIZARD + userId;
    return this.sessions.get(key);
  }

  setSession(userId, data) {
    const key = SONG_WIZARD + userId;
    this.sessions.set(key, data);
  }

  clearSession(userId) {
    const key = SONG_WIZARD + userId;
    this.sessions.delete(key);
  }

  startSession(userId, mode) {
    this.setSession(userId, {
      step: STEPS.INSTRUMENTAL,
      mode,
      instrumental: false,
      style: '',
      title: '',
      prompt: '',
      model: 'V4'
    });
  }

  getKeyboardForStep(userId) {
    const session = this.getSession(userId);
    
    switch (session.step) {
      case STEPS.MODE:
        return {
          text: '🎵 *Создание песни*\n\nВыберите режим:',
          keyboard: [
            [{ text: '⚡ Быстрый (текст → песня)', callback_data: 'wizard_mode_simple' }],
            [{ text: '🎛 Расширенный (полная настройка)', callback_data: 'wizard_mode_custom' }]
          ]
        };

      case STEPS.INSTRUMENTAL:
        return {
          text: '🎵 *Настройка песни*\n\nХотите инструментал (без вокала)?',
          keyboard: [
            [{ text: '🎤 С вокалом', callback_data: 'wizard_instrumental_false' }],
            [{ text: '🎹 Инструментал', callback_data: 'wizard_instrumental_true' }]
          ]
        };

      case STEPS.STYLE:
        const styleButtons = STYLES.slice(0, 8).map(s => [{ text: s, callback_data: `wizard_style_${s}` }]);
        const moreButton = STYLES.length > 8 ? [[{ text: 'Дальше →', callback_data: 'wizard_style_more' }]] : [];
        return {
          text: '🎵 *Выберите стиль музыки:*',
          keyboard: [...styleButtons, ...moreButton]
        };

      case STEPS.TITLE:
        return {
          text: '🎵 *Введите название песни:*',
          keyboard: [[{ text: 'Отмена', callback_data: 'wizard_cancel' }]]
        };

      case STEPS.LYRICS:
        const isInstrumental = session.instrumental;
        return {
          text: isInstrumental 
            ? '🎵 *Введите описание инструментала:*\n\nНапример: "спокойная фортепианная мелодия с мягкими звуками природы"'
            : '🎵 *Введите текст песни или описание:*\n\nЕсли хотите, чтобы AI написал текст - просто опишите тему.\nЕсли хотите свой текст - напишите его.',
          keyboard: [[{ text: 'Отмена', callback_data: 'wizard_cancel' }]]
        };

      default:
        return null;
    }
  }

  async nextStep(userId, ctx) {
    const session = this.getSession(userId);
    if (!session) return null;

    const keyboard = this.getKeyboardForStep(userId);
    
    if (session.step === STEPS.MODE) {
      return ctx.reply(keyboard.text, { parse_mode: 'Markdown', ...this.buildInlineKeyboard(keyboard.keyboard) });
    }

    return ctx.reply(keyboard.text, { parse_mode: 'Markdown', ...this.buildInlineKeyboard(keyboard.keyboard) });
  }

  buildInlineKeyboard(buttons) {
    return {
      reply_markup: {
        inline_keyboard: buttons
      }
    };
  }
}

export const songWizard = new SongWizard();
