const axios = require('axios');
const config = require('../config');
const Song = require('../models/Song');

const sunoApi = axios.create({
  baseURL: config.suno.apiUrl,
  headers: {
    'Authorization': `Bearer ${config.suno.apiKey}`,
    'Content-Type': 'application/json'
  }
});

const generateMusic = async (songId, prompt, isInstrumental = false) => {
  try {
    const response = await sunoApi.post('/api/v1/generate', {
      prompt: prompt,
      customMode: false,
      instrumental: isInstrumental,
      model: 'V4_5',
      callBackUrl: config.suno.callbackUrl
    });

    if (response.data.code === 200) {
      const taskId = response.data.data.taskId;
      
      await Song.findByIdAndUpdate(songId, {
        provider: 'suno',
        provider_song_id: taskId,
        status: 'processing'
      });
      
      return { success: true, taskId };
    }
    
    return { success: false, error: response.data.msg };
  } catch (error) {
    console.error('Suno API error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

const getMusicDetails = async (taskId) => {
  try {
    const response = await sunoApi.get(`/api/v1/generate/redirect/${taskId}`);
    return response.data;
  } catch (error) {
    console.error('Get music details error:', error.response?.data || error.message);
    return null;
  }
};

module.exports = {
  generateMusic,
  getMusicDetails
};
