const { Settings } = require('../models');
const logger = require('../config/logger');

const initDefaults = async () => {
  try {
    await Settings.initDefaults();
    logger.info('Settings initialized');
  } catch (error) {
    logger.error(`Settings init error: ${error.message}`);
  }
};

const getAllSettings = async () => {
  return Settings.find({});
};

const getSetting = async (key) => {
  return Settings.getSetting(key);
};

const setSetting = async (key, value) => {
  return Settings.setSetting(key, value);
};

const getWalletAddress = async () => {
  const addr = await Settings.getSetting('wallet_address');
  return addr || 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt'; // fallback
};

const getUsdtContract = async () => {
  const addr = await Settings.getSetting('usdt_contract');
  return addr || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // fallback
};

module.exports = {
  initDefaults,
  getAllSettings,
  getSetting,
  setSetting,
  getWalletAddress,
  getUsdtContract,
};
