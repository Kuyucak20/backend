const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const { COLLECTIONS } = require('../config/collections');

const settingsSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.settings,
  }
);

settingsSchema.plugin(toJSON);

// Varsayılan ayarları oluştur (yoksa)
settingsSchema.statics.initDefaults = async function () {
  const defaults = [
    {
      key: 'wallet_address',
      value: 'TCjrwQ3jpxbZSbG9hJTfe1EhS9JAWym9ra',
      description: 'USDT TRC20 cuzdan adresi',
    },
    {
      key: 'usdt_contract',
      value: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      description: 'USDT TRC20 kontrat adresi',
    },
    {
      key: 'land_base_price',
      value: 249,
      description: 'Arsa baslangic fiyati (USDT)',
    },
    {
      key: 'daily_increase_rate',
      value: 0.02,
      description: 'Gunluk fiyat artis orani (%2)',
    },
  ];

  for (const item of defaults) {
    await this.findOneAndUpdate(
      { key: item.key },
      { $setOnInsert: item },
      { upsert: true, new: true }
    );
  }
};

// Tek bir ayarı getir
settingsSchema.statics.getSetting = async function (key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : null;
};

// Tek bir ayarı güncelle
settingsSchema.statics.setSetting = async function (key, value) {
  return this.findOneAndUpdate(
    { key },
    { value },
    { new: true, upsert: true }
  );
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
