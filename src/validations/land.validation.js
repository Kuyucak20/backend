const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createLand = {
  body: Joi.object().keys({
    landId: Joi.string().required(),
    owner: Joi.string(),
    ownerId: Joi.string().allow(null, ''),
    basePrice: Joi.number(),
    currentPrice: Joi.number(),
    purchaseDate: Joi.date().allow(null),
    state: Joi.string().valid('Satılık', 'Satıldı', 'Rezerve'),
    batch: Joi.number().integer(),
  }),
};

const getLand = {
  query: Joi.object().keys({
    batch: Joi.number().integer(),
    page: Joi.number().integer(),
    limit: Joi.number().integer(),
  }),
};

const empty = {};

const getPositionLand = {
  params: Joi.object().keys({
    id: Joi.string(),
  }),
};

const getAvailableLands = {
  query: Joi.object().keys({
    batch: Joi.number().integer(),
    page: Joi.number().integer(),
    limit: Joi.number().integer(),
  }),
};

const getLandValue = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const initializeLands = {};

module.exports = {
  createLand,
  getLand,
  getPositionLand,
  getAvailableLands,
  getLandValue,
  initializeLands,
  empty,
};
