const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createDeposit = {
  body: Joi.object().keys({
    txHash: Joi.string().required(),
    fromWallet: Joi.string().required(),
    amount: Joi.number().required().positive(),
  }),
};

const getMyPayments = {
  query: Joi.object().keys({
    page: Joi.number().integer(),
    limit: Joi.number().integer(),
  }),
};

const getPendingPayments = {
  query: Joi.object().keys({
    page: Joi.number().integer(),
    limit: Joi.number().integer(),
  }),
};

const confirmPayment = {
  params: Joi.object().keys({
    paymentId: Joi.string().required().custom(objectId),
  }),
};

const rejectPayment = {
  params: Joi.object().keys({
    paymentId: Joi.string().required().custom(objectId),
  }),
};

module.exports = {
  createDeposit,
  getMyPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,
};
