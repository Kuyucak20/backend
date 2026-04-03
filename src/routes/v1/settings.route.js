const express = require('express');
const auth = require('../../middlewares/auth');
const settingsController = require('../../controllers/settings.controller');

const router = express.Router();

// Public endpoint - frontend cüzdan adresini buradan çeker
router.get('/wallet', settingsController.getWalletAddress);

// Admin endpoints
router.get('/', auth('manageUsers'), settingsController.getAllSettings);
router.get('/:key', auth('manageUsers'), settingsController.getSetting);
router.put('/:key', auth('manageUsers'), settingsController.updateSetting);

module.exports = router;
