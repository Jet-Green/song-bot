import express from 'express';
import Song from '../models/Song.js';
import User from '../models/User.js';
import { logEvent, EVENTS } from '../services/creditService.js';
import { bot } from '../bot/index.js';
import config from '../config/index.js';

const app = express();
app.use(express.json());

const sunoWebhook = async (req, res) => {
  console.log('=== Suno Callback Received ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { code, msg, data } = req.body;
    
    if (!data) {
      console.log('No data in callback');
      return res.status(200).json({ code: 200, msg: 'no data' });
    }
    
    const { callbackType, task_id, data: songs } = data;
    
    console.log('CallbackType:', callbackType, 'TaskID:', task_id);
    
    if (callbackType === 'error' || code !== 200) {
      const song = await Song.findOne({ provider_song_id: task_id });
      if (song && song.status !== 'error') {
        const user = await User.findById(song.user_id);
        
        await Song.findByIdAndUpdate(song._id, {
          status: 'error',
          finished_at: new Date()
        });
        
        if (user) {
          await bot.telegram.sendMessage(
            user.telegram_id,
            `❌ Не удалось сгенерировать песню: ${msg}\n\nКредит возвращен на баланс.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Попробовать снова', callback_data: `retry_${song._id}` }]
                ]
              }
            }
          );
          
          user.credits += 1;
          await user.save();
          
          await logEvent(user.telegram_id, EVENTS.SONG_FAILED);
        }
      }
      
      return res.status(200).json({ code: 200, msg: 'error processed' });
    }
    
    if (callbackType === 'complete' && songs && songs.length > 0) {
      const song = await Song.findOne({ provider_song_id: task_id });
      
      if (!song) {
        console.log('Song not found in DB for task_id:', task_id);
        return res.status(200).json({ code: 200, msg: 'song not found' });
      }
      
      if (song.status === 'done') {
        console.log('Song already processed, skipping');
        return res.status(200).json({ code: 200, msg: 'already processed' });
      }
      
      const user = await User.findById(song.user_id);
      const songData = songs[0];
      
      console.log('Processing song, audio_url:', songData?.audio_url);
      
      if (songData?.audio_url) {
        await Song.findByIdAndUpdate(song._id, {
          status: 'done',
          audio_url: songData.audio_url,
          lyrics: songData.prompt,
          duration_sec: songData.duration,
          finished_at: new Date()
        });
        
        let message = `✅ Ваша песня готова!\n\n`;
        
        if (songData.title) {
          message += `🎤 *${songData.title}*\n\n`;
        }
        
        message += `🎵 ${song.prompt}\n\n`;
        
        if (songData.prompt && !songData.prompt.startsWith('[')) {
          message += `📝 *Текст песни:*\n${songData.prompt}\n\n`;
        }
        
        message += `🔊 Слушать: ${songData.audio_url}`;
        
        if (user) {
          await bot.telegram.sendMessage(
            user.telegram_id,
            message,
            { parse_mode: 'Markdown' }
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
            `❌ Не удалось сгенерировать песню: ${msg}\n\nКредит возвращен на баланс.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Попробовать снова', callback_data: `retry_${song._id}` }]
                ]
              }
            }
          );
          
          user.credits += 1;
          await user.save();
          
          await logEvent(user.telegram_id, EVENTS.SONG_FAILED);
        }
      }
    } else if (callbackType === 'first') {
      console.log('First track ready, waiting for complete...');
      
      const song = await Song.findOne({ provider_song_id: task_id });
      if (!song) {
        return res.status(200).json({ code: 200, msg: 'song not found' });
      }
      
      const user = await User.findById(song.user_id);
      const songData = songs?.[0];
      
      if (user && songData?.audio_url) {
        await Song.findByIdAndUpdate(song._id, {
          status: 'processing',
          audio_url: songData.audio_url,
          duration_sec: songData.duration,
          finished_at: new Date()
        });
        
        let message = `🎵 *Первая версия песни готова!*\n\n`;
        
        if (songData.title) {
          message += `🎤 *${songData.title}*\n\n`;
        }
        
        if (songData.prompt) {
          message += `🎵 ${songData.prompt}\n\n`;
        }
        
        message += `🔊 Слушать: ${songData.audio_url}\n\n`;
        message += `_Ожидаем финальную версию..._`;
        
        await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
      }
    } else if (callbackType === 'text') {
      console.log('Text generation complete, waiting for audio...');
    } else {
      console.log('Unknown callbackType:', callbackType);
    }
    
    return res.status(200).json({ code: 200, msg: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ code: 500, msg: 'internal error' });
  }
};

app.post('/webhook/suno', sunoWebhook);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on port ${config.port}`);
});

export { app, sunoWebhook };
