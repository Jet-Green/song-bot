import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegram_id: {
    type: Number,
    required: true,
    unique: true
  },
  username: String,
  first_name: String,
  last_name: String,
  credits: {
    type: Number,
    default: 0
  },
  bonus_credits: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ telegram_id: 1 }, { unique: true });

export default mongoose.model('User', userSchema);
