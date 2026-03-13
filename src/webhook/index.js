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
    
    console.log('Code:', code, 'Msg:', msg);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (!data) {
      console.log('No data in callback');
      return res.status(200).json({ code: 200, msg: 'no data' });
    }
    
    const { callbackType, task_id, data: songs } = data;
    
    console.log('CallbackType:', callbackType, 'TaskID:', task_id);
    
    if (callbackType === 'error' || code !== 200) {
      console.log('Error callback received:', msg);
      
      const song = await Song.findOne({ provider_song_id: task_id });
      if (song) {
        const user = await User.findById(song.user_id);
        
        await Song.findByIdAndUpdate(song._id, {
          status: 'error',
          finished_at: new Date()
        });
        
        if (user) {
          await bot.telegram.sendMessage(
            user.telegram_id,
            `❌ Не удалось сгенерировать песню: ${msg}\nКредит возвращен на баланс.`
          );
          
          user.credits += 1;
          await user.save();
          
          await logEvent(user.telegram_id, EVENTS.SONG_FAILED);
        }
      }
      
      return res.status(200).json({ code: 200, msg: 'error processed' });
    }
    
    if (callbackType === 'complete' && songs && songs.length > 0) {
      console.log('Processing', songs.length, 'tracks');
      
      for (const songData of songs) {
        const song = await Song.findOne({ provider_song_id: task_id });
        
        if (song) {
          const user = await User.findById(song.user_id);
          
          console.log('Song found, audio_url:', songData.audio_url);
          
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
        } else {
          console.log('Song not found in DB for task_id:', task_id);
        }
      }
    } else if (callbackType === 'first') {
      console.log('First track ready, waiting for complete...');
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

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export { app, sunoWebhook };
