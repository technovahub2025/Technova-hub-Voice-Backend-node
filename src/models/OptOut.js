import mongoose from 'mongoose';

const optOutSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  source: {
    type: String,
    enum: ['broadcast_keypress', 'manual', 'dnd_registry', 'api'],
    required: true
  },
  optedOutAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    // Opt-out can be temporary (e.g., 6 months)
    default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
  },
  metadata: {
    broadcast: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Broadcast'
    },
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Index for automatic expiry
optOutSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods
optOutSchema.statics.isOptedOut = async function(phone) {
  const exists = await this.exists({
    phone,
    expiresAt: { $gt: new Date() }
  });
  return !!exists;
};

optOutSchema.statics.addOptOut = async function(phone, source, metadata = {}) {
  return await this.findOneAndUpdate(
    { phone },
    {
      phone,
      source,
      optedOutAt: new Date(),
      metadata
    },
    { upsert: true, new: true }
  );
};

export default mongoose.model('OptOut', optOutSchema);
