import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event_name: {
    type: String,
    required: true
  },
  credits: {
    type: Number,
    default: 0
  },
  event_time: {
    type: Date,
    default: Date.now
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

eventSchema.index({ user_id: 1 });
eventSchema.index({ event_time: -1 });
eventSchema.index({ event_name: 1 });

export default mongoose.model('Event', eventSchema);
