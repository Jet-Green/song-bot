import express from 'express';
import Song from '../models/Song.js';
import User from '../models/User.js';
import { logEvent, EVENTS } from '../services/creditService.js';
import { bot } from '../bot/index.js';
import config from '../config/index.js';
import { verifyResultSignature, processPayment } from '../services/robokassaService.js';

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
        
        let caption = `✅ Ваша песня готова!\n\n`;
        
        if (songData.title) {
          caption += `🎤 *${songData.title}*\n\n`;
        }
        
        caption += `🎵 ${song.prompt}\n\n`;
        
        if (songData.prompt && !songData.prompt.startsWith('[')) {
          caption += `📝 *Текст песни:*\n${songData.prompt}\n\n`;
        }
        
        caption += `🔊 Слушать: ${songData.audio_url}`;
        
        if (user) {
          if (songData.image_url) {
            await bot.telegram.sendPhoto(user.telegram_id, songData.image_url, { caption, parse_mode: 'Markdown' });
          } else {
            await bot.telegram.sendMessage(user.telegram_id, caption, { parse_mode: 'Markdown' });
          }
          
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
        
        let caption = `🎵 *Первая версия песни готова!*\n\n`;
        
        if (songData.title) {
          caption += `🎤 *${songData.title}*\n\n`;
        }
        
        caption += `🔊 Слушать: ${songData.audio_url}\n\n`;
        caption += `_🎶Музыка генерируется..._`;
        
        if (songData.image_url) {
          await bot.telegram.sendPhoto(user.telegram_id, songData.image_url, { caption, parse_mode: 'Markdown' });
        } else {
          await bot.telegram.sendMessage(user.telegram_id, caption, { parse_mode: 'Markdown' });
        }
      }
    } else if (callbackType === 'text') {
      console.log('Text generation complete, waiting for audio...');
      
      const song = await Song.findOne({ provider_song_id: task_id });
      if (!song) {
        return res.status(200).json({ code: 200, msg: 'song not found' });
      }
      
      const user = await User.findById(song.user_id);
      const songData = songs?.[0];
      
      if (user && songData?.prompt) {
        await Song.findByIdAndUpdate(song._id, {
          lyrics: songData.prompt
        });
        
        const previewText = songData.prompt.length > 500 
          ? songData.prompt.slice(0, 500) + '...'
          : songData.prompt;
        
        let message = `📝 *Текст песни готов!*\n\n`;
        
        if (songData.title) {
          message += `🎤 *${songData.title}*\n\n`;
        }
        
        message += `🎵 ${previewText}\n\n`;
        message += `_🎶 Музыка генерируется..._`;
        
        await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
      }
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

const robokassaResult = async (req, res) => {
  console.log('=== Robokassa Result Callback ===');
  console.log('Query:', req.query);
  console.log('Body:', req.body);

  try {
    const params = {
      ...req.query,
      ...req.body
    };

    const { OutSum, InvId, SignatureValue } = params;

    if (!OutSum || !SignatureValue) {
      console.error('Missing required params');
      return res.status(400).send('Missing required parameters');
    }

    if (!verifyResultSignature(params)) {
      console.error('Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    const success = await processPayment(params);
    
    if (success) {
      return res.status(200).send('OK');
    } else {
      return res.status(500).send('Payment processing failed');
    }
  } catch (error) {
    console.error('Robokassa webhook error:', error);
    return res.status(500).send('Internal error');
  }
};

const robokassaSuccess = async (req, res) => {
  console.log('=== Robokassa Success Redirect ===');
  const { InvId, OutSum } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Оплата</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
          .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .success { color: #4CAF50; font-size: 48px; }
          h1 { color: #333; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>Оплата успешна!</h1>
          <p>Проверьте ваш баланс в боте.</p>
          <p>Если кредиты не были начислены, обратитесь в поддержку.</p>
        </div>
      </body>
    </html>
  `);
};

const robokassaFail = async (req, res) => {
  console.log('=== Robokassa Fail Redirect ===');
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Оплата</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
          .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .error { color: #f44336; font-size: 48px; }
          h1 { color: #333; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">✗</div>
          <h1>Оплата не завершена</h1>
          <p>Попробуйте ещё раз или выберите другой способ оплаты.</p>
        </div>
      </body>
    </html>
  `);
};

app.post('/webhook/robokassa', robokassaResult);
app.get('/payment/success', robokassaSuccess);
app.get('/payment/fail', robokassaFail);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on port ${config.port}`);
});

export { app, sunoWebhook };
