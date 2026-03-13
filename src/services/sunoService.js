import axios from 'axios';
import config from '../config/index.js';
import Song from '../models/Song.js';

const sunoApi = axios.create({
  baseURL: config.suno.apiUrl,
  headers: {
    'Authorization': `Bearer ${config.suno.apiKey}`,
    'Content-Type': 'application/json'
  }
});

export const generateMusic = async (songId, params) => {
  try {
    const {
      prompt,
      customMode = false,
      instrumental = false,
      model = 'V4',
      style = '',
      title = '',
      negativeTags = '',
      vocalGender = '',
      styleWeight = 0.5,
      weirdnessConstraint = 0.5,
      audioWeight = 0.5
    } = params;

    const requestBody = {
      prompt,
      customMode,
      instrumental,
      model,
      callBackUrl: config.suno.callbackUrl,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    };

    if (customMode) {
      requestBody.style = style || 'Pop';
      requestBody.title = title || 'Untitled';
      if (vocalGender) requestBody.vocalGender = vocalGender;
      if (negativeTags) requestBody.negativeTags = negativeTags;
    }

    console.log('Suno API request:', JSON.stringify(requestBody, null, 2));
    
    const response = await sunoApi.post('/api/v1/generate', requestBody);

    if (response.data.code === 200) {
      const taskId = response.data.data.taskId;
      
      await Song.findByIdAndUpdate(songId, {
        provider: 'suno',
        provider_song_id: taskId,
        status: 'processing',
        style: style || 'auto',
        title: title || '',
        instrumental: instrumental,
        language: instrumental ? 'instrumental' : 'auto'
      });
      
      return { success: true, taskId };
    }
    
    return { success: false, error: response.data.msg };
  } catch (error) {
    console.error('Suno API error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

export const getMusicDetails = async (taskId) => {
  try {
    const response = await sunoApi.get(`/api/v1/generate/record-info?taskId=${taskId}`);
    return response.data;
  } catch (error) {
    console.error('Get music details error:', error.response?.data || error.message);
    return null;
  }
};
