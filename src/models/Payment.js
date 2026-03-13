import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'RUB'
  },
  credits_purchased: {
    type: Number,
    required: true
  },
  provider_payment_id: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  paid_at: Date,
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

paymentSchema.index({ user_id: 1 });
paymentSchema.index({ provider_payment_id: 1 }, { unique: true, sparse: true });

export default mongoose.model('Payment', paymentSchema);
