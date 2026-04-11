const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { COLLECTIONS } = require('../config/collections');

const landSchema = mongoose.Schema(
  {
    landId: {
      type: String,
      default: null,
    },
    position: {
      type: String,
      default: null,
    },
    owner: {
      type: String,
      default: 'GelecekArsa',
    },
    ownerId: {
      type: String,
      default: null,
    },
    basePrice: {
      type: Number,
      default: 249,
    },
    currentPrice: {
      type: Number,
      default: 249,
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    state: {
      type: String,
      enum: ['Satılık', 'Satıldı', 'Rezerve', 'Sale', 'Sold', 'Reserved'],
      default: 'Satılık',
    },
    island: {
      type: String,
      default: null,
    },
    row: {
      type: Number,
      default: 0,
    },
    col: {
      type: Number,
      default: 0,
    },
    batch: {
      type: Number,
      default: 1,
    },
    sellLockUntil: {
      type: Date,
      default: null,
    },
    nftTokenId: {
      type: Number,
      default: null,
    },
    nftTxHash: {
      type: String,
      default: null,
    },
    listedForSale: {
      type: Boolean,
      default: false,
    },
    salePrice: {
      type: Number,
      default: null,
    },
    listedAt: {
      type: Date,
      default: null,
    },
    isReferralReward: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.lands,
  }
);

landSchema.plugin(toJSON);
landSchema.plugin(paginate);

const Land = mongoose.model('Land', landSchema);

module.exports = Land;
