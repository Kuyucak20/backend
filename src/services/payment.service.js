const httpStatus = require('http-status');
const { Payment } = require('../models');
const ApiError = require('../utils/ApiError');

const createPayment = async (paymentBody) => {
  return Payment.create(paymentBody);
};

const getPaymentById = async (id) => {
  return Payment.findById(id);
};

const getPaymentsByUserId = async (userId, page, limit) => {
  const options = {
    page: page || 1,
    limit: limit || 20,
    sortBy: 'createdAt:desc',
  };
  return Payment.paginate({ userId }, options);
};

const getPendingPayments = async (page, limit) => {
  const options = {
    page: page || 1,
    limit: limit || 20,
    sortBy: 'createdAt:desc',
  };
  return Payment.paginate({ status: 'Beklemede' }, options);
};

const updatePaymentById = async (paymentId, updateBody) => {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  Object.assign(payment, updateBody);
  await payment.save();
  return payment;
};

module.exports = {
  createPayment,
  getPaymentById,
  getPaymentsByUserId,
  getPendingPayments,
  updatePaymentById,
};
