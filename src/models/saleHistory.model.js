const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const saleHistorySchema = mongoose.Schema(
  {
    landId: { type: String, required: true },
    island: { type: String, default: null },
    nftTokenId: { type: Number, default: null },
    sellerName: { type: String, required: true },
    buyerName: { type: String, required: true },
    basePrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    profit: { type: Number, required: true },
    profitPercent: { type: Number, required: true },
    soldAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

saleHistorySchema.plugin(toJSON);
saleHistorySchema.plugin(paginate);

const SaleHistory = mongoose.model('SaleHistory', saleHistorySchema);
module.exports = SaleHistory;
