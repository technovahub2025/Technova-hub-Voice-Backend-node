import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['text', 'audio', 'image'],
      default: 'text'
    },
    sender: {
      type: String,
      enum: ['user', 'ai'],
      required: true
    },
    content: {
      text: String,
      audio: {
        url: String,
        duration: Number,
        format: String
      },
      image: {
        url: String,
        caption: String
      }
    },
    metadata: {
      platform: {
        type: String,
        enum: ['web', 'mobile', 'whatsapp', 'telegram']
      },
      language: String,
      aiModel: String,
      responseTime: Number, // ms
      tokens: Number
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    readAt: Date,
    deliveredAt: Date
  },
  {
    timestamps: true
  }
);

/* ======================
   Indexes
====================== */

messageSchema.index({ sessionId: 1, createdAt: -1 });
messageSchema.index({ user: 1 });
messageSchema.index({ sender: 1 });

/* ======================
   Instance Methods
====================== */

// Mark message as read
messageSchema.methods.markAsRead = async function () {
  this.status = 'read';
  this.readAt = new Date();
  await this.save();
};

// Mark message as delivered
messageSchema.methods.markAsDelivered = async function () {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  await this.save();
};

const Message = mongoose.model('Message', messageSchema);
export default Message;
