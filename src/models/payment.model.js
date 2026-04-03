const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { COLLECTIONS } = require('../config/collections');

const paymentSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    uniqueAmount: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
      default: null,
    },
    fromWallet: {
      type: String,
      default: null,
    },
    toWallet: {
      type: String,
      default: 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt',
    },
    status: {
      type: String,
      enum: ['Beklemede', 'Onaylandı', 'Reddedildi', 'Suresi Doldu'],
      default: 'Beklemede',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    type: {
      type: String,
      enum: ['deposit', 'land_purchase', 'referral_bonus'],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.payments,
  }
);

paymentSchema.plugin(toJSON);
paymentSchema.plugin(paginate);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
