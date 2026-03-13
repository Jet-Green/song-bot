import express from 'express';
import Song from '../models/Song.js';
import User from '../models/User.js';
import { logEvent, EVENTS } from '../services/creditService.js';
import { bot } from '../bot/index.js';

const app = express();
app.use(express.json());

const sunoWebhook = async (req, res) => {
  try {
    const { code, msg, data } = req.body;
    
    if (code !== 200) {
      console.error('Suno error:', msg);
      return res.status(200).json({ code: 200, msg: 'error received' });
    }

    const { callbackType, task_id, data: songs } = data;
    
    if (callbackType === 'complete') {
      for (const songData of songs) {
        const song = await Song.findOne({ provider_song_id: task_id });
        
        if (song) {
          const user = await User.findById(song.user_id);
          
          if (songData.audio_url) {
            await Song.findByIdAndUpdate(song._id, {
              status: 'done',
              audio_url: songData.audio_url,
              lyrics: songData.prompt,
              duration_sec: songData.duration,
              finished_at: new Date()
            });
            
            if (user) {
              await bot.telegram.sendMessage(
                user.telegram_id,
                `✅ Ваша песня готова!\n\n🎵 ${song.prompt}\n\n🔊 Слушать: ${songData.audio_url}`
              );
              
              await logEvent(user.telegram_id, EVENTS.SONG_GENERATED);
            }
          } else {
            await Song.findByIdAndUpdate(song._id, {
              status: 'error',
              finished_at: new Date()
            });
            
            if (user) {
              await bot.telegram.sendMessage(
                user.telegram_id,
                '❌ Не удалось сгенерировать песню. Кредит возвращен на баланс.'
              );
              
              user.credits += 1;
              await user.save();
              
              await logEvent(user.telegram_id, EVENTS.SONG_FAILED);
            }
          }
        }
      }
    }
    
    return res.status(200).json({ code: 200, msg: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ code: 500, msg: 'internal error' });
  }
};

app.post('/webhook/telegram', async (req, res) => {
  console.log('Telegram webhook received:', req.body.message?.text || req.body.callback_query?.data || 'unknown');
  try {
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error('handleUpdate error:', error);
    res.status(500).send('Error');
  }
});

app.post('/webhook/suno', sunoWebhook);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export { app, sunoWebhook };
