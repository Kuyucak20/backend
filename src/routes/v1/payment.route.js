const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const paymentValidation = require('../../validations/payment.validation');
const { paymentController } = require('../../controllers');

const router = express.Router();

// Yeni: Ödeme başlat (benzersiz tutar üretir)
router
  .route('/initiate')
  .post(auth('getUsers'), paymentController.initiatePayment);

// Ödeme durumu kontrol
router
  .route('/status/:paymentId')
  .get(auth('getUsers'), paymentController.checkPaymentStatus);

// Ödeme iptal
router
  .route('/cancel/:paymentId')
  .post(auth('getUsers'), paymentController.cancelPayment);

// Eski: TxHash ile deposit (geriye uyumluluk)
router
  .route('/deposit')
  .post(auth('getUsers'), validate(paymentValidation.createDeposit), paymentController.createDeposit);

router
  .route('/my-payments')
  .get(auth('getUsers'), paymentController.getMyPayments);

router
  .route('/pending')
  .get(auth('manageUsers'), paymentController.getPendingPayments);

router
  .route('/confirm/:paymentId')
  .post(auth('manageUsers'), paymentController.confirmPayment);

router
  .route('/reject/:paymentId')
  .post(auth('manageUsers'), paymentController.rejectPayment);

module.exports = router;
