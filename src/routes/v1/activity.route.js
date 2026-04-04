const express = require('express');
const auth = require('../../middlewares/auth');
const activityController = require('../../controllers/activity.controller');

const router = express.Router();

// Kullanici endpointleri (auth gerekli)
router.post('/track', auth(), activityController.trackActivity);
router.post('/leave', auth(), activityController.trackLeave);

// Admin endpointleri
router.get('/active', activityController.getActiveUsers);
router.get('/logs', activityController.getActivityLogs);
router.get('/stats', activityController.getActivityStats);

module.exports = router;
