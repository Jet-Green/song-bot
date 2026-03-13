const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  style: String,
  language: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'done', 'error'],
    default: 'pending'
  },
  lyrics: String,
  audio_url: String,
  provider: String,
  provider_song_id: String,
  duration_sec: Number,
  created_at: {
    type: Date,
    default: Date.now
  },
  finished_at: Date
});

songSchema.index({ user_id: 1 });
songSchema.index({ status: 1 });
songSchema.index({ created_at: -1 });

module.exports = mongoose.model('Song', songSchema);
