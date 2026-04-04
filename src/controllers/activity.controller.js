const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { Activity } = require('../models');

// Kullanici sayfa girisini kaydet (heartbeat)
const trackActivity = catchAsync(async (req, res) => {
  const { page, pageLabel } = req.body;
  const user = req.user;

  if (!page) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: 'page alani gerekli' });
  }

  // Kullanicinin bu sayfadaki mevcut kaydini guncelle veya yeni olustur
  await Activity.findOneAndUpdate(
    { userId: user.id, action: 'enter' },
    {
      userId: user.id,
      username: user.username,
      page,
      pageLabel: pageLabel || page,
      action: 'enter',
      lastSeen: new Date(),
    },
    { upsert: true, new: true }
  );

  res.send({ ok: true });
});

// Kullanici sayfadan ayrildi
const trackLeave = catchAsync(async (req, res) => {
  const user = req.user;

  // Enter kaydini leave olarak guncelle
  const existing = await Activity.findOne({ userId: user.id, action: 'enter' });
  if (existing) {
    existing.action = 'leave';
    existing.lastSeen = new Date();
    await existing.save();
  }

  res.send({ ok: true });
});

// Admin: Aktif kullanicilari getir (son 5 dk icinde enter yapanlar)
const getActiveUsers = catchAsync(async (req, res) => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const activeUsers = await Activity.find({
    action: 'enter',
    lastSeen: { $gte: fiveMinAgo },
  }).sort({ lastSeen: -1 });

  res.send(activeUsers);
});

// Admin: Tum aktivite loglarini getir (son 24 saat)
const getActivityLogs = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;

  const logs = await Activity.find({})
    .sort({ createdAt: -1 })
    .limit(limit);

  res.send(logs);
});

// Admin: Ozet istatistikler
const getActivityStats = catchAsync(async (req, res) => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const activeNow = await Activity.countDocuments({
    action: 'enter',
    lastSeen: { $gte: fiveMinAgo },
  });

  // Son 1 saat icinde farkli kullanici sayisi
  const lastHour = await Activity.distinct('userId', {
    lastSeen: { $gte: oneHourAgo },
  });

  // Son 24 saat icinde farkli kullanici sayisi
  const lastDay = await Activity.distinct('userId', {
    lastSeen: { $gte: oneDayAgo },
  });

  res.send({
    activeNow,
    lastHourUnique: lastHour.length,
    lastDayUnique: lastDay.length,
  });
});

module.exports = {
  trackActivity,
  trackLeave,
  getActiveUsers,
  getActivityLogs,
  getActivityStats,
};
