const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { settingsService } = require('../services');

// Tüm ayarları getir
const getAllSettings = catchAsync(async (req, res) => {
  const settings = await settingsService.getAllSettings();
  res.send(settings);
});

// Tek ayar getir
const getSetting = catchAsync(async (req, res) => {
  const { key } = req.params;
  const value = await settingsService.getSetting(key);
  res.send({ key, value });
});

// Ayar güncelle
const updateSetting = catchAsync(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const setting = await settingsService.setSetting(key, value);
  res.send(setting);
});

// Public: Sadece cüzdan adresini döndür (auth gerektirmez)
const getWalletAddress = catchAsync(async (req, res) => {
  const walletAddress = await settingsService.getWalletAddress();
  res.send({ walletAddress });
});

module.exports = {
  getAllSettings,
  getSetting,
  updateSetting,
  getWalletAddress,
};
