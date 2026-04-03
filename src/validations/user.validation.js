const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    surname: Joi.string().required(),
    username: Joi.string().required(),
    phone: Joi.string().required(),
    description: Joi.string(),
    avatar: Joi.string(),
    lands: Joi.array(),
    lastvisitdate: Joi.string(),
    registerdate: Joi.string(),
    ipaddress: Joi.string(),
    usdtWallet: Joi.string().optional().allow(''),
    role: Joi.string().required().valid('user', 'admin'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const buyLand = {
  body: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
    landId: Joi.string().required(),
  }),
};

const contact = {
  body: Joi.object().keys({
    likeit: Joi.boolean(),
    detail: Joi.string(),
  }),
};

const getUsername = {
  params: Joi.object().keys({
    username: Joi.string(),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required(),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      name: Joi.string(),
      surname: Joi.string(),
      password: Joi.string().custom(password),
      description: Joi.string(),
      avatar: Joi.string(),
      usdtWallet: Joi.string().allow(''),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const depositCrypto = {
  body: Joi.object().keys({
    txHash: Joi.string().required(),
    fromWallet: Joi.string().required(),
    amount: Joi.number().required().positive(),
  }),
};

const confirmDeposit = {
  params: Joi.object().keys({
    paymentId: Joi.string().required().custom(objectId),
  }),
};

const getPortfolio = {};

const addBalance = {
  body: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
    amount: Joi.number().required().positive(),
  }),
};

const getReferralInfo = {};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUsername,
  buyLand,
  contact,
  depositCrypto,
  confirmDeposit,
  getPortfolio,
  addBalance,
  getReferralInfo,
};
