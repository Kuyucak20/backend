const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const { COLLECTIONS } = require('../config/collections');

const withdrawalSchema = mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    amount: { type: Number, required: true },
    toWallet: { type: String, required: true },
    walletType: { type: String, enum: ['USDT_TRC20', 'BNB'], default: 'USDT_TRC20' },
    status: {
      type: String,
      enum: ['Beklemede', 'Onaylandı', 'Reddedildi'],
      default: 'Beklemede',
    },
    adminNote: { type: String, default: '' },
    txHash: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.withdrawals,
  }
);

withdrawalSchema.plugin(toJSON);

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
module.exports = Withdrawal;
