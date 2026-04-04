const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const { COLLECTIONS } = require('../config/collections');

const activitySchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    page: {
      type: String,
      required: true,
    },
    pageLabel: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      enum: ['enter', 'leave'],
      default: 'enter',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.activities,
  }
);

activitySchema.plugin(toJSON);

// TTL index: 24 saat sonra otomatik sil (log temizligi)
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
