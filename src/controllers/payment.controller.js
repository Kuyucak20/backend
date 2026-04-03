const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { paymentService, userService, tronService } = require('../services');

// Kullanıcı ödeme başlatır - benzersiz tutar üretilir
const initiatePayment = catchAsync(async (req, res) => {
  const { amount } = req.body;
  const user = req.user;

  if (!amount || amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Gecerli bir tutar girin');
  }

  // Bu kullanıcının zaten bekleyen bir ödemesi var mı?
  const { Payment } = require('../models');
  const existingPending = await Payment.findOne({
    userId: user.id,
    status: 'Beklemede',
    type: 'deposit',
  });

  if (existingPending) {
    // Mevcut bekleyen ödemeyi döndür
    return res.send({
      payment: existingPending,
      walletAddress: 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt',
      message: 'Mevcut bekleyen odemeniz var. Asagidaki tutari gonderiniz.',
    });
  }

  // Benzersiz tutar üret
  const uniqueAmount = await tronService.generateUniqueAmount(amount);

  const payment = await paymentService.createPayment({
    userId: user.id,
    username: user.username,
    amount: parseFloat(amount),
    uniqueAmount,
    txHash: null,
    fromWallet: null,
    toWallet: 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt',
    status: 'Beklemede',
    type: 'deposit',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 dakika süre
  });

  res.status(httpStatus.CREATED).send({
    payment,
    walletAddress: 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt',
    message: `Lutfen tam olarak ${uniqueAmount} USDT gonderiniz. Odeme otomatik algilanacaktir.`,
  });
});

// Ödeme durumunu kontrol et
const checkPaymentStatus = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await paymentService.getPaymentById(paymentId);

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Odeme bulunamadi');
  }

  res.send({ status: payment.status, payment });
});

// Bekleyen ödemeyi iptal et
const cancelPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await paymentService.getPaymentById(paymentId);

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Odeme bulunamadi');
  }
  if (payment.userId.toString() !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bu odeme size ait degil');
  }
  if (payment.status !== 'Beklemede') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bu odeme iptal edilemez');
  }

  await paymentService.updatePaymentById(paymentId, { status: 'Reddedildi' });
  res.send({ message: 'Odeme iptal edildi' });
});

// Eski: Kullanıcı TxHash ile ödeme gönderir (geriye uyumluluk)
const createDeposit = catchAsync(async (req, res) => {
  const { txHash, fromWallet, amount } = req.body;
  const user = req.user;

  const uniqueAmount = await tronService.generateUniqueAmount(amount);

  const payment = await paymentService.createPayment({
    userId: user.id,
    username: user.username,
    amount,
    uniqueAmount,
    txHash,
    fromWallet,
    toWallet: 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt',
    status: 'Beklemede',
    type: 'deposit',
  });

  res.status(httpStatus.CREATED).send(payment);
});

const getMyPayments = catchAsync(async (req, res) => {
  const user = req.user;
  const { page, limit } = req.query;
  const result = await paymentService.getPaymentsByUserId(
    user.id,
    page ? parseInt(page, 10) : 1,
    limit ? parseInt(limit, 10) : 20
  );
  res.send(result);
});

const getPendingPayments = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await paymentService.getPendingPayments(
    page ? parseInt(page, 10) : 1,
    limit ? parseInt(limit, 10) : 20
  );
  res.send(result);
});

const confirmPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await paymentService.getPaymentById(paymentId);

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  if (payment.status !== 'Beklemede') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment is not pending');
  }

  const user = await userService.getUserById(payment.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const newBalance = (user.balance || 0) + payment.amount;
  await userService.updateUserById(payment.userId, { balance: newBalance });
  const updatedPayment = await paymentService.updatePaymentById(paymentId, { status: 'Onaylandı' });

  res.send({ message: 'Payment confirmed', payment: updatedPayment, newBalance });
});

const rejectPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await paymentService.getPaymentById(paymentId);

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  if (payment.status !== 'Beklemede') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment is not pending');
  }

  const updatedPayment = await paymentService.updatePaymentById(paymentId, { status: 'Reddedildi' });
  res.send({ message: 'Payment rejected', payment: updatedPayment });
});

module.exports = {
  initiatePayment,
  checkPaymentStatus,
  cancelPayment,
  createDeposit,
  getMyPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,
};
